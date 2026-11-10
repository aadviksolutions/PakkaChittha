package com.pakkachittha.app.data.model

import com.google.gson.annotations.SerializedName

data class CustomerListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("customers") val customers: List<CustomerDto> = emptyList(),
    @SerializedName("error") val error: String? = null
)

data class CustomerDetailResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("customer") val customer: CustomerDto? = null,
    @SerializedName("error") val error: String? = null
)

data class CustomerDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("mobile") val mobile: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("gstin") val gstin: String? = null,
    @SerializedName("billingAddress") val billingAddress: String? = null,
    @SerializedName("outstandingBalance") val outstandingBalance: Double = 0.0,
    @SerializedName("totalInvoiced") val totalInvoiced: Double = 0.0,
    @SerializedName("invoicesCount") val invoicesCount: Int = 0,
    @SerializedName("invoices") val invoices: List<InvoiceDto> = emptyList()
)

data class CreateCustomerRequest(
    @SerializedName("name") val name: String,
    @SerializedName("mobile") val mobile: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("gstin") val gstin: String? = null,
    @SerializedName("billingAddress") val billingAddress: String? = null
)
