package com.pakkachittha.app.ui.screens.dashboard

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.data.model.InvoiceDto
import com.pakkachittha.app.ui.components.*
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.InvoiceListUiState
import com.pakkachittha.app.ui.viewmodel.InvoiceViewModel
import java.util.Locale

@Composable
fun DashboardScreen(
    businessName: String?,
    userName: String?,
    invoiceViewModel: InvoiceViewModel,
    onOpenDrawer: () -> Unit,
    onNavigateToCreateInvoice: () -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToCustomers: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToFreeKhata: () -> Unit,
    onNavigateToInvoiceDetail: (String) -> Unit
) {
    val invoiceState by invoiceViewModel.listState.collectAsState()

    var todaySales by remember { mutableDoubleStateOf(0.0) }
    var totalCollected by remember { mutableDoubleStateOf(0.0) }
    var totalUdhaar by remember { mutableDoubleStateOf(0.0) }
    var totalBills by remember { mutableIntStateOf(0) }
    var recentInvoices by remember { mutableStateOf<List<InvoiceDto>>(emptyList()) }

    LaunchedEffect(invoiceState) {
        if (invoiceState is InvoiceListUiState.Success) {
            val list = (invoiceState as InvoiceListUiState.Success).invoices
            recentInvoices = list.take(5)
            totalBills = list.size
            todaySales = list.sumOf { it.total }
            totalCollected = list.sumOf { it.paidAmount }
            totalUdhaar = list.filter { it.status != "CANCELLED" }.sumOf { it.balanceDue }
        }
    }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = businessName ?: "Pakka Chittha",
                subtitle = "Workspace Active",
                onNavigationClick = onOpenDrawer,
                actions = {
                    IconButton(onClick = onNavigateToCreateInvoice) {
                        Icon(
                            imageVector = Icons.Default.AddCircle,
                            contentDescription = "New Bill",
                            tint = BrandAccent
                        )
                    }
                }
            )
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))

                // Welcome Greeting Card
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                                text = "Namaste, ${userName?.split(" ")?.firstOrNull() ?: "Vyapari"} 🙏",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Black,
                                    color = BrandPrimary
                                )
                            )
                            Text(
                                text = "Vyapaar Ka Pakka Dashboard",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            )
                        }

                        Surface(
                            color = BrandSuccessLight,
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                text = "LIVE READY",
                                color = BrandSuccess,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // 4 KPI Summary Cards (2x2 Grid)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            title = "Total Sales",
                            value = "₹${String.format(Locale.getDefault(), "%,.0f", todaySales)}",
                            subtitle = "Cumulative billing",
                            accentColor = BrandPrimary,
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "Collected",
                            value = "₹${String.format(Locale.getDefault(), "%,.0f", totalCollected)}",
                            subtitle = "Cash & UPI receipts",
                            accentColor = BrandSuccess,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            title = "Udhaar Balance",
                            value = "₹${String.format(Locale.getDefault(), "%,.0f", totalUdhaar)}",
                            subtitle = "Pending from parties",
                            accentColor = BrandWarning,
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "Total Bills",
                            value = "$totalBills",
                            subtitle = "Invoices in register",
                            accentColor = BrandAccent,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Quick Actions
            item {
                Text(
                    text = "QUICK ACTIONS",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = TextSecondary,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    ),
                    modifier = Modifier.padding(top = 8.dp)
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QuickActionButton(
                        title = "New Bill",
                        icon = Icons.Default.AddCircle,
                        containerColor = BrandAccent,
                        contentColor = TextWhite,
                        onClick = onNavigateToCreateInvoice,
                        modifier = Modifier.weight(1f)
                    )

                    QuickActionButton(
                        title = "Customer",
                        icon = Icons.Default.PersonAdd,
                        containerColor = BrandSecondary,
                        contentColor = TextWhite,
                        onClick = onNavigateToCustomers,
                        modifier = Modifier.weight(1f)
                    )

                    QuickActionButton(
                        title = "Personal Khata",
                        icon = Icons.Default.AccountBalanceWallet,
                        containerColor = BrandSuccess,
                        contentColor = TextWhite,
                        onClick = onNavigateToFreeKhata,
                        modifier = Modifier.weight(1f)
                    )

                    QuickActionButton(
                        title = "Inventory",
                        icon = Icons.Default.Inventory2,
                        containerColor = SurfaceCard,
                        contentColor = BrandPrimary,
                        onClick = onNavigateToInventory,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Recent Transactions Section Header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "RECENT BILLS & INVOICES",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = TextSecondary,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    )

                    TextButton(onClick = onNavigateToInvoices) {
                        Text(
                            text = "View All →",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = BrandAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            }

            // Recent Invoices List
            if (recentInvoices.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Receipt,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(40.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No invoices generated yet",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                            Text(
                                text = "Create your first bill to start tracking sales",
                                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                                modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                            )
                            Button(
                                onClick = onNavigateToCreateInvoice,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandAccent),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Generate Bill Now")
                            }
                        }
                    }
                }
            } else {
                items(recentInvoices) { inv ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateToInvoiceDetail(inv.id) },
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

                                Text(
                                    text = inv.customerName ?: "Retail Customer",
                                    style = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
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
                                        text = "Due: ₹${String.format(Locale.getDefault(), "%,.0f", inv.balanceDue)}",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = BrandWarning,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                } else {
                                    Text(
                                        text = "Settled",
                                        style = MaterialTheme.typography.bodySmall.copy(color = BrandSuccess)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun QuickActionButton(
    title: String,
    icon: ImageVector,
    containerColor: androidx.compose.ui.graphics.Color,
    contentColor: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .clickable(onClick = onClick)
            .height(72.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = contentColor,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = contentColor,
                    fontSize = 11.sp
                ),
                maxLines = 1
            )
        }
    }
}

@Composable
fun InvoiceStatusBadge(status: String) {
    val (color, bgColor) = when (status) {
        "PAID" -> BrandSuccess to BrandSuccessLight
        "PARTIAL" -> BrandWarning to BrandWarningLight
        "UNPAID", "OVERDUE" -> BrandDanger to BrandDangerLight
        else -> TextSecondary to BackgroundLight
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(6.dp)
    ) {
        Text(
            text = status,
            color = color,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}
