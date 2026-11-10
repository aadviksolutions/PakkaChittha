package com.pakkachittha.app.data.model

import com.google.gson.annotations.SerializedName

data class PaymentDetailsDto(
    @SerializedName("upiId") val upiId: String? = null,
    @SerializedName("upiBeneficiaryName") val upiBeneficiaryName: String? = null,
    @SerializedName("upiQrImageUrl") val upiQrImageUrl: String? = null
)

data class PaymentDetailsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("paymentDetails") val paymentDetails: PaymentDetailsDto? = null
)

data class SavePaymentDetailsRequest(
    @SerializedName("upiId") val upiId: String?,
    @SerializedName("upiBeneficiaryName") val upiBeneficiaryName: String?
)

data class PlanPricingTierDto(
    @SerializedName("durationMonths") val durationMonths: Int,
    @SerializedName("totalPrice") val totalPrice: Double,
    @SerializedName("monthlyEquivalent") val monthlyEquivalent: Double,
    @SerializedName("savingsAmount") val savingsAmount: Double,
    @SerializedName("savingsPercent") val savingsPercent: Int
)

data class OfficialPlanDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("tagline") val tagline: String,
    @SerializedName("badge") val badge: String? = null,
    @SerializedName("features") val features: List<String> = emptyList(),
    @SerializedName("pricing") val pricing: Map<String, PlanPricingTierDto> = emptyMap()
)

data class SubscriptionPlansResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("plans") val plans: Map<String, OfficialPlanDto> = emptyMap()
)

data class ValidateDiscountRequest(
    @SerializedName("code") val code: String,
    @SerializedName("planKey") val planKey: String,
    @SerializedName("interval") val interval: String
)

data class ValidateDiscountResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("valid") val valid: Boolean,
    @SerializedName("code") val code: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("originalAmount") val originalAmount: Double = 0.0,
    @SerializedName("discountAmount") val discountAmount: Double = 0.0,
    @SerializedName("finalAmount") val finalAmount: Double = 0.0,
    @SerializedName("error") val error: String? = null
)
