package com.lenden.app.ui.customers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lenden.app.data.remote.dto.CreateCustomerRequest
import com.lenden.app.data.remote.dto.CustomerDto
import com.lenden.app.data.remote.dto.GstBusinessDetailsDto
import com.lenden.app.data.repository.CustomerRepository
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CustomersUiState(
    val customers: List<CustomerDto> = emptyList(),
    val searchQuery: String = "",
    val onlyPendingUdhaar: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isCreatingCustomer: Boolean = false,
    val createSuccess: Boolean = false,
    val isLookingUpGst: Boolean = false,
    val gstLookupError: String? = null,
    val lastFetchedGstDetails: GstBusinessDetailsDto? = null
) {
    val totalOutstandingUdhaar: Double
        get() = customers.sumOf { it.totalOutstanding }
}

class CustomersViewModel(
    private val customerRepository: CustomerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CustomersUiState())
    val uiState: StateFlow<CustomersUiState> = _uiState.asStateFlow()

    init {
        loadCustomers()
    }

    fun loadCustomers(search: String? = null) {
        viewModelScope.launch {
            customerRepository.getCustomers(search).collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true)
                    }
                    is Resource.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            customers = resource.data ?: emptyList(),
                            errorMessage = null
                        )
                    }
                    is Resource.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            errorMessage = resource.message
                        )
                    }
                }
            }
        }
    }

    fun setSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        loadCustomers(query.ifBlank { null })
    }

    fun setFilterOnlyPending(onlyPending: Boolean) {
        _uiState.value = _uiState.value.copy(onlyPendingUdhaar = onlyPending)
    }

    fun createCustomer(
        name: String,
        mobile: String,
        gstin: String?,
        openingBalance: Double,
        onSuccess: () -> Unit
    ) {
        if (name.isBlank() || mobile.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Name and Mobile number are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCreatingCustomer = true, errorMessage = null)
            val request = CreateCustomerRequest(
                name = name.trim(),
                mobile = mobile.trim(),
                gstin = gstin?.trim()?.ifBlank { null },
                openingBalance = openingBalance
            )

            customerRepository.createCustomer(request).collect { res ->
                when (res) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isCreatingCustomer = true)
                    }
                    is Resource.Success -> {
                        _uiState.value = _uiState.value.copy(isCreatingCustomer = false, createSuccess = true)
                        loadCustomers()
                        onSuccess()
                    }
                    is Resource.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isCreatingCustomer = false,
                            errorMessage = res.message ?: "Failed to add customer"
                        )
                    }
                }
            }
        }
    }

    fun lookupGstin(gstin: String, onComplete: (GstBusinessDetailsDto?) -> Unit) {
        val clean = gstin.replace(Regex("[\\s\\-\\u200B\\u00A0]"), "").trim().uppercase()
        if (clean.length != 15) {
            _uiState.value = _uiState.value.copy(gstLookupError = "GSTIN must be 15 characters")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLookingUpGst = true, gstLookupError = null)
            customerRepository.lookupGstin(clean).collect { res ->
                when (res) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isLookingUpGst = true)
                    }
                    is Resource.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLookingUpGst = false,
                            lastFetchedGstDetails = res.data,
                            gstLookupError = null
                        )
                        onComplete(res.data)
                    }
                    is Resource.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isLookingUpGst = false,
                            gstLookupError = res.message ?: "Failed to fetch GST details"
                        )
                        onComplete(null)
                    }
                }
            }
        }
    }

    fun clearGstLookupState() {
        _uiState.value = _uiState.value.copy(isLookingUpGst = false, gstLookupError = null, lastFetchedGstDetails = null)
    }

    class Factory(private val customerRepository: CustomerRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(CustomersViewModel::class.java)) {
                return CustomersViewModel(customerRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
