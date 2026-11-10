package com.pakkachittha.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.pakkachittha.app.data.api.ApiClient
import com.pakkachittha.app.data.local.AppPreferences
import com.pakkachittha.app.data.repository.*
import com.pakkachittha.app.ui.navigation.AppNavHost
import com.pakkachittha.app.ui.theme.PakkachitthaTheme
import com.pakkachittha.app.ui.viewmodel.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var appPreferences: AppPreferences
    private lateinit var authViewModel: AuthViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        appPreferences = AppPreferences(applicationContext)
        val apiService = ApiClient.getService(this)

        val authRepo = AuthRepository(apiService, appPreferences)
        val invoiceRepo = InvoiceRepository(apiService)
        val customerRepo = CustomerRepository(apiService)
        val inventoryRepo = InventoryRepository(apiService)
        val freeKhataRepo = FreeKhataRepository(apiService)
        val subscriptionRepo = SubscriptionRepository(apiService)

        authViewModel = AuthViewModel(authRepo)
        val invoiceViewModel = InvoiceViewModel(invoiceRepo)
        val customerViewModel = CustomerViewModel(customerRepo)
        val inventoryViewModel = InventoryViewModel(inventoryRepo)
        val freeKhataViewModel = FreeKhataViewModel(freeKhataRepo)
        val subscriptionViewModel = SubscriptionViewModel(subscriptionRepo, appPreferences)

        handleAuthDeepLink(intent)

        setContent {
            PakkachitthaTheme {
                AppNavHost(
                    authViewModel = authViewModel,
                    invoiceViewModel = invoiceViewModel,
                    customerViewModel = customerViewModel,
                    inventoryViewModel = inventoryViewModel,
                    freeKhataViewModel = freeKhataViewModel,
                    subscriptionViewModel = subscriptionViewModel
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthDeepLink(intent)
    }

    private fun handleAuthDeepLink(incomingIntent: Intent?) {
        val data = incomingIntent?.data ?: return
        if (data.scheme == "pakkachittha" && data.host == "auth" && data.path?.startsWith("/callback") == true) {
            val token = data.getQueryParameter("token")
            val email = data.getQueryParameter("email") ?: ""
            val name = data.getQueryParameter("name") ?: "Vyapari"
            val userId = data.getQueryParameter("userId") ?: ""
            val businessId = data.getQueryParameter("businessId")
            val businessName = data.getQueryParameter("businessName")

            if (!token.isNullOrBlank()) {
                lifecycleScope.launch {
                    appPreferences.saveAuthSession(
                        token = token,
                        userId = userId,
                        name = name,
                        email = email,
                        businessId = businessId,
                        businessName = businessName
                    )
                    authViewModel.handleDirectSession(
                        token = token,
                        userId = userId,
                        email = email,
                        name = name,
                        businessName = businessName
                    )
                }
            }
        }
    }
}
