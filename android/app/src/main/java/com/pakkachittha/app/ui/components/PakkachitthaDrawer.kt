package com.pakkachittha.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.R
import com.pakkachittha.app.ui.navigation.Screen
import com.pakkachittha.app.ui.theme.*

data class DrawerItem(
    val title: String,
    val route: String,
    val icon: ImageVector,
    val badge: String? = null
)

@Composable
fun PakkachitthaDrawer(
    businessName: String?,
    userName: String?,
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit
) {
    ModalDrawerSheet(
        drawerContainerColor = SurfaceCard,
        drawerContentColor = TextPrimary,
        modifier = Modifier.width(300.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // Brand & User Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BrandPrimary)
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_pakkachittha),
                            contentDescription = "Pakka Chittha Logo",
                            modifier = Modifier.size(36.dp)
                        )
                        Column {
                            Text(
                                text = "Pakka Chittha",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Black,
                                    color = TextWhite
                                )
                            )
                            Text(
                                text = "Vyapaar Ka Pakka Hisaab",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = BrandWarning,
                                    fontSize = 10.sp
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Surface(
                        color = BrandSecondary,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = businessName ?: "My Business",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        color = TextWhite,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                                Text(
                                    text = userName ?: "Vyapari",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = TextMuted,
                                        fontSize = 11.sp
                                    )
                                )
                            }
                            Surface(
                                color = BrandAccentLight,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Active",
                                    color = BrandAccent,
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Navigation Items
            val navItems = listOf(
                DrawerItem("Dashboard", Screen.Dashboard.route, Icons.Default.Dashboard),
                DrawerItem("Invoices & Billing", Screen.Invoices.route, Icons.Default.Receipt),
                DrawerItem("Customers & Parties", Screen.Customers.route, Icons.Default.People),
                DrawerItem("Inventory & Stock", Screen.Inventory.route, Icons.Default.Inventory2),
                DrawerItem("Personal Khata", Screen.FreeKhata.route, Icons.Default.AccountBalanceWallet, "Free"),
                DrawerItem("Khata Reports (PDF/XLSX)", Screen.FreeKhataReports.route, Icons.Default.Assessment, "PDF"),
                DrawerItem("Ghar Kharcha", Screen.GharKharcha.route, Icons.Default.Home, "Free"),
                DrawerItem("Subscription & Plans", Screen.Subscription.route, Icons.Default.Star, "Pro"),
                DrawerItem("Business Settings", Screen.Settings.route, Icons.Default.Settings)
            )

            navItems.forEach { item ->
                val isSelected = currentRoute == item.route
                NavigationDrawerItem(
                    label = {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = item.title,
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) BrandAccent else TextPrimary
                                )
                            )
                            if (item.badge != null) {
                                Surface(
                                    color = BrandSuccessLight,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = item.badge,
                                        color = BrandSuccess,
                                        style = MaterialTheme.typography.labelSmall,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                                    )
                                }
                            }
                        }
                    },
                    icon = {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.title,
                            tint = if (isSelected) BrandAccent else TextSecondary
                        )
                    },
                    selected = isSelected,
                    onClick = { onNavigate(item.route) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = BrandAccentLight,
                        unselectedContainerColor = SurfaceCard
                    )
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Logout
            NavigationDrawerItem(
                label = {
                    Text(
                        text = "Sign Out",
                        style = MaterialTheme.typography.bodyLarge.copy(
                            color = BrandDanger,
                            fontWeight = FontWeight.Bold
                        )
                    )
                },
                icon = {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                        contentDescription = "Sign Out",
                        tint = BrandDanger
                    )
                },
                selected = false,
                onClick = onLogout,
                modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
