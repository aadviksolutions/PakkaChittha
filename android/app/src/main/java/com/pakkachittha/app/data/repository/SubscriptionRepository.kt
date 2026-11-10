package com.pakkachittha.app.data.repository

import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.model.*

class SubscriptionRepository(private val api: PakkachitthaApiService) {

    suspend fun getPlans(): Result<Map<String, OfficialPlanDto>> {
        return try {
            val res = api.getSubscriptionPlans()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!.plans)
            } else {
                Result.failure(Exception("Failed to load subscription plans"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun validateDiscount(code: String, planKey: String, interval: String): Result<ValidateDiscountResponse> {
        return try {
            val res = api.validateDiscount(ValidateDiscountRequest(code, planKey, interval))
            if (res.isSuccessful && res.body()?.valid == true) {
                Result.success(res.body()!!)
            } else {
                val err = res.body()?.error ?: "Invalid discount code."
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPaymentDetails(): Result<PaymentDetailsDto?> {
        return try {
            val res = api.getPaymentDetails()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()?.paymentDetails)
            } else {
                Result.failure(Exception("Failed to get payment details"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun savePaymentDetails(upiId: String?, beneficiaryName: String?): Result<Unit> {
        return try {
            val res = api.savePaymentDetails(SavePaymentDetailsRequest(upiId, beneficiaryName))
            if (res.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to save payment details"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
