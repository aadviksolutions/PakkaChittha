package com.pakkachittha.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.data.repository.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class CustomerListUiState {
    object Loading : CustomerListUiState()
    data class Success(val customers: List<CustomerDto>) : CustomerListUiState()
    data class Error(val message: String) : CustomerListUiState()
}

class CustomerViewModel(private val repository: CustomerRepository) : ViewModel() {

    private val _listState = MutableStateFlow<CustomerListUiState>(CustomerListUiState.Loading)
    val listState: StateFlow<CustomerListUiState> = _listState.asStateFlow()

    private val _selectedCustomer = MutableStateFlow<CustomerDto?>(null)
    val selectedCustomer: StateFlow<CustomerDto?> = _selectedCustomer.asStateFlow()

    init {
        loadCustomers()
    }

    fun loadCustomers(search: String? = null) {
        viewModelScope.launch {
            _listState.value = CustomerListUiState.Loading
            repository.getCustomers(search).fold(
                onSuccess = { list ->
                    _listState.value = CustomerListUiState.Success(list)
                },
                onFailure = { err ->
                    _listState.value = CustomerListUiState.Error(err.message ?: "Failed to load customers")
                }
            )
        }
    }

    fun loadCustomerDetail(id: String) {
        viewModelScope.launch {
            repository.getCustomerDetail(id).fold(
                onSuccess = { c -> _selectedCustomer.value = c },
                onFailure = { _selectedCustomer.value = null }
            )
        }
    }

    fun createCustomer(req: CreateCustomerRequest, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.createCustomer(req).fold(
                onSuccess = {
                    loadCustomers()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }
}
