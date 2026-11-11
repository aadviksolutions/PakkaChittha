package com.pakkachittha.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Register : Screen("register")
    object ModeSelection : Screen("mode_selection")
    object Dashboard : Screen("dashboard")
    object Invoices : Screen("invoices")
    object CreateInvoice : Screen("invoices_new")
    object InvoiceDetail : Screen("invoices/{invoiceId}") {
        fun createRoute(invoiceId: String) = "invoices/$invoiceId"
    }
    object Customers : Screen("customers")
    object CustomerDetail : Screen("customers/{customerId}") {
        fun createRoute(customerId: String) = "customers/$customerId"
    }
    object Inventory : Screen("inventory")
    object FreeKhata : Screen("free_khata")
    object FreeKhataReports : Screen("free_khata_reports")
    object GharKharcha : Screen("ghar_kharcha")
    object Settings : Screen("settings")
    object Subscription : Screen("subscription")
}
