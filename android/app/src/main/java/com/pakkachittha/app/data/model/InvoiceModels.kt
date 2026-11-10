package com.pakkachittha.app.data.model

import com.google.gson.annotations.SerializedName

data class InvoiceListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("invoices") val invoices: List<InvoiceDto> = emptyList(),
    @SerializedName("error") val error: String? = null
)

data class InvoiceDetailResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("invoice") val invoice: InvoiceDto? = null,
    @SerializedName("error") val error: String? = null
)

data class NextInvoiceNumberResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("invoiceNumber") val invoiceNumber: String? = null,
    @SerializedName("nextNumber") val nextNumber: String? = null
)

data class InvoiceDto(
    @SerializedName("id") val id: String,
    @SerializedName("invoiceNumber") val invoiceNumber: String,
    @SerializedName("customerName") val customerName: String? = null,
    @SerializedName("customerMobile") val customerMobile: String? = null,
    @SerializedName("invoiceDate") val invoiceDate: String,
    @SerializedName("dueDate") val dueDate: String? = null,
    @SerializedName("subtotal") val subtotal: Double = 0.0,
    @SerializedName("taxTotal") val taxTotal: Double = 0.0,
    @SerializedName("discountTotal") val discountTotal: Double = 0.0,
    @SerializedName("total") val total: Double = 0.0,
    @SerializedName("paidAmount") val paidAmount: Double = 0.0,
    @SerializedName("balanceDue") val balanceDue: Double = 0.0,
    @SerializedName("status") val status: String = "DRAFT",
    @SerializedName("customer") val customer: CustomerDto? = null,
    @SerializedName("items") val items: List<InvoiceItemDto> = emptyList(),
    @SerializedName("payments") val payments: List<PaymentDto> = emptyList(),
    @SerializedName("notes") val notes: String? = null
)

data class InvoiceItemDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("description") val description: String,
    @SerializedName("hsnCode") val hsnCode: String? = null,
    @SerializedName("quantity") val quantity: Double = 1.0,
    @SerializedName("unitPrice") val unitPrice: Double = 0.0,
    @SerializedName("gstRate") val gstRate: Double = 0.0,
    @SerializedName("taxAmount") val taxAmount: Double = 0.0,
    @SerializedName("total") val total: Double = 0.0
)

data class PaymentDto(
    @SerializedName("id") val id: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("paymentMethod") val paymentMethod: String = "CASH",
    @SerializedName("referenceNumber") val referenceNumber: String? = null,
    @SerializedName("paymentDate") val paymentDate: String,
    @SerializedName("notes") val notes: String? = null
)

data class CreateInvoiceRequest(
    @SerializedName("customerId") val customerId: String? = null,
    @SerializedName("customerName") val customerName: String? = null,
    @SerializedName("customerMobile") val customerMobile: String? = null,
    @SerializedName("invoiceDate") val invoiceDate: String,
    @SerializedName("dueDate") val dueDate: String? = null,
    @SerializedName("items") val items: List<CreateInvoiceItemRequest>,
    @SerializedName("notes") val notes: String? = null
)

data class CreateInvoiceItemRequest(
    @SerializedName("description") val description: String,
    @SerializedName("hsnCode") val hsnCode: String? = null,
    @SerializedName("quantity") val quantity: Double = 1.0,
    @SerializedName("unitPrice") val unitPrice: Double,
    @SerializedName("gstRate") val gstRate: Double = 0.0
)

data class RecordPaymentRequest(
    @SerializedName("amount") val amount: Double,
    @SerializedName("paymentMethod") val paymentMethod: String = "CASH",
    @SerializedName("referenceNumber") val referenceNumber: String? = null,
    @SerializedName("notes") val notes: String? = null
)
