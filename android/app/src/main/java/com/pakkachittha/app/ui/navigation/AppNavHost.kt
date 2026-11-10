package com.pakkachittha.app.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.pakkachittha.app.ui.components.PakkachitthaBottomBar
import com.pakkachittha.app.ui.components.PakkachitthaDrawer
import com.pakkachittha.app.ui.screens.auth.LoginScreen
import com.pakkachittha.app.ui.screens.auth.RegisterScreen
import com.pakkachittha.app.ui.screens.customers.CustomerListScreen
import com.pakkachittha.app.ui.screens.dashboard.DashboardScreen
import com.pakkachittha.app.ui.screens.freekhata.FreeKhataDashboardScreen
import com.pakkachittha.app.ui.screens.inventory.InventoryScreen
import com.pakkachittha.app.ui.screens.invoices.CreateInvoiceScreen
import com.pakkachittha.app.ui.screens.invoices.InvoiceDetailScreen
import com.pakkachittha.app.ui.screens.invoices.InvoiceListScreen
import com.pakkachittha.app.ui.screens.settings.SettingsScreen
import com.pakkachittha.app.ui.screens.subscription.SubscriptionScreen
import com.pakkachittha.app.ui.viewmodel.*
import kotlinx.coroutines.launch

@Composable
fun AppNavHost(
    authViewModel: AuthViewModel,
    invoiceViewModel: InvoiceViewModel,
    customerViewModel: CustomerViewModel,
    inventoryViewModel: InventoryViewModel,
    freeKhataViewModel: FreeKhataViewModel,
    subscriptionViewModel: SubscriptionViewModel
) {
    val navController = rememberNavController()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val authState by authViewModel.uiState.collectAsState()
    val userName = (authState as? AuthUiState.Authenticated)?.user?.name
    val businessName = (authState as? AuthUiState.Authenticated)?.businessName

    val showBottomBar = currentRoute in listOf(
        Screen.Dashboard.route,
        Screen.Invoices.route,
        Screen.Customers.route,
        Screen.Inventory.route,
        Screen.FreeKhata.route
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = showBottomBar,
        drawerContent = {
            PakkachitthaDrawer(
                businessName = businessName,
                userName = userName,
                currentRoute = currentRoute,
                onNavigate = { route ->
                    coroutineScope.launch { drawerState.close() }
                    navController.navigate(route) {
                        popUpTo(Screen.Dashboard.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                onLogout = {
                    coroutineScope.launch { drawerState.close() }
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    ) {
        Scaffold(
            bottomBar = {
                if (showBottomBar) {
                    PakkachitthaBottomBar(
                        currentRoute = currentRoute,
                        onNavigate = { route ->
                            navController.navigate(route) {
                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = if (authState is AuthUiState.Authenticated) Screen.Dashboard.route else Screen.Login.route,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Auth Routes
                composable(Screen.Login.route) {
                    LoginScreen(
                        viewModel = authViewModel,
                        onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                        onLoginSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        }
                    )
                }

                composable(Screen.Register.route) {
                    RegisterScreen(
                        viewModel = authViewModel,
                        onNavigateToLogin = { navController.popBackStack() },
                        onRegisterSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Register.route) { inclusive = true }
                            }
                        }
                    )
                }

                // Business Dashboard
                composable(Screen.Dashboard.route) {
                    DashboardScreen(
                        businessName = businessName,
                        userName = userName,
                        invoiceViewModel = invoiceViewModel,
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } },
                        onNavigateToCreateInvoice = { navController.navigate(Screen.CreateInvoice.route) },
                        onNavigateToInvoices = { navController.navigate(Screen.Invoices.route) },
                        onNavigateToCustomers = { navController.navigate(Screen.Customers.route) },
                        onNavigateToInventory = { navController.navigate(Screen.Inventory.route) },
                        onNavigateToFreeKhata = { navController.navigate(Screen.FreeKhata.route) },
                        onNavigateToInvoiceDetail = { id -> navController.navigate(Screen.InvoiceDetail.createRoute(id)) }
                    )
                }

                // Invoices
                composable(Screen.Invoices.route) {
                    InvoiceListScreen(
                        viewModel = invoiceViewModel,
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } },
                        onNavigateToCreateInvoice = { navController.navigate(Screen.CreateInvoice.route) },
                        onNavigateToDetail = { id -> navController.navigate(Screen.InvoiceDetail.createRoute(id)) }
                    )
                }

                composable(Screen.CreateInvoice.route) {
                    CreateInvoiceScreen(
                        viewModel = invoiceViewModel,
                        onNavigateBack = { navController.popBackStack() },
                        onInvoiceCreated = { navController.popBackStack() }
                    )
                }

                composable(
                    route = Screen.InvoiceDetail.route,
                    arguments = listOf(navArgument("invoiceId") { type = NavType.StringType })
                ) { backStackEntry ->
                    val invoiceId = backStackEntry.arguments?.getString("invoiceId") ?: ""
                    InvoiceDetailScreen(
                        invoiceId = invoiceId,
                        viewModel = invoiceViewModel,
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // Customers
                composable(Screen.Customers.route) {
                    CustomerListScreen(
                        viewModel = customerViewModel,
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } },
                        onNavigateToDetail = { /* Can open customer ledger */ }
                    )
                }

                // Inventory
                composable(Screen.Inventory.route) {
                    InventoryScreen(
                        viewModel = inventoryViewModel,
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } }
                    )
                }

                // Free Khata
                composable(Screen.FreeKhata.route) {
                    FreeKhataDashboardScreen(
                        viewModel = freeKhataViewModel,
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } }
                    )
                }

                // Settings
                composable(Screen.Settings.route) {
                    SettingsScreen(
                        businessName = businessName,
                        userName = userName,
                        authViewModel = authViewModel,
                        subscriptionViewModel = subscriptionViewModel,
                        onNavigateToSubscription = { navController.navigate(Screen.Subscription.route) },
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } }
                    )
                }

                // Subscription & Plans
                composable(Screen.Subscription.route) {
                    SubscriptionScreen(
                        subscriptionViewModel = subscriptionViewModel,
                        onNavigateBack = { navController.popBackStack() },
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } }
                    )
                }
            }
        }
    }
}
