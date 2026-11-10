package com.pakkachittha.app.data.repository

import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.model.*

class InventoryRepository(private val api: PakkachitthaApiService) {

    suspend fun getInventory(query: String? = null, category: String? = null, lowStockOnly: Boolean = false): Result<InventoryListResponse> {
        return try {
            val res = api.getInventory(query, category, lowStockOnly)
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception(res.body()?.error ?: "Failed to fetch inventory."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createProduct(req: CreateProductRequest): Result<Unit> {
        return try {
            val res = api.createProduct(req)
            if (res.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to create product."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun adjustStock(productId: String, req: AdjustStockRequest): Result<Unit> {
        return try {
            val res = api.adjustStock(productId, req)
            if (res.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to adjust stock."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
