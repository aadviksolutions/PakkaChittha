package com.pakkachittha.app.ui.screens.settings

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.AuthViewModel
import com.pakkachittha.app.ui.viewmodel.SubscriptionViewModel

@Composable
fun SettingsScreen(
    businessName: String?,
    userName: String?,
    authViewModel: AuthViewModel,
    subscriptionViewModel: SubscriptionViewModel,
    onNavigateToSubscription: () -> Unit,
    onOpenDrawer: () -> Unit
) {
    val context = LocalContext.current
    val subUiState by subscriptionViewModel.uiState.collectAsState()
    val currentLang by subscriptionViewModel.preferredLanguage.collectAsState(initial = "en")

    var upiIdInput by remember(subUiState.paymentDetails) {
        mutableStateOf(subUiState.paymentDetails?.upiId ?: "")
    }
    var beneficiaryNameInput by remember(subUiState.paymentDetails) {
        mutableStateOf(subUiState.paymentDetails?.upiBeneficiaryName ?: "")
    }

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "Business Settings",
                subtitle = "Configuration",
                onNavigationClick = onOpenDrawer
            )
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Business Profile Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "BUSINESS PROFILE",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = TextSecondary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = businessName ?: "Pakka Chittha Workspace",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = "Owner: ${userName ?: "Vyapari"}",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )
                    }
                }
            }

            // Subscription & Plans Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "SUBSCRIPTION & TRIAL",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = TextSecondary,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "7-Day Free Trial Active",
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = BrandAccent
                                    )
                                )
                            }
                            Surface(
                                color = BrandAccentLight,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "EVALUATION",
                                    color = BrandAccent,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp
                                    ),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Text(
                            text = "Explore Starter, Growth, and Scale plans with 1, 3, 6, and 12-month billing options.",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )

                        Button(
                            onClick = onNavigateToSubscription,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth().height(42.dp)
                        ) {
                            Text(
                                "View Packages & Upgrade",
                                style = MaterialTheme.typography.labelLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextWhite
                                )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            // मेरी Payment Details (UPI Details)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.QrCode,
                                contentDescription = null,
                                tint = BrandAccent,
                                modifier = Modifier.size(20.dp)
                            )
                            Column {
                                Text(
                                    text = "मेरी PAYMENT DETAILS",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = TextSecondary,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                                Text(
                                    text = "UPI Settlement & QR Code",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                                )
                            }
                        }

                        Text(
                            text = "Used for customer invoices and WhatsApp payment reminders.",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary, fontSize = 11.sp)
                        )

                        OutlinedTextField(
                            value = upiIdInput,
                            onValueChange = { upiIdInput = it.lowercase() },
                            label = { Text("UPI ID / VPA *") },
                            placeholder = { Text("e.g. vyapari@okhdfcbank") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = beneficiaryNameInput,
                            onValueChange = { beneficiaryNameInput = it },
                            label = { Text("खाताधारक / Beneficiary Name") },
                            placeholder = { Text("e.g. Ramesh Kumar / Acme Enterprises") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            singleLine = true
                        )

                        if (!subUiState.paymentDetails?.upiQrImageUrl.isNullOrBlank()) {
                            Surface(
                                color = BrandSuccessLight,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = BrandSuccess,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Custom QR Image is saved on profile",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = BrandSuccess,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 11.sp
                                        )
                                    )
                                }
                            }
                        }

                        Button(
                            onClick = {
                                subscriptionViewModel.savePaymentDetails(
                                    upiId = upiIdInput.trim().ifBlank { null },
                                    beneficiaryName = beneficiaryNameInput.trim().ifBlank { null }
                                ) { success ->
                                    if (success) {
                                        Toast.makeText(context, "Payment details saved!", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "Failed to save payment details", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            enabled = !subUiState.savingPaymentDetails,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandSuccess),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth().height(44.dp)
                        ) {
                            if (subUiState.savingPaymentDetails) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = TextWhite,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text(
                                    "Save Payment Details",
                                    style = MaterialTheme.typography.labelLarge.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = TextWhite
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // Language Preference Card (English / Hindi Only)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "LANGUAGE PREFERENCE / भाषा",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = TextSecondary,
                                fontWeight = FontWeight.Bold
                            )
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(BackgroundLight, RoundedCornerShape(12.dp))
                                .padding(4.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            val isEnglish = currentLang != "hi"
                            Button(
                                onClick = { subscriptionViewModel.changeLanguage("en") },
                                modifier = Modifier.weight(1f).height(40.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isEnglish) BrandPrimary else BackgroundLight,
                                    contentColor = if (isEnglish) TextWhite else TextSecondary
                                )
                            ) {
                                Text(
                                    "English",
                                    fontWeight = if (isEnglish) FontWeight.Bold else FontWeight.Medium
                                )
                            }

                            Button(
                                onClick = { subscriptionViewModel.changeLanguage("hi") },
                                modifier = Modifier.weight(1f).height(40.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (!isEnglish) BrandPrimary else BackgroundLight,
                                    contentColor = if (!isEnglish) TextWhite else TextSecondary
                                )
                            ) {
                                Text(
                                    "हिन्दी (Hindi)",
                                    fontWeight = if (!isEnglish) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }

            // App & System Info Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "APP & SYSTEM INFO",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = TextSecondary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Application", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Pakka Chittha Native",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = BrandAccent
                                )
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Version", style = MaterialTheme.typography.bodyMedium)
                            Text("1.0.0 (Native Android)", style = MaterialTheme.typography.bodyMedium)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Architecture", style = MaterialTheme.typography.bodyMedium)
                            Text("Jetpack Compose + Material 3", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }

            // Sign Out Button
            item {
                Button(
                    onClick = { authViewModel.logout() },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandDanger),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Sign Out of Account",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}
