package com.pakkachittha.app.data.repository

import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.model.*

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
}
