package com.pakkachittha.app.ui.screens.customers

import androidx.compose.foundation.clickable
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
import com.pakkachittha.app.data.model.CreateCustomerRequest
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.CustomerListUiState
import com.pakkachittha.app.ui.viewmodel.CustomerViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerListScreen(
    viewModel: CustomerViewModel,
    onOpenDrawer: () -> Unit,
    onNavigateToDetail: (String) -> Unit
) {
    val listState by viewModel.listState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showAddModal by remember { mutableStateOf(false) }

    var newName by remember { mutableStateOf("") }
    var newMobile by remember { mutableStateOf("") }
    var newGstin by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "Customers & Parties",
                subtitle = "Customer Ledger",
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
                Icon(Icons.Default.PersonAdd, contentDescription = "Add Customer")
            }
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.loadCustomers(searchQuery)
                },
                placeholder = { Text("Search customer by name or phone...") },
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

            when (val state = listState) {
                is CustomerListUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandAccent)
                    }
                }
                is CustomerListUiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = state.message, color = BrandDanger)
                    }
                }
                is CustomerListUiState.Success -> {
                    val customers = state.customers
                    val totalOutstanding = customers.sumOf { it.outstandingBalance }

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Total Parties: ${customers.size}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                        Text("Active commercial ledger accounts", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("₹${String.format(Locale.getDefault(), "%,.0f", totalOutstanding)}", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black, color = BrandWarning))
                                        Text("Total Udhaar", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                    }
                                }
                            }
                        }

                        items(customers) { c ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onNavigateToDetail(c.id) },
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
                                        Text(c.name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                        if (c.mobile != null) {
                                            Text(c.mobile, style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                        }
                                        if (c.gstin != null) {
                                            Text("GST: ${c.gstin}", style = MaterialTheme.typography.bodySmall.copy(color = BrandSecondary))
                                        }
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "₹${String.format(Locale.getDefault(), "%,.0f", c.outstandingBalance)}",
                                            style = MaterialTheme.typography.titleMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = if (c.outstandingBalance > 0) BrandWarning else BrandSuccess
                                            )
                                        )
                                        Text(
                                            if (c.outstandingBalance > 0) "Pending" else "Clean",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                color = if (c.outstandingBalance > 0) BrandWarning else BrandSuccess
                                            )
                                        )
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

    // Add Customer Sheet
    if (showAddModal) {
        ModalBottomSheet(onDismissRequest = { showAddModal = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                Text("Add New Customer / Party", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    label = { Text("Customer Name *") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = newMobile,
                    onValueChange = { newMobile = it },
                    label = { Text("Mobile Number") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = newGstin,
                    onValueChange = { newGstin = it },
                    label = { Text("GSTIN (Optional)") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        if (newName.isNotBlank()) {
                            viewModel.createCustomer(
                                CreateCustomerRequest(
                                    name = newName.trim(),
                                    mobile = newMobile.ifBlank { null },
                                    gstin = newGstin.ifBlank { null }
                                )
                            ) {
                                showAddModal = false
                                newName = ""
                                newMobile = ""
                                newGstin = ""
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandAccent),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Save Customer")
                }
            }
        }
    }
}
