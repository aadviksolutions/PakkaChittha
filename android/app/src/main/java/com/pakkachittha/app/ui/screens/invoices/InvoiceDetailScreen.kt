package com.pakkachittha.app.ui.screens.invoices

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.ui.components.InvoiceStatusBadge
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.InvoiceViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailScreen(
    invoiceId: String,
    viewModel: InvoiceViewModel,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val invoice by viewModel.selectedInvoice.collectAsState()

    var showPaymentSheet by remember { mutableStateOf(false) }
    var paymentAmount by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf("CASH") }

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetail(invoiceId)
    }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = invoice?.invoiceNumber ?: "Invoice Details",
                subtitle = invoice?.status,
                canGoBack = true,
                onNavigationClick = onNavigateBack
            )
        },
        containerColor = BackgroundLight,
        bottomBar = {
            if (invoice != null && (invoice!!.balanceDue > 0 && invoice!!.status != "CANCELLED")) {
                Surface(
                    color = SurfaceCard,
                    tonalElevation = 8.dp,
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = {
                                paymentAmount = invoice!!.balanceDue.toString()
                                showPaymentSheet = true
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Icon(Icons.Default.Payment, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Record Payment", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                val text = "Namaste ${invoice?.customerName ?: "Sir"}, your bill ${invoice?.invoiceNumber} for ₹${invoice?.total} has a balance due of ₹${invoice?.balanceDue}. Kindly settle at your earliest. Thank you - Pakka Chittha"
                                val sendIntent = Intent(Intent.ACTION_VIEW).apply {
                                    val mobile = invoice?.customerMobile?.replace("+", "")?.trim() ?: ""
                                    data = Uri.parse("https://api.whatsapp.com/send?phone=$mobile&text=${Uri.encode(text)}")
                                }
                                context.startActivity(sendIntent)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandAccent),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("WhatsApp", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        if (invoice == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandAccent)
            }
        } else {
            val inv = invoice!!

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = inv.invoiceNumber,
                                        style = MaterialTheme.typography.headlineSmall.copy(
                                            fontWeight = FontWeight.Black,
                                            color = BrandPrimary
                                        )
                                    )
                                    Text(
                                        text = "Date: ${inv.invoiceDate.take(10)}",
                                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                                    )
                                }
                                InvoiceStatusBadge(status = inv.status)
                            }

                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                            Text(text = "CUSTOMER / PARTY", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                            Text(
                                text = inv.customerName ?: "Retail Customer",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = TextPrimary)
                            )
                            if (inv.customerMobile != null) {
                                Text(text = "Mobile: ${inv.customerMobile}", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                            }
                        }
                    }
                }

                // Financial Overview Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total Invoiced Amount", style = MaterialTheme.typography.bodyMedium)
                                Text("₹${String.format(Locale.getDefault(), "%,.2f", inv.total)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Paid Amount", style = MaterialTheme.typography.bodyMedium)
                                Text("₹${String.format(Locale.getDefault(), "%,.2f", inv.paidAmount)}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, color = BrandSuccess))
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Balance Due (Udhaar)", style = MaterialTheme.typography.bodyMedium)
                                Text("₹${String.format(Locale.getDefault(), "%,.2f", inv.balanceDue)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black, color = if (inv.balanceDue > 0) BrandWarning else BrandSuccess))
                            }
                        }
                    }
                }

                // Line Items
                item {
                    Text(text = "BILLED ITEMS", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary, fontWeight = FontWeight.Bold))
                }

                items(inv.items) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = item.description, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                                Text(
                                    text = "${item.quantity} Qty @ ₹${item.unitPrice} + ${item.gstRate}% GST",
                                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                                )
                            }
                            Text(
                                text = "₹${String.format(Locale.getDefault(), "%,.2f", item.total)}",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }

    // Record Payment Bottom Sheet
    if (showPaymentSheet) {
        ModalBottomSheet(onDismissRequest = { showPaymentSheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                Text(text = "Record Payment Receipt", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = paymentAmount,
                    onValueChange = { paymentAmount = it },
                    label = { Text("Amount Received (₹)") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("CASH", "UPI", "BANK").forEach { method ->
                        FilterChip(
                            selected = paymentMethod == method,
                            onClick = { paymentMethod = method },
                            label = { Text(method) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        val amt = paymentAmount.toDoubleOrNull() ?: 0.0
                        if (amt > 0) {
                            viewModel.recordPayment(invoiceId, amt, paymentMethod) {
                                showPaymentSheet = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Confirm Receipt")
                }
            }
        }
    }
}
