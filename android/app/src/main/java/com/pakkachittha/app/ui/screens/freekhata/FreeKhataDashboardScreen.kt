package com.pakkachittha.app.ui.screens.freekhata

import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.data.model.*
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.FreeKhataUiState
import com.pakkachittha.app.ui.viewmodel.FreeKhataViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FreeKhataDashboardScreen(
    viewModel: FreeKhataViewModel,
    onOpenDrawer: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // WhatsApp Reminder state
    var reminderContact by remember { mutableStateOf<KhataContactDto?>(null) }
    var reminderCustomMessage by remember { mutableStateOf("") }
    var showReminderDialog by remember { mutableStateOf(false) }

    fun launchWhatsApp(contact: KhataContactDto, customMsg: String) {
        val cleanPhone = (contact.phone ?: "").replace("[^0-9]".toRegex(), "")
        val targetPhone = if (cleanPhone.length == 10) "91$cleanPhone" else cleanPhone
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("https://wa.me/$targetPhone?text=${Uri.encode(customMsg)}")
            setPackage("com.whatsapp")
        }
        try {
            context.startActivity(intent)
        } catch (_: Exception) {
            val fallback = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$targetPhone?text=${Uri.encode(customMsg)}"))
            context.startActivity(fallback)
        }
    }

    // Form fields
    var personName by remember { mutableStateOf("") }
    var personPhone by remember { mutableStateOf("") }

    // Native Contact Picker Launcher
    val contactPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickContact()
    ) { uri ->
        if (uri != null) {
            try {
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) {
                        val nameIdx = it.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)
                        if (nameIdx >= 0) {
                            personName = it.getString(nameIdx) ?: ""
                        }
                        val idIdx = it.getColumnIndex(ContactsContract.Contacts._ID)
                        if (idIdx >= 0) {
                            val contactId = it.getString(idIdx)
                            val pCursor = context.contentResolver.query(
                                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                                null,
                                "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
                                arrayOf(contactId),
                                null
                            )
                            pCursor?.use { pc ->
                                if (pc.moveToFirst()) {
                                    val numIdx = pc.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                                    if (numIdx >= 0) {
                                        val rawNum = pc.getString(numIdx) ?: ""
                                        val cleanNum = rawNum.replace("[^0-9]".toRegex(), "")
                                        personPhone = if (cleanNum.length > 10) cleanNum.takeLast(10) else cleanNum
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // Modals
    var showTypePickerModal by remember { mutableStateOf(false) }
    var selectedPrimaryIntent by remember { mutableStateOf("GAVE") } // "GAVE" or "RECEIVED"
    var showEntryModal by remember { mutableStateOf(false) }
    var chosenSubtype by remember { mutableStateOf("GAVE_NEW") } // GAVE_NEW, BORROWED_REPAY, LENT_REPAY, RECEIVED_NEW

    var txAmount by remember { mutableStateOf("") }
    var txDate by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }
    var txPaymentMode by remember { mutableStateOf("CASH") }
    var txPaymentRef by remember { mutableStateOf("") }
    var txDescription by remember { mutableStateOf("") }
    var selectedContactId by remember { mutableStateOf<String?>(null) }

    // Active Tab in Screen
    var activeTab by remember { mutableIntStateOf(0) } // 0: Contacts, 1: History, 2: Modes
    var contactSearchQuery by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "Personal Khata",
                subtitle = "Har paise ka hisaab, bilkul aasaan.",
                onNavigationClick = onOpenDrawer
            )
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        when (val state = uiState) {
            is FreeKhataUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandAccent)
                }
            }
            is FreeKhataUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(text = state.message, color = BrandDanger, style = MaterialTheme.typography.bodyMedium)
                        Button(onClick = { viewModel.loadData() }) {
                            Text("पुनः प्रयास करें (Retry)")
                        }
                    }
                }
            }
            is FreeKhataUiState.Success -> {
                val data = state.data
                val kpis = data.kpis
                val contacts = data.contacts
                val recentTransactions = data.recentTransactions

                val filteredContacts = contacts.filter {
                    val q = contactSearchQuery.trim().lowercase()
                    q.isEmpty() || it.name.lowercase().contains(q) || (it.phone?.contains(q) == true)
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. THREE MAIN SUMMARY CARDS (Section 2)
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Row of Card 1 & Card 2
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // Card 1: कुल लेने वाली रकम (Receivable) - GREEN
                                Card(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSuccess)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text(
                                            "कुल लेने वाली रकम",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = Color.White.copy(alpha = 0.9f),
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            "₹${String.format(Locale.getDefault(), "%,.0f", kpis.amountToReceive)}",
                                            style = MaterialTheme.typography.titleLarge.copy(
                                                fontWeight = FontWeight.Black,
                                                color = Color.White
                                            )
                                        )
                                        Text(
                                            "लोगों से मिलने वाली बाकी",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                fontSize = 10.sp,
                                                color = Color.White.copy(alpha = 0.85f)
                                            )
                                        )
                                    }
                                }

                                // Card 2: कुल देने वाली रकम (Payable) - RED
                                Card(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandDanger)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text(
                                            "कुल देने वाली रकम",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = Color.White.copy(alpha = 0.9f),
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            "₹${String.format(Locale.getDefault(), "%,.0f", kpis.amountToPay)}",
                                            style = MaterialTheme.typography.titleLarge.copy(
                                                fontWeight = FontWeight.Black,
                                                color = Color.White
                                            )
                                        )
                                        Text(
                                            "लोगों को देने वाली बाकी",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                fontSize = 10.sp,
                                                color = Color.White.copy(alpha = 0.85f)
                                            )
                                        )
                                    }
                                }
                            }

                            // Card 3: मेरी वर्तमान स्थिति (Net Position)
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(18.dp),
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
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            "मेरी वर्तमान स्थिति (Net Position)",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = TextSecondary,
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "${if (kpis.netPosition > 0) "+ " else if (kpis.netPosition < 0) "- " else ""}₹${String.format(Locale.getDefault(), "%,.0f", kotlin.math.abs(kpis.netPosition))}",
                                            style = MaterialTheme.typography.headlineMedium.copy(
                                                fontWeight = FontWeight.Black,
                                                color = if (kpis.netPosition > 0) BrandSuccess else if (kpis.netPosition < 0) BrandDanger else TextPrimary
                                            )
                                        )
                                        Text(
                                            text = kpis.netPositionDescription ?: if (kpis.netPosition > 0) "आपको पैसे अधिक मिलने बाकी हैं" else if (kpis.netPosition < 0) "आपको पैसे अधिक देने बाकी हैं" else "हिसाब बराबर है",
                                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp, color = TextSecondary)
                                        )
                                    }

                                    Surface(
                                        color = if (kpis.netPosition > 0) BrandSuccessLight else if (kpis.netPosition < 0) BrandDangerLight else SurfaceSubtle,
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text(
                                            text = if (kpis.netPosition > 0) "+ लेने हैं" else if (kpis.netPosition < 0) "- देने हैं" else "बराबर",
                                            color = if (kpis.netPosition > 0) BrandSuccess else if (kpis.netPosition < 0) BrandDanger else TextSecondary,
                                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 2. HISTORICAL CUMULATIVE TOTALS BAR (Section 2)
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(
                                    "ऐतिहासिक कुल हिसाब (Cumulative Totals)",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = TextSecondary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp
                                    )
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("कुल दी गई रकम", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = TextSecondary))
                                        Text("₹${String.format(Locale.getDefault(), "%,.0f", kpis.totalGiven)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black))
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("कुल ली गई रकम", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = TextSecondary))
                                        Text("₹${String.format(Locale.getDefault(), "%,.0f", kpis.totalTaken)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black))
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("कुल वापस मिली", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = TextSecondary))
                                        Text("₹${String.format(Locale.getDefault(), "%,.0f", kpis.totalReceivedBack)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black, color = BrandSuccess))
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("कुल वापस की गई", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = TextSecondary))
                                        Text("₹${String.format(Locale.getDefault(), "%,.0f", kpis.totalReturned)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Black, color = BrandDanger))
                                    }
                                }
                            }
                        }
                    }

                    // 3. ONLY TWO PRIMARY TRANSACTION BUTTONS (Section 3)
                    item {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Button A: मैंने रकम दी
                            Button(
                                onClick = {
                                    selectedPrimaryIntent = "GAVE"
                                    showTypePickerModal = true
                                },
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandDanger),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(56.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("मैंने रकम दी", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = TextWhite))
                                    Text("पैसे मेरे पास से गए", style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp, color = TextWhite.copy(alpha = 0.85f)))
                                }
                            }

                            // Button B: मुझे रकम मिली
                            Button(
                                onClick = {
                                    selectedPrimaryIntent = "RECEIVED"
                                    showTypePickerModal = true
                                },
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(56.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("मुझे रकम मिली", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = TextWhite))
                                    Text("पैसे मेरे पास आए", style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp, color = TextWhite.copy(alpha = 0.85f)))
                                }
                            }
                        }
                    }

                    // 4. TAB CONTROLS
                    item {
                        TabRow(
                            selectedTabIndex = activeTab,
                            containerColor = Color.Transparent,
                            divider = {}
                        ) {
                            Tab(
                                selected = activeTab == 0,
                                onClick = { activeTab = 0 },
                                text = { Text("मेरे संपर्क (${contacts.size})", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                            )
                            Tab(
                                selected = activeTab == 1,
                                onClick = { activeTab = 1 },
                                text = { Text("पूरा रिकॉर्ड (${recentTransactions.size})", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                            )
                            Tab(
                                selected = activeTab == 2,
                                onClick = { activeTab = 2 },
                                text = { Text("माध्यम (Modes)", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                            )
                        }
                    }

                    // 5. TAB 0: CONTACTS LIST (मेरे संपर्क)
                    if (activeTab == 0) {
                        item {
                            OutlinedTextField(
                                value = contactSearchQuery,
                                onValueChange = { contactSearchQuery = it },
                                placeholder = { Text("नाम या मोबाइल से खोजें...", fontSize = 12.sp) },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = TextSecondary) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        if (filteredContacts.isEmpty()) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                    Text("कोई संपर्क नहीं मिला।", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                }
                            }
                        } else {
                            items(filteredContacts) { c ->
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
                                            Column {
                                                Text(c.name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                                if (!c.phone.isNullOrBlank()) {
                                                    Text(c.phone, style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                                }
                                            }

                                            Surface(
                                                color = if (c.status == "TO_RECEIVE") BrandSuccessLight else if (c.status == "TO_PAY") BrandDangerLight else SurfaceSubtle,
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(
                                                    text = c.statusLabel,
                                                    color = if (c.status == "TO_RECEIVE") BrandSuccess else if (c.status == "TO_PAY") BrandDanger else TextSecondary,
                                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        // Balances
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(BackgroundLight, RoundedCornerShape(10.dp))
                                                .padding(horizontal = 12.dp, vertical = 8.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column {
                                                Text("मिलने वाली रकम:", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = TextSecondary))
                                                Text("₹${String.format(Locale.getDefault(), "%,.0f", c.amountToReceive)}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, color = BrandSuccess))
                                            }
                                            Column(horizontalAlignment = Alignment.End) {
                                                Text("देने वाली रकम:", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = TextSecondary))
                                                Text("₹${String.format(Locale.getDefault(), "%,.0f", c.amountToPay)}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, color = BrandDanger))
                                            }
                                        }

                                        if (c.amountToReceive > 0) {
                                            Spacer(modifier = Modifier.height(10.dp))
                                            Button(
                                                onClick = {
                                                    reminderContact = c
                                                    reminderCustomMessage = "Hello ${c.name},\n\nAapke saath hamare hisaab ke anusaar ₹${String.format(Locale.getDefault(), "%,.0f", c.amountToReceive)} ki rakam abhi baaki hai.\n\nKripya suvidha anusar payment kar dein.\n\nThank you!\nPakka Chittha"
                                                    showReminderDialog = true
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess, contentColor = TextWhite),
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.fillMaxWidth().height(38.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                            ) {
                                                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("तगादा भेजें (WhatsApp Reminder)", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 6. TAB 1: RECENT TRANSACTIONS (हिसाब का पूरा रिकॉर्ड)
                    if (activeTab == 1) {
                        if (recentTransactions.isEmpty()) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                    Text("कोई लेन-देन नहीं मिला।", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                                }
                            }
                        } else {
                            items(recentTransactions) { tx ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
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
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(tx.contactName ?: "Vyapari", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                                                Surface(
                                                    color = SurfaceSubtle,
                                                    shape = RoundedCornerShape(6.dp)
                                                ) {
                                                    Text(
                                                        text = tx.paymentMode,
                                                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TextSecondary),
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                            Text(
                                                text = "${tx.date.take(10)}${if (!tx.description.isNullOrBlank()) " • ${tx.description}" else ""}",
                                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp, color = TextSecondary)
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            val isGave = tx.type == "GAVE"
                                            Text(
                                                text = "${if (isGave) "- " else "+ "}₹${String.format(Locale.getDefault(), "%,.0f", tx.amount)}",
                                                style = MaterialTheme.typography.titleMedium.copy(
                                                    fontWeight = FontWeight.Black,
                                                    color = if (isGave) BrandDanger else BrandSuccess
                                                )
                                            )
                                            Text(
                                                text = if (tx.status == "SETTLED") "हिसाब पूरा" else "बाकी: ₹${String.format(Locale.getDefault(), "%,.0f", tx.balanceAmount)}",
                                                style = MaterialTheme.typography.labelSmall.copy(
                                                    fontSize = 10.sp,
                                                    color = if (tx.status == "SETTLED") BrandSuccess else TextSecondary
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 7. TAB 2: PAYMENT MODES BREAKDOWN
                    if (activeTab == 2) {
                        items(data.modeSummaries) { m ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
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
                                    Column {
                                        Text(m.label, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                                        Text("${m.count} Transactions", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary, fontSize = 11.sp))
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("दी गई: ₹${String.format(Locale.getDefault(), "%,.0f", m.totalGiven)}", style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = BrandDanger))
                                        Text("मिली: ₹${String.format(Locale.getDefault(), "%,.0f", m.totalReceived)}", style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = BrandSuccess))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal 1: Subtype Selection Modal (Section 3)
    if (showTypePickerModal) {
        AlertDialog(
            onDismissRequest = { showTypePickerModal = false },
            title = {
                Text(
                    text = if (selectedPrimaryIntent == "GAVE") "मैंने रकम दी" else "मुझे रकम मिली",
                    fontWeight = FontWeight.Black
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "कृपया लेन-देन का प्रकार चुनें:",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                    )

                    if (selectedPrimaryIntent == "GAVE") {
                        // Option 1: नई रकम दी
                        OutlinedCard(
                            onClick = {
                                chosenSubtype = "GAVE_NEW"
                                showTypePickerModal = false
                                showEntryModal = true
                            },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("1. नई रकम दी", fontWeight = FontWeight.Bold, color = BrandDanger)
                                Text("मैंने किसी को नई रकम दी है। अब मुझे वापस मिलनी है।", fontSize = 11.sp, color = TextSecondary)
                            }
                        }

                        // Option 2: पहले ली गई रकम वापस की
                        OutlinedCard(
                            onClick = {
                                chosenSubtype = "BORROWED_REPAY"
                                showTypePickerModal = false
                                showEntryModal = true
                            },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("2. पहले ली गई रकम वापस की", fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("मैंने पहले किसी से रकम ली थी और अब वापस कर रहा हूं।", fontSize = 11.sp, color = TextSecondary)
                            }
                        }
                    } else {
                        // Option 1: पहले दी गई रकम वापस मिली
                        OutlinedCard(
                            onClick = {
                                chosenSubtype = "LENT_REPAY"
                                showTypePickerModal = false
                                showEntryModal = true
                            },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("1. पहले दी गई रकम वापस मिली", fontWeight = FontWeight.Bold, color = BrandSuccess)
                                Text("मैंने पहले किसी को रकम दी थी और अब वह वापस मिली है।", fontSize = 11.sp, color = TextSecondary)
                            }
                        }

                        // Option 2: नई रकम ली
                        OutlinedCard(
                            onClick = {
                                chosenSubtype = "RECEIVED_NEW"
                                showTypePickerModal = false
                                showEntryModal = true
                            },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("2. नई रकम ली", fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("मैंने किसी से नई रकम ली है और अब मुझे वापस करनी है।", fontSize = 11.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showTypePickerModal = false }) {
                    Text("रद्द करें")
                }
            }
        )
    }

    // Modal 2: Entry Form Modal with Payment Mode (Section 4 & Additional Feature)
    if (showEntryModal) {
        val isRepay = chosenSubtype == "BORROWED_REPAY" || chosenSubtype == "LENT_REPAY"

        AlertDialog(
            onDismissRequest = { showEntryModal = false },
            title = {
                Text(
                    text = when (chosenSubtype) {
                        "GAVE_NEW" -> "नई रकम दी"
                        "BORROWED_REPAY" -> "पहले ली गई रकम वापस की"
                        "LENT_REPAY" -> "पहले दी गई रकम वापस मिली"
                        else -> "नई रकम ली"
                    },
                    fontWeight = FontWeight.Black
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = { contactPickerLauncher.launch(null) },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Contacts, contentDescription = null, modifier = Modifier.size(16.dp), tint = BrandAccent)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("फोन संपर्क से चुनें (Pick from Phone)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandAccent)
                    }

                    OutlinedTextField(
                        value = personName,
                        onValueChange = { personName = it },
                        label = { Text("व्यक्ति का नाम (Person Name) *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = personPhone,
                        onValueChange = { personPhone = it },
                        label = { Text("मोबाइल नंबर (वैकल्पिक)") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = txAmount,
                        onValueChange = { txAmount = it },
                        label = { Text("रकम दर्ज करें (Amount) *") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Payment Mode Selector Tabs
                    Column {
                        Text("भुगतान का माध्यम (Transaction Mode) *", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold))
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf("CASH" to "Cash", "UPI" to "UPI", "BANK_TRANSFER" to "Bank", "CHEQUE" to "Cheque").forEach { (m, label) ->
                                FilterChip(
                                    selected = txPaymentMode == m,
                                    onClick = { txPaymentMode = m },
                                    label = { Text(label, fontSize = 10.sp) }
                                )
                            }
                        }
                    }

                    if (txPaymentMode != "CASH") {
                        OutlinedTextField(
                            value = txPaymentRef,
                            onValueChange = { txPaymentRef = it },
                            label = { Text("Ref / UTR / Cheque No.") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = txDescription,
                        onValueChange = { txDescription = it },
                        label = { Text("विवरण (Note - Optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amt = txAmount.toDoubleOrNull() ?: 0.0
                        if (personName.isNotBlank() && amt > 0) {
                            if (isRepay) {
                                viewModel.recordRepayment(
                                    RecordKhataRepaymentRequest(
                                        contactId = selectedContactId,
                                        targetType = if (chosenSubtype == "BORROWED_REPAY") "RECEIVED" else "GAVE",
                                        amount = amt,
                                        date = txDate,
                                        paymentMode = txPaymentMode,
                                        paymentRef = txPaymentRef.ifBlank { null },
                                        notes = txDescription.ifBlank { null }
                                    )
                                ) { success ->
                                    if (success) {
                                        showEntryModal = false
                                        personName = ""
                                        personPhone = ""
                                        txAmount = ""
                                        txDescription = ""
                                    }
                                }
                            } else {
                                viewModel.addTransaction(
                                    CreateKhataTransactionRequest(
                                        contactId = selectedContactId,
                                        personName = personName,
                                        phone = personPhone.ifBlank { null },
                                        type = if (chosenSubtype == "GAVE_NEW") "GAVE" else "RECEIVED",
                                        amount = amt,
                                        date = txDate,
                                        paymentMode = txPaymentMode,
                                        paymentRef = txPaymentRef.ifBlank { null },
                                        description = txDescription.ifBlank { null }
                                    )
                                ) { success ->
                                    if (success) {
                                        showEntryModal = false
                                        personName = ""
                                        personPhone = ""
                                        txAmount = ""
                                        txDescription = ""
                                    }
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (chosenSubtype == "GAVE_NEW" || chosenSubtype == "BORROWED_REPAY") BrandDanger else BrandSuccess
                    )
                ) {
                    Text("सहेजें (Save)")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEntryModal = false }) {
                    Text("रद्द करें")
                }
            }
        )
    }

    // Modal 3: WhatsApp Payment Reminder Dialog
    if (showReminderDialog && reminderContact != null) {
        val c = reminderContact!!
        AlertDialog(
            onDismissRequest = { showReminderDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Share, contentDescription = null, tint = BrandSuccess, modifier = Modifier.size(20.dp))
                    Text("तगादा भेजें (WhatsApp Reminder)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "प्राप्तकर्ता: ${c.name} (${c.phone ?: "फोन नंबर दर्ज करें"})",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = TextPrimary)
                    )
                    Text(
                        "बाकी रकम: ₹${String.format(Locale.getDefault(), "%,.0f", c.amountToReceive)}",
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Black, color = BrandSuccess)
                    )
                    OutlinedTextField(
                        value = reminderCustomMessage,
                        onValueChange = { reminderCustomMessage = it },
                        label = { Text("संदेश संपादित करें (Editable Message)") },
                        minLines = 4,
                        maxLines = 8,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showReminderDialog = false
                        launchWhatsApp(c, reminderCustomMessage)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess)
                ) {
                    Text("WhatsApp पर भेजें")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReminderDialog = false }) {
                    Text("रद्द करें")
                }
            }
        )
    }
}
