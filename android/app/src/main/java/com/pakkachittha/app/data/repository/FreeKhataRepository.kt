package com.pakkachittha.app.data.repository

import android.content.Context
import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.model.*
import java.io.File

class FreeKhataRepository(private val api: PakkachitthaApiService) {

    suspend fun getDashboard(): Result<PersonalKhataDataDto> {
        return try {
            val res = api.getKhataDashboard()
            if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to load Personal Khata summary."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getContacts(): Result<List<KhataContactDto>> {
        return try {
            val res = api.getKhataContacts()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!.contacts)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to load contacts."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTransaction(req: CreateKhataTransactionRequest): Result<Unit> {
        return try {
            val res = api.createKhataTransaction(req)
            if (res.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to save transaction."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun recordRepayment(req: RecordKhataRepaymentRequest): Result<Unit> {
        return try {
            val res = api.recordKhataRepayment(req)
            if (res.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to record repayment."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getConsolidatedReport(
        dateRange: String = "ALL",
        startDate: String? = null,
        endDate: String? = null,
        search: String? = null,
        direction: String = "ALL",
        paymentMode: String = "ALL",
        accountStatus: String = "OUTSTANDING"
    ): Result<KhataConsolidatedReportResponse> {
        return try {
            val res = api.getKhataConsolidatedReport(
                dateRange = dateRange,
                startDate = startDate?.takeIf { it.isNotBlank() },
                endDate = endDate?.takeIf { it.isNotBlank() },
                search = search?.takeIf { it.isNotBlank() },
                direction = direction,
                paymentMode = paymentMode,
                accountStatus = accountStatus
            )
            if (res.isSuccessful && res.body()?.success == true && res.body()?.report != null) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to load Personal Khata report."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPersonReport(
        contactId: String,
        dateRange: String = "ALL",
        startDate: String? = null,
        endDate: String? = null,
        paymentMode: String = "ALL"
    ): Result<KhataPersonDetailedReportResponse> {
        return try {
            val res = api.getKhataPersonReport(
                contactId = contactId,
                dateRange = dateRange,
                startDate = startDate?.takeIf { it.isNotBlank() },
                endDate = endDate?.takeIf { it.isNotBlank() },
                paymentMode = paymentMode
            )
            if (res.isSuccessful && res.body()?.success == true && res.body()?.report != null) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to load party ledger statement."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadReportFile(
        context: Context,
        format: String,
        contactId: String? = null,
        dateRange: String = "ALL",
        startDate: String? = null,
        endDate: String? = null,
        search: String? = null,
        direction: String = "ALL",
        paymentMode: String = "ALL",
        accountStatus: String = "OUTSTANDING"
    ): Result<File> {
        return try {
            val res = api.exportKhataReport(
                format = format,
                contactId = contactId,
                dateRange = dateRange,
                startDate = startDate?.takeIf { it.isNotBlank() },
                endDate = endDate?.takeIf { it.isNotBlank() },
                search = search?.takeIf { it.isNotBlank() },
                direction = direction,
                paymentMode = paymentMode,
                accountStatus = accountStatus
            )
            val body = res.body()
            if (!res.isSuccessful || body == null) {
                return Result.failure(Exception("Failed to export ${format.uppercase()} report."))
            }
            val reportsDir = File(context.cacheDir, "reports").apply { mkdirs() }
            val ext = if (format.equals("xlsx", ignoreCase = true)) "xlsx" else "pdf"
            val prefix = if (contactId.isNullOrBlank()) "pakkachittha-khata-report" else "pakkachittha-party-statement"
            val outFile = File(reportsDir, "$prefix-${System.currentTimeMillis()}.$ext")
            body.byteStream().use { input ->
                outFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            Result.success(outFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
