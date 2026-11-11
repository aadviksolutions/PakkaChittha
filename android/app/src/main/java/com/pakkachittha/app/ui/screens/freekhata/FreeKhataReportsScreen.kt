package com.pakkachittha.app.ui.screens.freekhata

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.FreeKhataViewModel
import com.pakkachittha.app.ui.viewmodel.KhataPersonReportUiState
import com.pakkachittha.app.ui.viewmodel.KhataReportUiState
import java.io.File
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FreeKhataReportsScreen(
    viewModel: FreeKhataViewModel,
    onNavigateBack: () -> Unit,
    isHindi: Boolean = false
) {
    val reportState by viewModel.reportState.collectAsState()
    val personState by viewModel.personReportState.collectAsState()
    val context = LocalContext.current

    var dateRange by remember { mutableStateOf("ALL") }
    var startDate by remember { mutableStateOf("") }
    var endDate by remember { mutableStateOf("") }
    var searchQuery by remember { mutableStateOf("") }
    var directionFilter by remember { mutableStateOf("ALL") }
    var modeFilter by remember { mutableStateOf("ALL") }
    var statusFilter by remember { mutableStateOf("OUTSTANDING") }

    var selectedPartyId by remember { mutableStateOf<String?>(null) }
    var isExporting by remember { mutableStateOf(false) }

    fun refreshReport() {
        if (dateRange == "CUSTOM" && startDate.isBlank() && endDate.isBlank()) return
        viewModel.loadReport(
            dateRange = dateRange,
            startDate = startDate.takeIf { dateRange == "CUSTOM" && it.isNotBlank() },
            endDate = endDate.takeIf { dateRange == "CUSTOM" && it.isNotBlank() },
            search = searchQuery.takeIf { it.isNotBlank() },
            direction = directionFilter,
            paymentMode = modeFilter,
            accountStatus = statusFilter
        )
    }

    LaunchedEffect(dateRange, directionFilter, modeFilter, statusFilter) {
        refreshReport()
    }

    fun openFileExternally(file: File, mimeType: String, chooserTitle: String, shareMode: Boolean) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = if (shareMode) {
            Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        } else {
            Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        }
        try {
            context.startActivity(Intent.createChooser(intent, chooserTitle))
        } catch (_: Exception) {
            Toast.makeText(context, "Saved at: ${file.name}", Toast.LENGTH_LONG).show()
        }
    }

    fun triggerExport(format: String, shareAfterDownload: Boolean, contactId: String? = null) {
        if (isExporting) return
        isExporting = true
        val mime = if (format == "xlsx") {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        } else {
            "application/pdf"
        }
        viewModel.exportReportFile(
            context = context,
            format = format,
            contactId = contactId,
            dateRange = dateRange,
            startDate = startDate.takeIf { dateRange == "CUSTOM" && it.isNotBlank() },
            endDate = endDate.takeIf { dateRange == "CUSTOM" && it.isNotBlank() },
            search = if (contactId == null) searchQuery else null,
            direction = if (contactId == null) directionFilter else "ALL",
            paymentMode = modeFilter,
            accountStatus = if (contactId == null) statusFilter else "ALL"
        ) { result ->
            isExporting = false
            result.fold(
                onSuccess = { file ->
                    openFileExternally(
                        file = file,
                        mimeType = mime,
                        chooserTitle = if (shareAfterDownload) "Share Report" else "Open Statement",
                        shareMode = shareAfterDownload
                    )
                },
                onFailure = { e ->
                    Toast.makeText(context, e.message ?: "Export failed", Toast.LENGTH_LONG).show()
                }
            )
        }
    }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = if (isHindi) "खाता रिपोर्ट (PDF / Excel)" else "Khata Reports & Export",
                subtitle = if (isHindi) "लेना-देना पूरा हिसाब एक पेज पर" else "Consolidated Receivable & Payable Statement",
                canGoBack = true,
                onNavigationClick = onNavigateBack,
                actions = {
                    IconButton(onClick = { refreshReport() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TextWhite)
                    }
                }
            )
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Export & Share Action Ribbon
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceCard)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { triggerExport("xlsx", shareAfterDownload = false) },
                    enabled = !isExporting,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                ) {
                    Icon(Icons.Default.TableChart, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Excel (.xlsx)", fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }

                Button(
                    onClick = { triggerExport("pdf", shareAfterDownload = false) },
                    enabled = !isExporting,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                ) {
                    Icon(Icons.Default.PictureAsPdf, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("PDF Statement", fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }

                FilledTonalButton(
                    onClick = { triggerExport("pdf", shareAfterDownload = true) },
                    enabled = !isExporting,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
                ) {
                    Icon(Icons.Default.Share, contentDescription = "Share PDF", modifier = Modifier.size(16.dp))
                }
            }

            if (isExporting) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = BrandAccent
                )
            }

            // Date Presets + Search & Filter Controls
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceSubtle)
                    .border(width = 1.dp, color = BorderSubtle)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val presets = listOf(
                    "ALL" to "All Time",
                    "TODAY" to "Today",
                    "THIS_WEEK" to "Week",
                    "THIS_MONTH" to "Month",
                    "THIS_YEAR" to "Year",
                    "CUSTOM" to "Custom"
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    presets.forEach { (key, label) ->
                        FilterChip(
                            selected = dateRange == key,
                            onClick = { dateRange = key },
                            label = { Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) }
                        )
                    }
                }

                if (dateRange == "CUSTOM") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = startDate,
                            onValueChange = { startDate = it },
                            label = { Text("From YYYY-MM-DD", fontSize = 10.sp) },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = endDate,
                            onValueChange = { endDate = it },
                            label = { Text("To YYYY-MM-DD", fontSize = 10.sp) },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = { refreshReport() },
                            modifier = Modifier.align(Alignment.CenterVertically)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "Apply dates", tint = BrandPrimary)
                        }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search person or mobile...", fontSize = 12.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        trailingIcon = {
                            IconButton(onClick = { refreshReport() }) {
                                Icon(Icons.Default.Search, contentDescription = "Search")
                            }
                        }
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("ALL" to "All Dir", "TO_RECEIVE" to "To Receive", "TO_PAY" to "To Pay").forEach { (k, lbl) ->
                        FilterChip(
                            selected = directionFilter == k,
                            onClick = { directionFilter = k },
                            label = { Text(lbl, fontSize = 11.sp) }
                        )
                    }
                    listOf("OUTSTANDING" to "Outstanding", "SETTLED" to "Settled", "ALL" to "Both").forEach { (k, lbl) ->
                        FilterChip(
                            selected = statusFilter == k,
                            onClick = { statusFilter = k },
                            label = { Text(lbl, fontSize = 11.sp) }
                        )
                    }
                    listOf("ALL" to "All Modes", "CASH" to "Cash", "UPI" to "UPI", "BANK_TRANSFER" to "Bank", "CHEQUE" to "Cheque").forEach { (k, lbl) ->
                        FilterChip(
                            selected = modeFilter == k,
                            onClick = { modeFilter = k },
                            label = { Text(lbl, fontSize = 11.sp) }
                        )
                    }
                }
            }

            when (val state = reportState) {
                is KhataReportUiState.Loading, KhataReportUiState.Idle -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandPrimary)
                    }
                }
                is KhataReportUiState.Error -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(state.message, color = BrandDanger, fontWeight = FontWeight.Bold)
                            Button(onClick = { refreshReport() }) { Text("Retry") }
                        }
                    }
                }
                is KhataReportUiState.Success -> {
                    val report = state.report
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 4 Summary Cards Grid
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ReportSummaryCard(
                                        modifier = Modifier.weight(1f),
                                        title = "Total to Receive\nकुल मिलने वाली रकम",
                                        value = formatInrAndroid(report.summary.totalAmountToReceive),
                                        subtitle = "${report.summary.receivableAccountCount} Accounts",
                                        bg = BrandSuccessLight,
                                        accent = BrandSuccess
                                    )
                                    ReportSummaryCard(
                                        modifier = Modifier.weight(1f),
                                        title = "Total to Pay\nकुल देने वाली रकम",
                                        value = formatInrAndroid(report.summary.totalAmountToPay),
                                        subtitle = "${report.summary.payableAccountCount} Accounts",
                                        bg = BrandDangerLight,
                                        accent = BrandDanger
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ReportSummaryCard(
                                        modifier = Modifier.weight(1f),
                                        title = "Net Position\nमेरी वर्तमान स्थिति",
                                        value = formatInrAndroid(report.summary.netPosition, showSign = true),
                                        subtitle = report.summary.netPositionLabel,
                                        bg = SurfaceCard,
                                        accent = if (report.summary.netPosition >= 0) BrandSuccess else BrandDanger
                                    )
                                    ReportSummaryCard(
                                        modifier = Modifier.weight(1f),
                                        title = "Active Accounts\nकुल सक्रिय हिसाब",
                                        value = "${report.summary.totalActiveAccounts}",
                                        subtitle = "${report.summary.settledAccountCount} Settled",
                                        bg = SurfaceCard,
                                        accent = BrandPrimary
                                    )
                                }
                            }
                        }

                        // WhatsApp / Text Share Card
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SurfaceCard)
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        val waUrl = "https://wa.me/?text=${Uri.encode(state.shareText)}"
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(waUrl)))
                                    },
                                    modifier = Modifier.weight(1f),
                                    contentPadding = PaddingValues(6.dp)
                                ) {
                                    Text("WhatsApp Text", fontSize = 11.sp, color = BrandSuccess, fontWeight = FontWeight.Bold)
                                }
                                OutlinedButton(
                                    onClick = {
                                        val mail = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:")).apply {
                                            putExtra(Intent.EXTRA_SUBJECT, state.shareSubject)
                                            putExtra(Intent.EXTRA_TEXT, state.shareText)
                                        }
                                        try { context.startActivity(mail) } catch (_: Exception) {}
                                    },
                                    modifier = Modifier.weight(1f),
                                    contentPadding = PaddingValues(6.dp)
                                ) {
                                    Text("Email", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                                OutlinedButton(
                                    onClick = {
                                        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        cm.setPrimaryClip(ClipData.newPlainText("Khata Report", state.shareText))
                                        Toast.makeText(context, "Report summary copied", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.weight(1f),
                                    contentPadding = PaddingValues(6.dp)
                                ) {
                                    Text("Copy", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        // Period vs Historical Distinction Banner
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = "Period: ${report.filters.periodLabel}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = BrandPrimary
                                    )
                                    Text(
                                        text = "Period Activity (${report.periodSummary.transactionCount} tx): Given ${formatInrAndroid(report.periodSummary.totalGivenInPeriod)} | Recv Back ${formatInrAndroid(report.periodSummary.totalReceivedBackInPeriod)} | Taken ${formatInrAndroid(report.periodSummary.totalTakenInPeriod)} | Returned ${formatInrAndroid(report.periodSummary.totalReturnedInPeriod)}",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                    Text(
                                        text = "Live balances above reflect full ledger history (never date-truncated).",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                            }
                        }

                        // SECTION A: Amount to Receive
                        item {
                            Text(
                                text = "A. Amount to Receive – किससे रकम लेनी है (${report.amountToReceiveRows.size})",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp,
                                color = BrandSuccess
                            )
                        }
                        if (report.amountToReceiveRows.isEmpty()) {
                            item {
                                Text("No outstanding receivable accounts.", fontSize = 12.sp, color = TextSecondary)
                            }
                        } else {
                            items(report.amountToReceiveRows, key = { "rec-${it.contactId}" }) { row ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            selectedPartyId = row.contactId
                                            viewModel.loadPersonReport(row.contactId, dateRange, startDate.takeIf { dateRange == "CUSTOM" }, endDate.takeIf { dateRange == "CUSTOM" }, modeFilter)
                                        },
                                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("${row.sNo}. ${row.personName}", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                            Text("Mob: ${row.mobileNumber}", fontSize = 11.sp, color = TextSecondary)
                                            Text(
                                                "Given ${formatInrAndroid(row.totalAmountGiven)} | Recv Back ${formatInrAndroid(row.amountReceivedBack)}",
                                                fontSize = 11.sp,
                                                color = TextSecondary
                                            )
                                            if (row.hasPayableAlso) {
                                                Text(
                                                    "Separate Payable: ${formatInrAndroid(row.currentPayableBalance)}",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = BrandWarning
                                                )
                                            }
                                        }
                                        Text(
                                            formatInrAndroid(row.balanceToReceive),
                                            fontWeight = FontWeight.Black,
                                            fontSize = 15.sp,
                                            color = BrandSuccess
                                        )
                                    }
                                }
                            }
                        }

                        // SECTION B: Amount to Pay
                        item {
                            Text(
                                text = "B. Amount to Pay – किसको रकम देनी है (${report.amountToPayRows.size})",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp,
                                color = BrandDanger,
                                modifier = Modifier.padding(top = 6.dp)
                            )
                        }
                        if (report.amountToPayRows.isEmpty()) {
                            item {
                                Text("No outstanding payable accounts.", fontSize = 12.sp, color = TextSecondary)
                            }
                        } else {
                            items(report.amountToPayRows, key = { "pay-${it.contactId}" }) { row ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            selectedPartyId = row.contactId
                                            viewModel.loadPersonReport(row.contactId, dateRange, startDate.takeIf { dateRange == "CUSTOM" }, endDate.takeIf { dateRange == "CUSTOM" }, modeFilter)
                                        },
                                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("${row.sNo}. ${row.personName}", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                            Text("Mob: ${row.mobileNumber}", fontSize = 11.sp, color = TextSecondary)
                                            Text(
                                                "Taken ${formatInrAndroid(row.totalAmountTaken)} | Returned ${formatInrAndroid(row.amountReturned)}",
                                                fontSize = 11.sp,
                                                color = TextSecondary
                                            )
                                            if (row.hasReceivableAlso) {
                                                Text(
                                                    "Separate Receivable: ${formatInrAndroid(row.currentReceivableBalance)}",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = BrandSuccess
                                                )
                                            }
                                        }
                                        Text(
                                            formatInrAndroid(row.balanceToPay),
                                            fontWeight = FontWeight.Black,
                                            fontSize = 15.sp,
                                            color = BrandDanger
                                        )
                                    }
                                }
                            }
                        }

                        // Transaction Details
                        item {
                            Text(
                                text = "C. Transaction History (${report.transactions.size})",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp,
                                color = BrandPrimary,
                                modifier = Modifier.padding(top = 6.dp)
                            )
                        }
                        items(report.transactions.take(100), key = { "tx-${it.id}" }) { tx ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(tx.personName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                                        Text(
                                            "${tx.activityLabel} • ${tx.paymentModeLabel} • ${formatIstShort(tx.date)}",
                                            fontSize = 10.5.sp,
                                            color = TextSecondary
                                        )
                                        if (!tx.notes.isNullOrBlank()) {
                                            Text(tx.notes, fontSize = 10.sp, color = TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        }
                                        Text(
                                            "Prev: ${formatInrAndroid(tx.previousBalance)} -> New: ${formatInrAndroid(tx.updatedBalance)}",
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = BrandPrimary
                                        )
                                    }
                                    Text(
                                        text = "${if (tx.moneyDirection == "IN") "+" else "-"}${formatInrAndroid(tx.amount)}",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        color = if (tx.moneyDirection == "IN") BrandSuccess else BrandDanger
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Person-wise Detailed Ledger Bottom Sheet
    if (selectedPartyId != null) {
        ModalBottomSheet(
            onDismissRequest = {
                selectedPartyId = null
                viewModel.clearPersonReport()
            },
            containerColor = SurfaceCard
        ) {
            when (val pState = personState) {
                is KhataPersonReportUiState.Loading, KhataPersonReportUiState.Idle -> {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandPrimary)
                    }
                }
                is KhataPersonReportUiState.Error -> {
                    Text(pState.message, color = BrandDanger, modifier = Modifier.padding(24.dp))
                }
                is KhataPersonReportUiState.Success -> {
                    val pr = pState.report
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(pr.contact.name, fontWeight = FontWeight.Black, fontSize = 18.sp, color = BrandPrimary)
                        Text("Mobile: ${pr.contact.phone ?: "—"} | ${pr.summary.statusLabel}", fontSize = 12.sp, color = TextSecondary)
                        Text(
                            "To Receive: ${formatInrAndroid(pr.summary.amountToReceive)} | To Pay: ${formatInrAndroid(pr.summary.amountToPay)} | Net: ${formatInrAndroid(pr.summary.netPosition, true)}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = BrandPrimary
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { triggerExport("pdf", shareAfterDownload = false, contactId = pr.contact.id) },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                            ) {
                                Text("Party PDF", fontSize = 12.sp)
                            }
                            Button(
                                onClick = { triggerExport("xlsx", shareAfterDownload = false, contactId = pr.contact.id) },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess)
                            ) {
                                Text("Party Excel", fontSize = 12.sp)
                            }
                            OutlinedButton(
                                onClick = { triggerExport("pdf", shareAfterDownload = true, contactId = pr.contact.id) }
                            ) {
                                Text("Share", fontSize = 12.sp)
                            }
                        }
                        LazyColumn(
                            modifier = Modifier.heightIn(max = 320.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(pr.transactions, key = { "ptx-${it.id}" }) { tx ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(SurfaceSubtle)
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${tx.activityLabel} (${tx.paymentModeLabel})", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text(formatIstShort(tx.date), fontSize = 10.sp, color = TextSecondary)
                                        Text(
                                            "Prev: ${formatInrAndroid(tx.previousBalance)} -> New: ${formatInrAndroid(tx.updatedBalance)}",
                                            fontSize = 10.5.sp,
                                            color = BrandPrimary
                                        )
                                    }
                                    Text(
                                        "${if (tx.moneyDirection == "IN") "+" else "-"}${formatInrAndroid(tx.amount)}",
                                        fontWeight = FontWeight.Bold,
                                        color = if (tx.moneyDirection == "IN") BrandSuccess else BrandDanger
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportSummaryCard(
    modifier: Modifier,
    title: String,
    value: String,
    subtitle: String,
    bg: Color,
    accent: Color
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
            .padding(12.dp)
    ) {
        Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, lineHeight = 14.sp)
        Spacer(Modifier.height(4.dp))
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.Black, color = accent, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(subtitle, fontSize = 10.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

private fun formatInrAndroid(amount: Double, showSign: Boolean = false): String {
    val formatter = NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }
    val formatted = formatter.format(kotlin.math.abs(amount))
    return when {
        amount < 0 -> "-₹$formatted"
        showSign && amount > 0 -> "+₹$formatted"
        else -> "₹$formatted"
    }
}

private fun formatIstShort(iso: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val d = parser.parse(iso.take(19)) ?: return iso.take(16)
        SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale("en", "IN")).apply {
            timeZone = TimeZone.getTimeZone("Asia/Kolkata")
        }.format(d)
    } catch (_: Exception) {
        iso.take(16)
    }
}

