package com.pakkachittha.app.data.repository

import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.model.*

class InvoiceRepository(private val api: PakkachitthaApiService) {

    suspend fun getInvoices(search: String? = null, status: String? = null): Result<List<InvoiceDto>> {
        return try {
            val res = api.getInvoices(search, if (status == "ALL") null else status)
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!.invoices)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to fetch invoices."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getInvoiceDetail(id: String): Result<InvoiceDto> {
        return try {
            val res = api.getInvoiceDetail(id)
            if (res.isSuccessful && res.body()?.success == true && res.body()?.invoice != null) {
                Result.success(res.body()!!.invoice!!)
            } else {
                Result.failure(Exception("Invoice not found."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getNextInvoiceNumber(): Result<String> {
        return try {
            val res = api.getNextInvoiceNumber()
            if (res.isSuccessful && res.body()?.success == true) {
                val num = res.body()?.nextNumber ?: res.body()?.invoiceNumber ?: "INV-001"
                Result.success(num)
            } else {
                Result.success("INV-001")
            }
        } catch (e: Exception) {
            Result.success("INV-001")
        }
    }

    suspend fun createInvoice(req: CreateInvoiceRequest): Result<InvoiceDto> {
        return try {
            val res = api.createInvoice(req)
            if (res.isSuccessful && res.body()?.success == true && res.body()?.invoice != null) {
                Result.success(res.body()!!.invoice!!)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to create invoice."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun recordPayment(invoiceId: String, req: RecordPaymentRequest): Result<Unit> {
        return try {
            val res = api.recordInvoicePayment(invoiceId, req)
            if (res.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to record payment."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
