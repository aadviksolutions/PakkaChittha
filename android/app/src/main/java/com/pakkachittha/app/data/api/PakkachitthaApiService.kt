package com.pakkachittha.app.data.api

import com.pakkachittha.app.data.model.*
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface PakkachitthaApiService {

    // --- Authentication ---
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/callback/google")
    suspend fun authenticateWithGoogle(@Body request: GoogleAuthRequest): Response<AuthResponse>

    @GET("auth/google/config")
    suspend fun getGoogleConfig(): Response<GoogleConfigResponse>

    @GET("auth/me")
    suspend fun getCurrentSession(): Response<CurrentSessionResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    // --- Invoices ---
    @GET("invoices")
    suspend fun getInvoices(
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
        @Query("customerId") customerId: String? = null
    ): Response<InvoiceListResponse>

    @GET("invoices/{id}")
    suspend fun getInvoiceDetail(@Path("id") id: String): Response<InvoiceDetailResponse>

    @GET("invoices/next-number")
    suspend fun getNextInvoiceNumber(): Response<NextInvoiceNumberResponse>

    @POST("invoices")
    suspend fun createInvoice(@Body request: CreateInvoiceRequest): Response<InvoiceDetailResponse>

    @POST("invoices/{id}/payments")
    suspend fun recordInvoicePayment(
        @Path("id") id: String,
        @Body request: RecordPaymentRequest
    ): Response<Unit>

    // --- Customers ---
    @GET("customers")
    suspend fun getCustomers(@Query("search") search: String? = null): Response<CustomerListResponse>

    @GET("customers/{id}")
    suspend fun getCustomerDetail(@Path("id") id: String): Response<CustomerDetailResponse>

    @POST("customers")
    suspend fun createCustomer(@Body request: CreateCustomerRequest): Response<CustomerDetailResponse>

    // --- Inventory ---
    @GET("inventory")
    suspend fun getInventory(
        @Query("query") query: String? = null,
        @Query("category") category: String? = null,
        @Query("lowStockOnly") lowStockOnly: Boolean = false
    ): Response<InventoryListResponse>

    @POST("inventory")
    suspend fun createProduct(@Body request: CreateProductRequest): Response<Unit>

    @POST("inventory/{id}/adjust")
    suspend fun adjustStock(
        @Path("id") id: String,
        @Body request: AdjustStockRequest
    ): Response<Unit>

    // --- Free Khata ---
    @GET("free-khata/dashboard")
    suspend fun getKhataDashboard(): Response<FreeKhataDashboardResponse>

    @GET("free-khata/contacts")
    suspend fun getKhataContacts(): Response<KhataContactsResponse>

    @POST("free-khata/transactions")
    suspend fun createKhataTransaction(@Body request: CreateKhataTransactionRequest): Response<Unit>

    @POST("free-khata/repayments")
    suspend fun recordKhataRepayment(@Body request: RecordKhataRepaymentRequest): Response<Unit>

    @GET("free-khata/reports")
    suspend fun getKhataConsolidatedReport(
        @Query("dateRange") dateRange: String = "ALL",
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("search") search: String? = null,
        @Query("direction") direction: String = "ALL",
        @Query("paymentMode") paymentMode: String = "ALL",
        @Query("accountStatus") accountStatus: String = "OUTSTANDING"
    ): Response<KhataConsolidatedReportResponse>

    @GET("free-khata/reports")
    suspend fun getKhataPersonReport(
        @Query("contactId") contactId: String,
        @Query("dateRange") dateRange: String = "ALL",
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("paymentMode") paymentMode: String = "ALL"
    ): Response<KhataPersonDetailedReportResponse>

    @Streaming
    @GET("free-khata/reports/export")
    suspend fun exportKhataReport(
        @Query("format") format: String,
        @Query("contactId") contactId: String? = null,
        @Query("dateRange") dateRange: String = "ALL",
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("search") search: String? = null,
        @Query("direction") direction: String = "ALL",
        @Query("paymentMode") paymentMode: String = "ALL",
        @Query("accountStatus") accountStatus: String = "OUTSTANDING"
    ): Response<ResponseBody>

    // --- User Payment Details & UPI ---
    @GET("user/payment-details")
    suspend fun getPaymentDetails(): Response<PaymentDetailsResponse>

    @POST("user/payment-details")
    suspend fun savePaymentDetails(@Body request: SavePaymentDetailsRequest): Response<Unit>

    // --- Subscription & Dynamic Plans ---
    @GET("subscription/plans")
    suspend fun getSubscriptionPlans(): Response<SubscriptionPlansResponse>

    @POST("subscription/discounts/validate")
    suspend fun validateDiscount(@Body request: ValidateDiscountRequest): Response<ValidateDiscountResponse>
}
