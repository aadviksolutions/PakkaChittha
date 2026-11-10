package com.pakkachittha.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.data.repository.FreeKhataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class FreeKhataUiState {
    object Loading : FreeKhataUiState()
    data class Success(val data: PersonalKhataDataDto) : FreeKhataUiState()
    data class Error(val message: String) : FreeKhataUiState()
}

class FreeKhataViewModel(private val repository: FreeKhataRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<FreeKhataUiState>(FreeKhataUiState.Loading)
    val uiState: StateFlow<FreeKhataUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = FreeKhataUiState.Loading
            val dashRes = repository.getDashboard()

            dashRes.fold(
                onSuccess = { personalKhataData ->
                    _uiState.value = FreeKhataUiState.Success(personalKhataData)
                },
                onFailure = { err ->
                    _uiState.value = FreeKhataUiState.Error(err.message ?: "Failed to load Personal Khata")
                }
            )
        }
    }

    fun addTransaction(req: CreateKhataTransactionRequest, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.createTransaction(req).fold(
                onSuccess = {
                    loadData()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }

    fun recordRepayment(req: RecordKhataRepaymentRequest, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.recordRepayment(req).fold(
                onSuccess = {
                    loadData()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }
}
