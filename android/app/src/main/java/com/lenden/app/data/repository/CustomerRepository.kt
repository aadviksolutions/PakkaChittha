package com.lenden.app.data.repository

import com.lenden.app.data.local.db.dao.CustomerDao
import com.lenden.app.data.local.db.entity.CachedCustomerEntity
import com.lenden.app.data.remote.LendenApiService
import com.lenden.app.data.remote.dto.*
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class CustomerRepository(
    private val api: LendenApiService,
    private val customerDao: CustomerDao
) {
    val cachedCustomers: Flow<List<CachedCustomerEntity>> = customerDao.getAllCustomers()

    fun getCustomers(search: String? = null): Flow<Resource<List<CustomerDto>>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.getCustomers(search)
            if (response.isSuccessful && response.body() != null) {
                val customers = response.body()!!.customers
                // Cache locally for offline customer selector
                customerDao.insertCustomers(customers.map {
                    CachedCustomerEntity(
                        id = it.id,
                        name = it.name,
                        mobile = it.mobile,
                        email = it.email,
                        billingAddress = it.billingAddress,
                        gstin = it.gstin,
                        totalOutstanding = it.totalOutstanding
                    )
                })
                emit(Resource.Success(customers))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to fetch customers"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    fun createCustomer(request: CreateCustomerRequest): Flow<Resource<Boolean>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.createCustomer(request)
            if (response.isSuccessful && response.body()?.success == true) {
                emit(Resource.Success(true))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to create customer"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    fun lookupGstin(gstin: String): Flow<Resource<GstBusinessDetailsDto>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.lookupGstin(gstin)
            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                emit(Resource.Success(response.body()!!.data!!))
            } else {
                val errorMsg = response.body()?.error ?: "Failed to fetch GST details"
                emit(Resource.Error(errorMsg))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }
}
