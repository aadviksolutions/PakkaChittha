package com.pakkachittha.app.data.model

import com.google.gson.annotations.SerializedName

data class InventoryListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("products") val products: List<ProductDto> = emptyList(),
    @SerializedName("valuation") val valuation: InventoryValuationDto? = null,
    @SerializedName("error") val error: String? = null
)

data class InventoryValuationDto(
    @SerializedName("totalItems") val totalItems: Int = 0,
    @SerializedName("totalQuantity") val totalQuantity: Double = 0.0,
    @SerializedName("totalCostValue") val totalCostValue: Double = 0.0,
    @SerializedName("totalRetailValue") val totalRetailValue: Double = 0.0,
    @SerializedName("lowStockCount") val lowStockCount: Int = 0
)

data class ProductDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("sku") val sku: String? = null,
    @SerializedName("barcode") val barcode: String? = null,
    @SerializedName("category") val category: String? = null,
    @SerializedName("unit") val unit: String = "PCS",
    @SerializedName("purchasePrice") val purchasePrice: Double = 0.0,
    @SerializedName("sellingPrice") val sellingPrice: Double = 0.0,
    @SerializedName("currentStock") val currentStock: Double = 0.0,
    @SerializedName("lowStockAlert") val lowStockAlert: Double = 5.0,
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("isArchived") val isArchived: Boolean = false
)

data class CreateProductRequest(
    @SerializedName("name") val name: String,
    @SerializedName("sku") val sku: String? = null,
    @SerializedName("barcode") val barcode: String? = null,
    @SerializedName("category") val category: String? = null,
    @SerializedName("unit") val unit: String = "PCS",
    @SerializedName("purchasePrice") val purchasePrice: Double,
    @SerializedName("sellingPrice") val sellingPrice: Double,
    @SerializedName("initialStock") val initialStock: Double = 0.0,
    @SerializedName("lowStockAlert") val lowStockAlert: Double = 5.0
)

data class AdjustStockRequest(
    @SerializedName("adjustmentQuantity") val adjustmentQuantity: Double,
    @SerializedName("type") val type: String = "CORRECTION",
    @SerializedName("reason") val reason: String? = null
)
