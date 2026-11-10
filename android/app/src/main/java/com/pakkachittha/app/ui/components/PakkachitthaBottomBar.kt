package com.pakkachittha.app.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pakkachittha.app.ui.navigation.Screen
import com.pakkachittha.app.ui.theme.*

data class BottomNavItem(
    val title: String,
    val route: String,
    val icon: ImageVector
)

@Composable
fun PakkachitthaBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit
) {
    val items = listOf(
        BottomNavItem("Overview", Screen.Dashboard.route, Icons.Default.Dashboard),
        BottomNavItem("Invoices", Screen.Invoices.route, Icons.Default.Receipt),
        BottomNavItem("Customers", Screen.Customers.route, Icons.Default.People),
        BottomNavItem("Inventory", Screen.Inventory.route, Icons.Default.Inventory2),
        BottomNavItem("Free Khata", Screen.FreeKhata.route, Icons.Default.AccountBalanceWallet)
    )

    NavigationBar(
        containerColor = SurfaceCard,
        contentColor = TextPrimary,
        tonalElevation = 8.dp
    ) {
        items.forEach { item ->
            val isSelected = currentRoute == item.route

            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title,
                        modifier = Modifier.size(22.dp)
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp)
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = BrandAccent,
                    selectedTextColor = BrandAccent,
                    unselectedIconColor = TextSecondary,
                    unselectedTextColor = TextSecondary,
                    indicatorColor = BrandAccentLight
                )
            )
        }
    }
}
