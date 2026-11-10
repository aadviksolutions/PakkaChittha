package com.pakkachittha.app.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class GoogleAuthRequest(
    @SerializedName("idToken") val idToken: String? = null,
    @SerializedName("credential") val credential: String? = null
)

data class GoogleConfigResponse(
    @SerializedName("configured") val configured: Boolean = false,
    @SerializedName("clientId") val clientId: String? = null,
    @SerializedName("hasSecret") val hasSecret: Boolean = false
)

data class RegisterRequest(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("businessName") val businessName: String? = null,
    @SerializedName("phone") val phone: String? = null
)

data class AuthResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("sessionToken") val sessionToken: String? = null,
    @SerializedName("token") val token: String? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("business") val business: BusinessDto? = null,
    @SerializedName("error") val error: String? = null
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("platformRole") val platformRole: String = "USER",
    @SerializedName("preferredLanguage") val preferredLanguage: String? = "en"
)

data class BusinessDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("legalName") val legalName: String? = null,
    @SerializedName("tradeType") val tradeType: String? = null,
    @SerializedName("gstin") val gstin: String? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("state") val state: String? = null,
    @SerializedName("currency") val currency: String = "INR",
    @SerializedName("role") val role: String? = "BUSINESS_OWNER",
    @SerializedName("subscription") val subscription: SubscriptionDto? = null
)

data class SubscriptionDto(
    @SerializedName("plan") val plan: String = "FREE_TRIAL",
    @SerializedName("status") val status: String = "TRIALING",
    @SerializedName("trialDaysRemaining") val trialDaysRemaining: Int = 14,
    @SerializedName("isTrial") val isTrial: Boolean = true,
    @SerializedName("isExpired") val isExpired: Boolean = false,
    @SerializedName("displayText") val displayText: String? = null
)

data class CurrentSessionResponse(
    @SerializedName("user") val user: UserDto,
    @SerializedName("activeBusiness") val activeBusiness: BusinessDto? = null
)
