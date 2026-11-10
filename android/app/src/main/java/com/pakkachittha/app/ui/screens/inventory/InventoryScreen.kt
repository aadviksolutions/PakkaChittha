package com.pakkachittha.app.ui.screens.inventory

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.data.model.CreateProductRequest
import com.pakkachittha.app.data.model.ProductDto
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.InventoryUiState
import com.pakkachittha.app.ui.viewmodel.InventoryViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryScreen(
    viewModel: InventoryViewModel,
    onOpenDrawer: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var lowStockOnly by remember { mutableStateOf(false) }
    var showAddModal by remember { mutableStateOf(false) }

    var prodName by remember { mutableStateOf("") }
    var prodSku by remember { mutableStateOf("") }
    var prodBuyPrice by remember { mutableStateOf("") }
    var prodSellPrice by remember { mutableStateOf("") }
    var prodStock by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "Inventory & Stock",
                subtitle = "Product Catalog",
                onNavigationClick = onOpenDrawer
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddModal = true },
                containerColor = BrandAccent,
                contentColor = TextWhite,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Product")
            }
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = {
                        searchQuery = it
                        viewModel.loadInventory(searchQuery, null, lowStockOnly)
                    },
                    placeholder = { Text("Search products, SKU...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    selected = lowStockOnly,
                    onClick = {
                        lowStockOnly = !lowStockOnly
                        viewModel.loadInventory(searchQuery, null, lowStockOnly)
                    },
                    label = { Text("Low Stock") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandDanger,
                        selectedLabelColor = TextWhite
                    )
                )
            }

            when (val state = uiState) {
                is InventoryUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandAccent)
                    }
                }
                is InventoryUiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = state.message, color = BrandDanger)
                    }
                }
                is InventoryUiState.Success -> {
                    val products = state.products
                    val valDto = state.valuation

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (valDto != null) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("Retail Stock Value", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                            Text("₹${String.format(Locale.getDefault(), "%,.0f", valDto.totalRetailValue)}", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black, color = BrandPrimary))
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Total Units", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                            Text("${valDto.totalQuantity.toInt()} Items", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                        }
                                    }
                                }
                            }
                        }

                        items(products) { p ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(p.name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                        if (p.sku != null) {
                                            Text("SKU: ${p.sku}", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                        }
                                        Text("Selling: ₹${p.sellingPrice} • Buy: ₹${p.purchasePrice}", style = MaterialTheme.typography.bodySmall.copy(color = BrandSecondary))
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Surface(
                                            color = if (p.currentStock <= p.lowStockAlert) BrandDangerLight else BrandSuccessLight,
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                text = "${p.currentStock.toInt()} ${p.unit}",
                                                color = if (p.currentStock <= p.lowStockAlert) BrandDanger else BrandSuccess,
                                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(72.dp))
                        }
                    }
                }
            }
        }
    }

    if (showAddModal) {
        ModalBottomSheet(onDismissRequest = { showAddModal = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                Text("Add New Product", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = prodName,
                    onValueChange = { prodName = it },
                    label = { Text("Product Name *") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = prodSku,
                    onValueChange = { prodSku = it },
                    label = { Text("SKU / Item Code") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = prodBuyPrice,
                        onValueChange = { prodBuyPrice = it },
                        label = { Text("Buy Price (₹)") },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = prodSellPrice,
                        onValueChange = { prodSellPrice = it },
                        label = { Text("Sell Price (₹)") },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = prodStock,
                    onValueChange = { prodStock = it },
                    label = { Text("Opening Stock (Qty)") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        val buy = prodBuyPrice.toDoubleOrNull() ?: 0.0
                        val sell = prodSellPrice.toDoubleOrNull() ?: 0.0
                        val stock = prodStock.toDoubleOrNull() ?: 0.0
                        if (prodName.isNotBlank() && sell > 0) {
                            viewModel.createProduct(
                                CreateProductRequest(
                                    name = prodName.trim(),
                                    sku = prodSku.ifBlank { null },
                                    purchasePrice = buy,
                                    sellingPrice = sell,
                                    initialStock = stock
                                )
                            ) {
                                showAddModal = false
                                prodName = ""
                                prodSku = ""
                                prodBuyPrice = ""
                                prodSellPrice = ""
                                prodStock = ""
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandAccent),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Save Product")
                }
            }
        }
    }
}
