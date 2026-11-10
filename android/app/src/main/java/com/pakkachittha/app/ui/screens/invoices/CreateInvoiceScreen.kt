package com.pakkachittha.app.ui.screens.invoices

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.data.model.CreateInvoiceItemRequest
import com.pakkachittha.app.data.model.CreateInvoiceRequest
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.InvoiceViewModel
import java.text.SimpleDateFormat
import java.util.*

data class EditableInvoiceItem(
    var description: String = "",
    var quantity: String = "1",
    var unitPrice: String = "",
    var gstRate: String = "18"
)

@Composable
fun CreateInvoiceScreen(
    viewModel: InvoiceViewModel,
    onNavigateBack: () -> Unit,
    onInvoiceCreated: () -> Unit
) {
    val nextNumber by viewModel.nextNumber.collectAsState()

    var customerName by remember { mutableStateOf("") }
    var customerMobile by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    val items = remember {
        mutableStateListOf(EditableInvoiceItem(description = "General Supplies", quantity = "1", unitPrice = "", gstRate = "18"))
    }

    LaunchedEffect(Unit) {
        viewModel.loadNextInvoiceNumber()
    }

    // Calculations
    val subtotal = items.sumOf {
        val q = it.quantity.toDoubleOrNull() ?: 0.0
        val p = it.unitPrice.toDoubleOrNull() ?: 0.0
        q * p
    }

    val taxTotal = items.sumOf {
        val q = it.quantity.toDoubleOrNull() ?: 0.0
        val p = it.unitPrice.toDoubleOrNull() ?: 0.0
        val g = it.gstRate.toDoubleOrNull() ?: 0.0
        (q * p * g) / 100.0
    }

    val grandTotal = subtotal + taxTotal

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "New GST Sale Bill",
                subtitle = nextNumber,
                canGoBack = true,
                onNavigationClick = onNavigateBack
            )
        },
        containerColor = BackgroundLight,
        bottomBar = {
            Surface(
                color = SurfaceCard,
                tonalElevation = 8.dp,
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Grand Total",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )
                        Text(
                            text = "₹${String.format(Locale.getDefault(), "%,.2f", grandTotal)}",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Black,
                                color = BrandPrimary
                            )
                        )
                    }

                    Button(
                        onClick = {
                            isSaving = true
                            val currentDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                            val validItems = items.map {
                                CreateInvoiceItemRequest(
                                    description = it.description.ifBlank { "Item" },
                                    quantity = it.quantity.toDoubleOrNull() ?: 1.0,
                                    unitPrice = it.unitPrice.toDoubleOrNull() ?: 0.0,
                                    gstRate = it.gstRate.toDoubleOrNull() ?: 0.0
                                )
                            }
                            val req = CreateInvoiceRequest(
                                customerName = customerName.ifBlank { "Counter Sale" },
                                customerMobile = customerMobile.ifBlank { null },
                                invoiceDate = currentDate,
                                items = validItems,
                                notes = notes.ifBlank { null }
                            )
                            viewModel.createInvoice(req) { success ->
                                isSaving = false
                                if (success) {
                                    onInvoiceCreated()
                                }
                            }
                        },
                        enabled = grandTotal > 0 && !isSaving,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandAccent, contentColor = TextWhite),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.height(48.dp)
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(color = TextWhite, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Generate Bill", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Party Info Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "PARTY / CUSTOMER DETAILS",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = BrandPrimary)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = customerName,
                            onValueChange = { customerName = it },
                            label = { Text("Customer Name / Business") },
                            placeholder = { Text("e.g. Ramesh Kumar or Balaji Hardware") },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = customerMobile,
                            onValueChange = { customerMobile = it },
                            label = { Text("Mobile Number (Optional for WhatsApp)") },
                            placeholder = { Text("e.g. 9876543210") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // Line Items Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ITEMS & BILLING ENTRIES",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = TextSecondary)
                    )

                    TextButton(onClick = {
                        items.add(EditableInvoiceItem())
                    }) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = BrandAccent, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+ Add Item", color = BrandAccent, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Line Items
            itemsIndexed(items) { index, item ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = "Item #${index + 1}", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, color = BrandPrimary))

                            if (items.size > 1) {
                                IconButton(onClick = { items.removeAt(index) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = BrandDanger, modifier = Modifier.size(18.dp))
                                }
                            }
                        }

                        OutlinedTextField(
                            value = item.description,
                            onValueChange = { item.description = it },
                            label = { Text("Item Description") },
                            placeholder = { Text("e.g. Cement Bag 50kg") },
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = item.quantity,
                                onValueChange = { item.quantity = it },
                                label = { Text("Qty") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )

                            OutlinedTextField(
                                value = item.unitPrice,
                                onValueChange = { item.unitPrice = it },
                                label = { Text("Rate (₹)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1.5f)
                            )

                            OutlinedTextField(
                                value = item.gstRate,
                                onValueChange = { item.gstRate = it },
                                label = { Text("GST %") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Bill Summary
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal", style = MaterialTheme.typography.bodyMedium)
                            Text("₹${String.format(Locale.getDefault(), "%,.2f", subtotal)}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("GST Total (CGST + SGST)", style = MaterialTheme.typography.bodyMedium)
                            Text("₹${String.format(Locale.getDefault(), "%,.2f", taxTotal)}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, color = BrandAccent))
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total Payable", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                            Text("₹${String.format(Locale.getDefault(), "%,.2f", grandTotal)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black, color = BrandPrimary))
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}
