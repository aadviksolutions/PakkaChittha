package com.pakkachittha.app.data.repository

import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.model.*

class CustomerRepository(private val api: PakkachitthaApiService) {

    suspend fun getCustomers(search: String? = null): Result<List<CustomerDto>> {
        return try {
            val res = api.getCustomers(search)
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!.customers)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to fetch customers."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCustomerDetail(id: String): Result<CustomerDto> {
        return try {
            val res = api.getCustomerDetail(id)
            if (res.isSuccessful && res.body()?.success == true && res.body()?.customer != null) {
                Result.success(res.body()!!.customer!!)
            } else {
                Result.failure(Exception("Customer not found."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createCustomer(req: CreateCustomerRequest): Result<CustomerDto> {
        return try {
            val res = api.createCustomer(req)
            if (res.isSuccessful && res.body()?.success == true && res.body()?.customer != null) {
                Result.success(res.body()!!.customer!!)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to create customer."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
