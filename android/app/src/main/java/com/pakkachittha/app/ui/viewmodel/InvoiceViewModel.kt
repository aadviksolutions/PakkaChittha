package com.pakkachittha.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.data.repository.InvoiceRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class InvoiceListUiState {
    object Loading : InvoiceListUiState()
    data class Success(val invoices: List<InvoiceDto>) : InvoiceListUiState()
    data class Error(val message: String) : InvoiceListUiState()
}

class InvoiceViewModel(private val repository: InvoiceRepository) : ViewModel() {

    private val _listState = MutableStateFlow<InvoiceListUiState>(InvoiceListUiState.Loading)
    val listState: StateFlow<InvoiceListUiState> = _listState.asStateFlow()

    private val _selectedInvoice = MutableStateFlow<InvoiceDto?>(null)
    val selectedInvoice: StateFlow<InvoiceDto?> = _selectedInvoice.asStateFlow()

    private val _nextNumber = MutableStateFlow("INV-001")
    val nextNumber: StateFlow<String> = _nextNumber.asStateFlow()

    init {
        loadInvoices()
    }

    fun loadInvoices(search: String? = null, status: String? = null) {
        viewModelScope.launch {
            _listState.value = InvoiceListUiState.Loading
            repository.getInvoices(search, status).fold(
                onSuccess = { list ->
                    _listState.value = InvoiceListUiState.Success(list)
                },
                onFailure = { err ->
                    _listState.value = InvoiceListUiState.Error(err.message ?: "Failed to load invoices")
                }
            )
        }
    }

    fun loadInvoiceDetail(id: String) {
        viewModelScope.launch {
            repository.getInvoiceDetail(id).fold(
                onSuccess = { inv -> _selectedInvoice.value = inv },
                onFailure = { _selectedInvoice.value = null }
            )
        }
    }

    fun loadNextInvoiceNumber() {
        viewModelScope.launch {
            repository.getNextInvoiceNumber().fold(
                onSuccess = { num -> _nextNumber.value = num },
                onFailure = { _nextNumber.value = "INV-001" }
            )
        }
    }

    fun createInvoice(req: CreateInvoiceRequest, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.createInvoice(req).fold(
                onSuccess = {
                    loadInvoices()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }

    fun recordPayment(invoiceId: String, amount: Double, method: String, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.recordPayment(invoiceId, RecordPaymentRequest(amount, method)).fold(
                onSuccess = {
                    loadInvoiceDetail(invoiceId)
                    loadInvoices()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }
}
