package com.pakkachittha.app.ui.screens.subscription

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.data.model.OfficialPlanDto
import com.pakkachittha.app.data.model.PlanPricingTierDto
import com.pakkachittha.app.ui.components.PakkachitthaTopBar
import com.pakkachittha.app.ui.theme.*
import com.pakkachittha.app.ui.viewmodel.SubscriptionViewModel

@Composable
fun SubscriptionScreen(
    subscriptionViewModel: SubscriptionViewModel,
    onNavigateBack: () -> Unit,
    onOpenDrawer: () -> Unit
) {
    val context = LocalContext.current
    val uiState by subscriptionViewModel.uiState.collectAsState()

    val intervals = listOf(
        "MONTHLY" to "1 Month",
        "QUARTERLY" to "3 Months",
        "HALF_YEARLY" to "6 Months",
        "YEARLY" to "12 Months"
    )

    Scaffold(
        topBar = {
            PakkachitthaTopBar(
                title = "Subscription Plans",
                subtitle = "Starter, Growth & Scale",
                canGoBack = true,
                onNavigationClick = onNavigateBack
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
            // Header Info Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = BrandPrimary)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                color = BrandSecondary,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Default.Star,
                                        contentDescription = null,
                                        tint = BrandAccent,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                            Column {
                                Text(
                                    text = "Choose Your Business Plan",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = TextWhite
                                    )
                                )
                                Text(
                                    text = "Unlimited Invoices across all tiers",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = BrandWarning,
                                        fontSize = 11.sp
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // Duration Interval Selector
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "BILLING DURATION",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary
                        )
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceCard, RoundedCornerShape(12.dp))
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        intervals.forEach { (key, label) ->
                            val isSelected = uiState.selectedInterval == key
                            Button(
                                onClick = { subscriptionViewModel.setInterval(key) },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(38.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isSelected) BrandPrimary else SurfaceCard,
                                    contentColor = if (isSelected) TextWhite else TextSecondary
                                ),
                                contentPadding = PaddingValues(horizontal = 4.dp),
                                elevation = if (isSelected) ButtonDefaults.buttonElevation(defaultElevation = 2.dp) else ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                            ) {
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        fontSize = 10.5.sp
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // Discount Code Promo Box
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "HAVE A DISCOUNT CODE?",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextSecondary
                            )
                        )

                        if (uiState.appliedDiscount != null) {
                            val applied = uiState.appliedDiscount!!
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(BrandSuccessLight, RoundedCornerShape(10.dp))
                                    .border(1.dp, BrandSuccess, RoundedCornerShape(10.dp))
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = BrandSuccess,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column {
                                        Text(
                                            text = applied.code ?: uiState.discountCode,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = BrandSuccess
                                            )
                                        )
                                        Text(
                                            text = "Discount: ₹${applied.discountAmount.toInt()} Off",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                color = BrandSuccess,
                                                fontSize = 11.sp
                                            )
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { subscriptionViewModel.removeDiscount() },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Remove",
                                        tint = BrandDanger,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        } else {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedTextField(
                                    value = uiState.discountCode,
                                    onValueChange = { subscriptionViewModel.setDiscountCode(it) },
                                    placeholder = { Text("Enter Coupon Code", fontSize = 12.sp) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    singleLine = true
                                )
                                Button(
                                    onClick = { subscriptionViewModel.applyDiscount("GROWTH") },
                                    enabled = uiState.discountCode.isNotBlank() && !uiState.validatingDiscount,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                                    modifier = Modifier.height(50.dp)
                                ) {
                                    if (uiState.validatingDiscount) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            color = TextWhite,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Apply", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                }
                            }
                        }

                        if (uiState.discountError != null) {
                            Text(
                                text = uiState.discountError!!,
                                style = MaterialTheme.typography.bodySmall.copy(color = BrandDanger, fontSize = 11.sp)
                            )
                        }
                    }
                }
            }

            // Plan Cards (STARTER, GROWTH, SCALE)
            val planKeys = listOf("STARTER", "GROWTH", "SCALE")
            items(planKeys) { key ->
                val planDto = uiState.plans[key]
                val tier = planDto?.pricing?.get(uiState.selectedInterval)
                val discAmt = uiState.appliedDiscount?.discountAmount ?: 0.0
                PlanCard(
                    planKey = key,
                    planName = planDto?.name ?: key,
                    tagline = planDto?.tagline ?: "Official business package",
                    pricing = tier,
                    features = planDto?.features ?: emptyList(),
                    isRecommended = key == "GROWTH",
                    discountAmount = discAmt,
                    appliedCode = uiState.appliedDiscount?.code,
                    onSubscribe = {
                        val browserIntent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://www.pakkachittha.com/subscription")
                        )
                        context.startActivity(browserIntent)
                    }
                )
            }
        }
    }
}

@Composable
fun PlanCard(
    planKey: String,
    planName: String,
    tagline: String,
    pricing: PlanPricingTierDto?,
    features: List<String>,
    isRecommended: Boolean,
    discountAmount: Double,
    appliedCode: String?,
    onSubscribe: () -> Unit
) {
    val originalPrice = pricing?.totalPrice ?: 0.0
    val effectivePrice = if (discountAmount > 0.0) maxOf(0.0, originalPrice - discountAmount) else originalPrice
    val displayPrice = effectivePrice.toInt()
    val displayOriginal = originalPrice.toInt()
    val displaySavings = pricing?.savingsAmount?.toInt() ?: 0
    val displayMonthly = pricing?.monthlyEquivalent?.toInt() ?: 0
    val displayDiscount = discountAmount.toInt()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (isRecommended) Modifier.border(2.dp, BrandAccent, RoundedCornerShape(16.dp))
                else Modifier
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            // Card Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = planName,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                )
                if (isRecommended) {
                    Surface(
                        color = BrandAccent,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "RECOMMENDED",
                            color = TextWhite,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp
                            ),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = tagline,
                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary, fontSize = 11.sp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Pricing Display
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (discountAmount > 0.0) {
                    Text(
                        text = "₹$displayOriginal",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = TextSecondary,
                            textDecoration = TextDecoration.LineThrough
                        )
                    )
                }
                Text(
                    text = "₹$displayPrice",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Black,
                        color = BrandPrimary
                    )
                )
                Text(
                    text = "/ ${pricing?.durationMonths ?: 1} mo",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = TextSecondary,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }

            if (pricing != null && displaySavings > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Equiv ₹$displayMonthly/mo",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary, fontSize = 11.sp)
                    )
                    Surface(
                        color = BrandAccentLight,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Save ₹$displaySavings",
                            color = BrandAccent,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            ),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }

            if (discountAmount > 0.0 && appliedCode != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Coupon $appliedCode applied (-₹$displayDiscount)",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = BrandSuccess,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                )
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = BorderSubtle)
            Spacer(modifier = Modifier.height(12.dp))

            // Core Features
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = BrandAccent,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Unlimited Invoices & E-way bills",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold)
                    )
                }

                features.take(4).forEach { feat ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = BrandSuccess,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = feat,
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // CTA Button
            Button(
                onClick = onSubscribe,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isRecommended) BrandAccent else BrandPrimary
                )
            ) {
                Text(
                    text = "Upgrade to $planName",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextWhite
                    )
                )
            }
        }
    }
}
