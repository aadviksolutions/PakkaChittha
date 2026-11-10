package com.pakkachittha.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.local.AppPreferences
import com.pakkachittha.app.data.model.OfficialPlanDto
import com.pakkachittha.app.data.model.PaymentDetailsDto
import com.pakkachittha.app.data.model.ValidateDiscountResponse
import com.pakkachittha.app.data.repository.SubscriptionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SubscriptionUiState(
    val loading: Boolean = false,
    val plans: Map<String, OfficialPlanDto> = emptyMap(),
    val selectedInterval: String = "YEARLY", // "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"
    val discountCode: String = "",
    val appliedDiscount: ValidateDiscountResponse? = null,
    val discountError: String? = null,
    val validatingDiscount: Boolean = false,
    val error: String? = null,
    // Payment details in Settings
    val paymentDetails: PaymentDetailsDto? = null,
    val savingPaymentDetails: Boolean = false,
    val paymentDetailsSuccess: Boolean = false
)

class SubscriptionViewModel(
    private val subscriptionRepo: SubscriptionRepository,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(SubscriptionUiState())
    val uiState: StateFlow<SubscriptionUiState> = _uiState.asStateFlow()

    val preferredLanguage = appPreferences.preferredLanguage

    init {
        loadPlans()
        loadPaymentDetails()
    }

    fun loadPlans() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            val result = subscriptionRepo.getPlans()
            result.onSuccess { plansMap ->
                _uiState.value = _uiState.value.copy(loading = false, plans = plansMap)
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(loading = false, error = err.message ?: "Failed to load plans")
            }
        }
    }

    fun setInterval(interval: String) {
        _uiState.value = _uiState.value.copy(selectedInterval = interval)
    }

    fun setDiscountCode(code: String) {
        _uiState.value = _uiState.value.copy(discountCode = code.uppercase(), discountError = null)
    }

    fun applyDiscount(planKey: String = "GROWTH") {
        val code = _uiState.value.discountCode.trim()
        if (code.isBlank()) {
            _uiState.value = _uiState.value.copy(discountError = "Please enter a discount code")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(validatingDiscount = true, discountError = null)
            val result = subscriptionRepo.validateDiscount(
                code = code,
                planKey = planKey,
                interval = _uiState.value.selectedInterval
            )
            result.onSuccess { resp ->
                _uiState.value = _uiState.value.copy(
                    validatingDiscount = false,
                    appliedDiscount = resp,
                    discountError = null
                )
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    validatingDiscount = false,
                    appliedDiscount = null,
                    discountError = err.message ?: "Invalid discount code"
                )
            }
        }
    }

    fun removeDiscount() {
        _uiState.value = _uiState.value.copy(
            appliedDiscount = null,
            discountCode = "",
            discountError = null
        )
    }

    fun loadPaymentDetails() {
        viewModelScope.launch {
            val result = subscriptionRepo.getPaymentDetails()
            result.onSuccess { details ->
                _uiState.value = _uiState.value.copy(paymentDetails = details)
            }
        }
    }

    fun savePaymentDetails(upiId: String?, beneficiaryName: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(savingPaymentDetails = true)
            val result = subscriptionRepo.savePaymentDetails(upiId, beneficiaryName)
            result.onSuccess {
                _uiState.value = _uiState.value.copy(
                    savingPaymentDetails = false,
                    paymentDetails = PaymentDetailsDto(
                        upiId = upiId,
                        upiBeneficiaryName = beneficiaryName,
                        upiQrImageUrl = _uiState.value.paymentDetails?.upiQrImageUrl
                    )
                )
                onComplete(true)
            }.onFailure {
                _uiState.value = _uiState.value.copy(savingPaymentDetails = false)
                onComplete(false)
            }
        }
    }

    fun changeLanguage(lang: String) {
        viewModelScope.launch {
            appPreferences.saveLanguage(lang)
        }
    }
}
