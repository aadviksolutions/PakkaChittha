package com.pakkachittha.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.data.repository.InventoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class InventoryUiState {
    object Loading : InventoryUiState()
    data class Success(val products: List<ProductDto>, val valuation: InventoryValuationDto?) : InventoryUiState()
    data class Error(val message: String) : InventoryUiState()
}

class InventoryViewModel(private val repository: InventoryRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<InventoryUiState>(InventoryUiState.Loading)
    val uiState: StateFlow<InventoryUiState> = _uiState.asStateFlow()

    init {
        loadInventory()
    }

    fun loadInventory(query: String? = null, category: String? = null, lowStockOnly: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = InventoryUiState.Loading
            repository.getInventory(query, category, lowStockOnly).fold(
                onSuccess = { res ->
                    _uiState.value = InventoryUiState.Success(res.products, res.valuation)
                },
                onFailure = { err ->
                    _uiState.value = InventoryUiState.Error(err.message ?: "Failed to load inventory")
                }
            )
        }
    }

    fun createProduct(req: CreateProductRequest, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.createProduct(req).fold(
                onSuccess = {
                    loadInventory()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }

    fun adjustStock(productId: String, qty: Double, reason: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.adjustStock(productId, AdjustStockRequest(qty, "CORRECTION", reason)).fold(
                onSuccess = {
                    loadInventory()
                    onComplete(true)
                },
                onFailure = { onComplete(false) }
            )
        }
    }
}
