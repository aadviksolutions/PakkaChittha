package com.pakkachittha.app.data.model

import com.google.gson.annotations.SerializedName

data class FreeKhataDashboardResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: PersonalKhataDataDto? = null,
    @SerializedName("error") val error: String? = null
)

data class PersonalKhataDataDto(
    @SerializedName("kpis") val kpis: KhataKpisDto = KhataKpisDto(),
    @SerializedName("contacts") val contacts: List<KhataContactDto> = emptyList(),
    @SerializedName("recentTransactions") val recentTransactions: List<KhataTransactionDto> = emptyList(),
    @SerializedName("modeSummaries") val modeSummaries: List<PaymentModeSummaryDto> = emptyList()
)

data class KhataKpisDto(
    @SerializedName("amountToReceive") val amountToReceive: Double = 0.0,
    @SerializedName("amountToPay") val amountToPay: Double = 0.0,
    @SerializedName("netPosition") val netPosition: Double = 0.0,
    @SerializedName("netPositionDescription") val netPositionDescription: String? = null,
    @SerializedName("totalGiven") val totalGiven: Double = 0.0,
    @SerializedName("totalTaken") val totalTaken: Double = 0.0,
    @SerializedName("totalReceivedBack") val totalReceivedBack: Double = 0.0,
    @SerializedName("totalReturned") val totalReturned: Double = 0.0,
    @SerializedName("totalContacts") val totalContacts: Int = 0,
    @SerializedName("overdueCount") val overdueCount: Int = 0,
    // Aliases
    @SerializedName("moneyToCollect") val moneyToCollect: Double = 0.0,
    @SerializedName("moneyToRepay") val moneyToRepay: Double = 0.0,
    @SerializedName("totalGave") val totalGave: Double = 0.0,
    @SerializedName("totalReceived") val totalReceived: Double = 0.0
)

data class PaymentModeSummaryDto(
    @SerializedName("mode") val mode: String,
    @SerializedName("label") val label: String,
    @SerializedName("totalGiven") val totalGiven: Double = 0.0,
    @SerializedName("totalReceived") val totalReceived: Double = 0.0,
    @SerializedName("count") val count: Int = 0
)

data class KhataContactsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("contacts") val contacts: List<KhataContactDto> = emptyList(),
    @SerializedName("error") val error: String? = null
)

data class KhataContactDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("amountToReceive") val amountToReceive: Double = 0.0,
    @SerializedName("amountToPay") val amountToPay: Double = 0.0,
    @SerializedName("netPosition") val netPosition: Double = 0.0,
    @SerializedName("totalGiven") val totalGiven: Double = 0.0,
    @SerializedName("totalTaken") val totalTaken: Double = 0.0,
    @SerializedName("status") val status: String = "SETTLED",
    @SerializedName("statusLabel") val statusLabel: String = "हिसाब पूरा",
    @SerializedName("transactionCount") val transactionCount: Int = 0,
    @SerializedName("lastActivityDate") val lastActivityDate: String? = null,
    // Aliases
    @SerializedName("gaveOutstanding") val gaveOutstanding: Double = 0.0,
    @SerializedName("receivedOutstanding") val receivedOutstanding: Double = 0.0,
    @SerializedName("totalGave") val totalGave: Double = 0.0,
    @SerializedName("totalReceived") val totalReceived: Double = 0.0,
    @SerializedName("balance") val balance: Double = 0.0
)

data class KhataTransactionDto(
    @SerializedName("id") val id: String,
    @SerializedName("contactId") val contactId: String? = null,
    @SerializedName("contactName") val contactName: String? = null,
    @SerializedName("contactPhone") val contactPhone: String? = null,
    @SerializedName("type") val type: String, // GAVE or RECEIVED
    @SerializedName("amount") val amount: Double,
    @SerializedName("balanceAmount") val balanceAmount: Double = 0.0,
    @SerializedName("settledAmount") val settledAmount: Double = 0.0,
    @SerializedName("date") val date: String,
    @SerializedName("dueDate") val dueDate: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("paymentMode") val paymentMode: String = "CASH",
    @SerializedName("paymentRef") val paymentRef: String? = null,
    @SerializedName("paymentDetails") val paymentDetails: String? = null,
    @SerializedName("status") val status: String = "PENDING"
)

data class CreateKhataTransactionRequest(
    @SerializedName("contactId") val contactId: String? = null,
    @SerializedName("personName") val personName: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("type") val type: String, // GAVE or RECEIVED
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("dueDate") val dueDate: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("paymentMode") val paymentMode: String = "CASH",
    @SerializedName("paymentRef") val paymentRef: String? = null,
    @SerializedName("paymentDetails") val paymentDetails: String? = null
)

data class RecordKhataRepaymentRequest(
    @SerializedName("transactionId") val transactionId: String? = null,
    @SerializedName("contactId") val contactId: String? = null,
    @SerializedName("targetType") val targetType: String? = null, // GAVE or RECEIVED
    @SerializedName("amount") val amount: Double,
    @SerializedName("date") val date: String,
    @SerializedName("paymentMode") val paymentMode: String = "CASH",
    @SerializedName("paymentRef") val paymentRef: String? = null,
    @SerializedName("notes") val notes: String? = null
)
