package com.lenden.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class CustomersResponse(
    val success: Boolean = false,
    val customers: List<CustomerDto> = emptyList(),
    val error: String? = null
)

@Serializable
data class CustomerDto(
    val id: String,
    val name: String,
    val mobile: String,
    val email: String? = null,
    val billingAddress: String? = null,
    val gstin: String? = null,
    val openingBalance: Double = 0.0,
    val totalOutstanding: Double = 0.0,
    val invoiceCount: Int = 0
)

@Serializable
data class CreateCustomerRequest(
    val name: String,
    val mobile: String,
    val email: String? = null,
    val gstin: String? = null,
    val billingAddress: String? = null,
    val openingBalance: Double = 0.0,
    val notes: String? = null
)

@Serializable
data class GstLookupResponse(
    val success: Boolean = false,
    val data: GstBusinessDetailsDto? = null,
    val error: String? = null,
    val code: String? = null
)

@Serializable
data class GstBusinessDetailsDto(
    val gstin: String,
    val legalName: String = "",
    val tradeName: String = "",
    val status: String = "ACTIVE",
    val registrationDate: String? = null,
    val taxpayerType: String? = null,
    val constitution: String? = null,
    val address: String = "",
    val city: String? = null,
    val state: String = "",
    val stateCode: String = "",
    val pincode: String = "",
    val source: String = "",
    val fetchedAt: String = ""
)

