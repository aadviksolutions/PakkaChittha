package com.pakkachittha.app.ui.screens.invoices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import com.pakkachittha.app.ui.components.InvoiceStatusBadge
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.InvoiceListUiState
import com.pakkachittha.app.ui.viewmodel.InvoiceViewModel
import java.util.Locale

@Composable
fun InvoiceListScreen(
    viewModel: InvoiceViewModel,
    onOpenDrawer: () -> Unit,
    onNavigateToCreateInvoice: () -> Unit,
    onNavigateToDetail: (String) -> Unit
) {
    val listState by viewModel.listState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedStatus by remember { mutableStateOf("ALL") }

    val statusFilters = listOf("ALL", "UNPAID", "PARTIAL", "PAID", "CANCELLED")

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "Invoices & Billing",
                subtitle = "Sales Register",
                onNavigationClick = onOpenDrawer
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToCreateInvoice,
                containerColor = BrandAccent,
                contentColor = TextWhite,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Invoice")
            }
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.loadInvoices(searchQuery, selectedStatus)
                },
                placeholder = { Text("Search by invoice # or party name...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = SurfaceCard,
                    unfocusedContainerColor = SurfaceCard,
                    focusedBorderColor = BrandPrimary,
                    unfocusedBorderColor = BorderSubtle
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Status Filter Chips
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(statusFilters) { status ->
                    val isSelected = selectedStatus == status
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            selectedStatus = status
                            viewModel.loadInvoices(searchQuery, selectedStatus)
                        },
                        label = { Text(status) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandPrimary,
                            selectedLabelColor = TextWhite,
                            containerColor = SurfaceCard,
                            labelColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                }
            }

            // Invoices Content
            when (val state = listState) {
                is InvoiceListUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandAccent)
                    }
                }
                is InvoiceListUiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = state.message, color = BrandDanger)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { viewModel.loadInvoices(searchQuery, selectedStatus) }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                is InvoiceListUiState.Success -> {
                    if (state.invoices.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = TextMuted, modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("No invoices found", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                Text("Create your first bill to get started", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                            }
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(state.invoices) { inv ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onNavigateToDetail(inv.id) },
                                    shape = RoundedCornerShape(14.dp),
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
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                Text(
                                                    text = inv.invoiceNumber,
                                                    style = MaterialTheme.typography.titleMedium.copy(
                                                        fontWeight = FontWeight.Bold,
                                                        color = BrandPrimary
                                                    )
                                                )
                                                InvoiceStatusBadge(status = inv.status)
                                            }

                                            Spacer(modifier = Modifier.height(2.dp))

                                            Text(
                                                text = inv.customerName ?: "Retail Customer",
                                                style = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary),
                                                fontWeight = FontWeight.SemiBold
                                            )

                                            Text(
                                                text = inv.invoiceDate.take(10),
                                                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                text = "₹${String.format(Locale.getDefault(), "%,.2f", inv.total)}",
                                                style = MaterialTheme.typography.titleMedium.copy(
                                                    fontWeight = FontWeight.Black,
                                                    color = BrandPrimary
                                                )
                                            )

                                            if (inv.balanceDue > 0 && inv.status != "CANCELLED") {
                                                Text(
                                                    text = "Bal: ₹${String.format(Locale.getDefault(), "%,.0f", inv.balanceDue)}",
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        color = BrandWarning,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                )
                                            } else {
                                                Text(
                                                    text = "Settled",
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        color = BrandSuccess,
                                                        fontWeight = FontWeight.Bold
                                                    )
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
    }
}
