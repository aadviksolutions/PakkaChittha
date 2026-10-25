package com.lenden.app.ui.customers

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.data.remote.dto.CustomerDto
import com.lenden.app.ui.components.LendenButton
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTextField
import com.lenden.app.ui.components.LendenTopAppBar
import com.lenden.app.ui.theme.*
import com.lenden.app.util.WhatsAppHelper
import java.text.NumberFormat
import java.util.Locale

@Composable
fun CustomersScreen(
    viewModel: CustomersViewModel,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showAddCustomerDialog by remember { mutableStateOf(false) }

    val inrFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
            maximumFractionDigits = 2
        }
    }

    Scaffold(
        topBar = {
            LendenTopAppBar(
                title = "Udhaar Khata & Customers",
                subtitle = "Customer ledgers & payment recovery",
                showBackButton = true,
                onBackClick = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadCustomers() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddCustomerDialog = true },
                containerColor = EmeraldPrimary,
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = "Add Customer") },
                text = { Text("Add Customer", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(BackgroundPrimary)
        ) {
            // Total Outstanding Udhaar Banner
            Surface(
                color = AmberWarning.copy(alpha = 0.12f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "TOTAL UDHAAR OUTSTANDING",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextSecondary,
                                letterSpacing = 0.5.sp
                            )
                        )
                        Text(
                            text = inrFormat.format(state.totalOutstandingUdhaar),
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Black,
                                color = AmberWarning
                            )
                        )
                    }
                    Text(
                        text = "${state.customers.count { it.totalOutstanding > 0 }} Debtors",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold)
                    )
                }
            }

            // Search Bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Search customer by name or phone") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextTertiary) },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = !state.onlyPendingUdhaar,
                    onClick = { viewModel.setFilterOnlyPending(false) },
                    label = { Text("All Customers") }
                )
                FilterChip(
                    selected = state.onlyPendingUdhaar,
                    onClick = { viewModel.setFilterOnlyPending(true) },
                    label = { Text("Pending Udhaar Only") }
                )
            }

            if (state.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = EmeraldPrimary)
            }

            val displayedCustomers = state.customers.filter { cust ->
                if (state.onlyPendingUdhaar) cust.totalOutstanding > 0 else true
            }

            if (displayedCustomers.isEmpty() && !state.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No customers found",
                        style = MaterialTheme.typography.titleMedium.copy(color = TextSecondary)
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(displayedCustomers, key = { it.id }) { customer ->
                        CustomerKhataCard(
                            customer = customer,
                            inrFormat = inrFormat,
                            onSendReminder = {
                                val message = WhatsAppHelper.buildKhataReminderMessage(
                                    businessName = "Lenden Store",
                                    customerName = customer.name,
                                    balanceDue = customer.totalOutstanding
                                )
                                WhatsAppHelper.openWhatsAppChat(context, customer.mobile, message)
                            }
                        )
                    }
                }
            }
        }
    }

    if (showAddCustomerDialog) {
        AddCustomerDialog(
            viewModel = viewModel,
            onDismiss = { showAddCustomerDialog = false }
        )
    }
}

@Composable
private fun CustomerKhataCard(
    customer: CustomerDto,
    inrFormat: NumberFormat,
    onSendReminder: () -> Unit
) {
    LendenCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = customer.name,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                )
                Text(
                    text = "Phone: ${customer.mobile}",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                )
                if (!customer.gstin.isNullOrBlank()) {
                    Text(
                        text = "GSTIN: ${customer.gstin}",
                        style = MaterialTheme.typography.labelSmall.copy(color = TextTertiary)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                if (customer.totalOutstanding > 0) {
                    Text(
                        text = inrFormat.format(customer.totalOutstanding),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Black,
                            color = RoseError
                        )
                    )
                    Text(
                        text = "Udhaar Due",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = RoseError,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    )
                } else {
                    Text(
                        text = "Settled",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = EmeraldPrimary
                        )
                    )
                }
            }
        }

        if (customer.totalOutstanding > 0) {
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                onClick = onSendReminder,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp),
                shape = RoundedCornerShape(6.dp),
                border = BorderStroke(1.dp, EmeraldPrimary),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = EmeraldPrimary)
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Send WhatsApp Payment Reminder",
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                )
            }
        }
    }
}

@Composable
private fun AddCustomerDialog(
    viewModel: CustomersViewModel,
    onDismiss: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    var name by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var openingBalance by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = {
            viewModel.clearGstLookupState()
            onDismiss()
        },
        title = { Text("Add New Customer", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // GSTIN Section with Fetch Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        LendenTextField(
                            value = gstin,
                            onValueChange = { gstin = it.uppercase() },
                            label = "GSTIN (Optional)"
                        )
                    }
                    Button(
                        onClick = {
                            viewModel.lookupGstin(gstin) { details ->
                                if (details != null) {
                                    if (name.isBlank()) {
                                        name = details.tradeName.ifBlank { details.legalName }
                                    }
                                }
                            }
                        },
                        enabled = gstin.trim().length == 15 && !state.isLookingUpGst,
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                        modifier = Modifier.padding(top = 8.dp)
                    ) {
                        if (state.isLookingUpGst) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Fetch", fontSize = 12.sp)
                        }
                    }
                }

                if (state.gstLookupError != null) {
                    Text(
                        text = state.gstLookupError!!,
                        color = RoseError,
                        fontSize = 11.sp
                    )
                }

                if (state.lastFetchedGstDetails != null) {
                    val details = state.lastFetchedGstDetails!!
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceWarm),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = details.tradeName.ifBlank { details.legalName },
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = TextPrimary
                                )
                                Text(
                                    text = details.status,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp,
                                    color = if (details.status == "ACTIVE") EmeraldPrimary else RoseError
                                )
                            }
                            if (details.address.isNotBlank()) {
                                Text(
                                    text = details.address,
                                    fontSize = 10.sp,
                                    color = TextSecondary,
                                    maxLines = 2
                                )
                            }
                        }
                    }
                }

                LendenTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Customer Name *"
                )
                LendenTextField(
                    value = mobile,
                    onValueChange = { mobile = it },
                    label = "Mobile Number *",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                )
                LendenTextField(
                    value = openingBalance,
                    onValueChange = { openingBalance = it },
                    label = "Opening Udhaar Balance (₹)",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val bal = openingBalance.toDoubleOrNull() ?: 0.0
                    viewModel.createCustomer(name, mobile, gstin, bal) {
                        viewModel.clearGstLookupState()
                        onDismiss()
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
            ) {
                Text("Save Customer")
            }
        },
        dismissButton = {
            TextButton(onClick = {
                viewModel.clearGstLookupState()
                onDismiss()
            }) { Text("Cancel") }
        }
    )
}
