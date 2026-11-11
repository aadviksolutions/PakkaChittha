package com.pakkachittha.app.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.data.repository.FreeKhataRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

sealed class FreeKhataUiState {
    object Loading : FreeKhataUiState()
    data class Success(val data: PersonalKhataDataDto) : FreeKhataUiState()
    data class Error(val message: String) : FreeKhataUiState()
}

sealed class KhataReportUiState {
    object Idle : KhataReportUiState()
    object Loading : KhataReportUiState()
    data class Success(
        val report: KhataReportDto,
        val shareSubject: String,
        val shareText: String
    ) : KhataReportUiState()
    data class Error(val message: String) : KhataReportUiState()
}

sealed class KhataPersonReportUiState {
    object Idle : KhataPersonReportUiState()
    object Loading : KhataPersonReportUiState()
    data class Success(
        val report: KhataPersonReportDto,
        val shareSubject: String,
        val shareText: String
    ) : KhataPersonReportUiState()
    data class Error(val message: String) : KhataPersonReportUiState()
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

    private val _reportState = MutableStateFlow<KhataReportUiState>(KhataReportUiState.Idle)
    val reportState: StateFlow<KhataReportUiState> = _reportState.asStateFlow()

    private val _personReportState = MutableStateFlow<KhataPersonReportUiState>(KhataPersonReportUiState.Idle)
    val personReportState: StateFlow<KhataPersonReportUiState> = _personReportState.asStateFlow()

    fun loadReport(
        dateRange: String = "ALL",
        startDate: String? = null,
        endDate: String? = null,
        search: String? = null,
        direction: String = "ALL",
        paymentMode: String = "ALL",
        accountStatus: String = "OUTSTANDING"
    ) {
        viewModelScope.launch {
            _reportState.value = KhataReportUiState.Loading
            repository.getConsolidatedReport(
                dateRange = dateRange,
                startDate = startDate,
                endDate = endDate,
                search = search,
                direction = direction,
                paymentMode = paymentMode,
                accountStatus = accountStatus
            ).fold(
                onSuccess = { body ->
                    _reportState.value = KhataReportUiState.Success(
                        report = body.report!!,
                        shareSubject = body.share?.subject ?: "Personal Khata Report",
                        shareText = body.share?.text ?: ""
                    )
                },
                onFailure = { e ->
                    _reportState.value = KhataReportUiState.Error(e.message ?: "Failed to load report")
                }
            )
        }
    }

    fun loadPersonReport(
        contactId: String,
        dateRange: String = "ALL",
        startDate: String? = null,
        endDate: String? = null,
        paymentMode: String = "ALL"
    ) {
        viewModelScope.launch {
            _personReportState.value = KhataPersonReportUiState.Loading
            repository.getPersonReport(
                contactId = contactId,
                dateRange = dateRange,
                startDate = startDate,
                endDate = endDate,
                paymentMode = paymentMode
            ).fold(
                onSuccess = { body ->
                    _personReportState.value = KhataPersonReportUiState.Success(
                        report = body.report!!,
                        shareSubject = body.share?.subject ?: "Party Khata Statement",
                        shareText = body.share?.text ?: ""
                    )
                },
                onFailure = { e ->
                    _personReportState.value = KhataPersonReportUiState.Error(e.message ?: "Failed to load party statement")
                }
            )
        }
    }

    fun clearPersonReport() {
        _personReportState.value = KhataPersonReportUiState.Idle
    }

    fun exportReportFile(
        context: Context,
        format: String,
        contactId: String? = null,
        dateRange: String = "ALL",
        startDate: String? = null,
        endDate: String? = null,
        search: String? = null,
        direction: String = "ALL",
        paymentMode: String = "ALL",
        accountStatus: String = "OUTSTANDING",
        onResult: (Result<File>) -> Unit
    ) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                repository.downloadReportFile(
                    context = context,
                    format = format,
                    contactId = contactId,
                    dateRange = dateRange,
                    startDate = startDate,
                    endDate = endDate,
                    search = search,
                    direction = direction,
                    paymentMode = paymentMode,
                    accountStatus = accountStatus
                )
            }
            onResult(result)
        }
    }
}
