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

// =========================================================================
// Consolidated & Person-wise Personal Khata Reports (Shared Backend APIs)
// =========================================================================

data class KhataConsolidatedReportResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("reportType") val reportType: String? = null,
    @SerializedName("report") val report: KhataReportDto? = null,
    @SerializedName("share") val share: KhataReportShareDto? = null,
    @SerializedName("error") val error: String? = null
)

data class KhataPersonDetailedReportResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("reportType") val reportType: String? = null,
    @SerializedName("report") val report: KhataPersonReportDto? = null,
    @SerializedName("share") val share: KhataReportShareDto? = null,
    @SerializedName("error") val error: String? = null
)

data class KhataReportShareDto(
    @SerializedName("subject") val subject: String = "",
    @SerializedName("text") val text: String = ""
)

data class KhataReportMetadataDto(
    @SerializedName("reportTitle") val reportTitle: String = "",
    @SerializedName("reportSubtitle") val reportSubtitle: String = "",
    @SerializedName("referenceNumber") val referenceNumber: String = "",
    @SerializedName("generatedAt") val generatedAt: String = "",
    @SerializedName("generatedAtDisplay") val generatedAtDisplay: String = "",
    @SerializedName("businessName") val businessName: String = "",
    @SerializedName("businessPhone") val businessPhone: String? = null,
    @SerializedName("businessEmail") val businessEmail: String? = null,
    @SerializedName("currency") val currency: String = "INR"
)

data class KhataReportFiltersDto(
    @SerializedName("dateRange") val dateRange: String = "ALL",
    @SerializedName("startDate") val startDate: String? = null,
    @SerializedName("endDate") val endDate: String? = null,
    @SerializedName("periodLabel") val periodLabel: String = "All Time",
    @SerializedName("search") val search: String = "",
    @SerializedName("mobile") val mobile: String = "",
    @SerializedName("direction") val direction: String = "ALL",
    @SerializedName("paymentMode") val paymentMode: String = "ALL",
    @SerializedName("accountStatus") val accountStatus: String = "OUTSTANDING"
)

data class KhataReportSummaryDto(
    @SerializedName("totalAmountToReceive") val totalAmountToReceive: Double = 0.0,
    @SerializedName("totalAmountToPay") val totalAmountToPay: Double = 0.0,
    @SerializedName("netPosition") val netPosition: Double = 0.0,
    @SerializedName("netPositionStatus") val netPositionStatus: String = "SETTLED",
    @SerializedName("netPositionLabel") val netPositionLabel: String = "",
    @SerializedName("totalActiveAccounts") val totalActiveAccounts: Int = 0,
    @SerializedName("receivableAccountCount") val receivableAccountCount: Int = 0,
    @SerializedName("payableAccountCount") val payableAccountCount: Int = 0,
    @SerializedName("dualBalanceAccountCount") val dualBalanceAccountCount: Int = 0,
    @SerializedName("settledAccountCount") val settledAccountCount: Int = 0,
    @SerializedName("totalMatchedAccounts") val totalMatchedAccounts: Int = 0
)

data class KhataReportPeriodSummaryDto(
    @SerializedName("totalGivenInPeriod") val totalGivenInPeriod: Double = 0.0,
    @SerializedName("totalReceivedBackInPeriod") val totalReceivedBackInPeriod: Double = 0.0,
    @SerializedName("totalTakenInPeriod") val totalTakenInPeriod: Double = 0.0,
    @SerializedName("totalReturnedInPeriod") val totalReturnedInPeriod: Double = 0.0,
    @SerializedName("transactionCount") val transactionCount: Int = 0
)

data class KhataReportHistoricalSummaryDto(
    @SerializedName("totalGivenLifetime") val totalGivenLifetime: Double = 0.0,
    @SerializedName("totalReceivedBackLifetime") val totalReceivedBackLifetime: Double = 0.0,
    @SerializedName("totalTakenLifetime") val totalTakenLifetime: Double = 0.0,
    @SerializedName("totalReturnedLifetime") val totalReturnedLifetime: Double = 0.0
)

data class KhataReceivableRowDto(
    @SerializedName("sNo") val sNo: Int = 0,
    @SerializedName("contactId") val contactId: String = "",
    @SerializedName("personName") val personName: String = "",
    @SerializedName("mobileNumber") val mobileNumber: String = "—",
    @SerializedName("totalAmountGiven") val totalAmountGiven: Double = 0.0,
    @SerializedName("amountReceivedBack") val amountReceivedBack: Double = 0.0,
    @SerializedName("balanceToReceive") val balanceToReceive: Double = 0.0,
    @SerializedName("hasPayableAlso") val hasPayableAlso: Boolean = false,
    @SerializedName("currentPayableBalance") val currentPayableBalance: Double = 0.0
)

data class KhataPayableRowDto(
    @SerializedName("sNo") val sNo: Int = 0,
    @SerializedName("contactId") val contactId: String = "",
    @SerializedName("personName") val personName: String = "",
    @SerializedName("mobileNumber") val mobileNumber: String = "—",
    @SerializedName("totalAmountTaken") val totalAmountTaken: Double = 0.0,
    @SerializedName("amountReturned") val amountReturned: Double = 0.0,
    @SerializedName("balanceToPay") val balanceToPay: Double = 0.0,
    @SerializedName("hasReceivableAlso") val hasReceivableAlso: Boolean = false,
    @SerializedName("currentReceivableBalance") val currentReceivableBalance: Double = 0.0
)

data class KhataSettledAccountRowDto(
    @SerializedName("sNo") val sNo: Int = 0,
    @SerializedName("contactId") val contactId: String = "",
    @SerializedName("personName") val personName: String = "",
    @SerializedName("mobileNumber") val mobileNumber: String = "—",
    @SerializedName("totalGiven") val totalGiven: Double = 0.0,
    @SerializedName("totalReceivedBack") val totalReceivedBack: Double = 0.0,
    @SerializedName("totalTaken") val totalTaken: Double = 0.0,
    @SerializedName("totalReturned") val totalReturned: Double = 0.0
)

data class KhataReportTransactionDto(
    @SerializedName("id") val id: String = "",
    @SerializedName("contactId") val contactId: String = "",
    @SerializedName("personName") val personName: String = "",
    @SerializedName("mobileNumber") val mobileNumber: String = "—",
    @SerializedName("date") val date: String = "",
    @SerializedName("activityType") val activityType: String = "",
    @SerializedName("activityLabel") val activityLabel: String = "",
    @SerializedName("title") val title: String = "",
    @SerializedName("moneyDirection") val moneyDirection: String = "OUT",
    @SerializedName("balanceBucket") val balanceBucket: String = "TO_RECEIVE",
    @SerializedName("amount") val amount: Double = 0.0,
    @SerializedName("paymentMode") val paymentMode: String = "CASH",
    @SerializedName("paymentModeLabel") val paymentModeLabel: String = "Cash",
    @SerializedName("paymentRef") val paymentRef: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("previousBalance") val previousBalance: Double = 0.0,
    @SerializedName("updatedBalance") val updatedBalance: Double = 0.0
)

data class KhataReportDto(
    @SerializedName("metadata") val metadata: KhataReportMetadataDto = KhataReportMetadataDto(),
    @SerializedName("filters") val filters: KhataReportFiltersDto = KhataReportFiltersDto(),
    @SerializedName("summary") val summary: KhataReportSummaryDto = KhataReportSummaryDto(),
    @SerializedName("periodSummary") val periodSummary: KhataReportPeriodSummaryDto = KhataReportPeriodSummaryDto(),
    @SerializedName("historicalSummary") val historicalSummary: KhataReportHistoricalSummaryDto = KhataReportHistoricalSummaryDto(),
    @SerializedName("amountToReceiveRows") val amountToReceiveRows: List<KhataReceivableRowDto> = emptyList(),
    @SerializedName("amountToPayRows") val amountToPayRows: List<KhataPayableRowDto> = emptyList(),
    @SerializedName("settledAccounts") val settledAccounts: List<KhataSettledAccountRowDto> = emptyList(),
    @SerializedName("transactions") val transactions: List<KhataReportTransactionDto> = emptyList()
)

data class KhataPersonReportContactDto(
    @SerializedName("id") val id: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("notes") val notes: String? = null
)

data class KhataPersonReportSummaryDto(
    @SerializedName("totalGiven") val totalGiven: Double = 0.0,
    @SerializedName("totalTaken") val totalTaken: Double = 0.0,
    @SerializedName("totalReceivedBack") val totalReceivedBack: Double = 0.0,
    @SerializedName("totalReturned") val totalReturned: Double = 0.0,
    @SerializedName("amountToReceive") val amountToReceive: Double = 0.0,
    @SerializedName("amountToPay") val amountToPay: Double = 0.0,
    @SerializedName("netPosition") val netPosition: Double = 0.0,
    @SerializedName("status") val status: String = "SETTLED",
    @SerializedName("statusLabel") val statusLabel: String = ""
)

data class KhataPersonReportDto(
    @SerializedName("metadata") val metadata: KhataReportMetadataDto = KhataReportMetadataDto(),
    @SerializedName("filters") val filters: KhataReportFiltersDto = KhataReportFiltersDto(),
    @SerializedName("contact") val contact: KhataPersonReportContactDto = KhataPersonReportContactDto(),
    @SerializedName("summary") val summary: KhataPersonReportSummaryDto = KhataPersonReportSummaryDto(),
    @SerializedName("transactions") val transactions: List<KhataReportTransactionDto> = emptyList()
)
