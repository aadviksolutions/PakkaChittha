package com.lenden.app.data.remote

import com.lenden.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface LendenApiService {

    // --- Authentication ---
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<StandardApiResponse>

    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<SessionMeResponse>

    // --- Reports & KPIs ---
    @GET("api/reports/summary")
    suspend fun getReportsSummary(): Response<ReportsSummaryResponse>

    // --- Invoices & Billing ---
    @GET("api/invoices")
    suspend fun getInvoices(
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<InvoicesResponse>

    @POST("api/invoices")
    suspend fun createInvoice(@Body request: CreateInvoiceRequest): Response<SingleInvoiceResponse>

    @GET("api/invoices/{id}")
    suspend fun getInvoiceById(@Path("id") id: String): Response<SingleInvoiceResponse>

    @POST("api/invoices/{id}/payments")
    suspend fun recordInvoicePayment(
        @Path("id") id: String,
        @Body request: RecordPaymentRequest
    ): Response<StandardApiResponse>

    @POST("api/invoices/{id}/void")
    suspend fun voidInvoice(
        @Path("id") id: String,
        @Body body: Map<String, String>
    ): Response<StandardApiResponse>

    // --- Customers & Udhaar Khata ---
    @GET("api/customers")
    suspend fun getCustomers(
        @Query("search") search: String? = null
    ): Response<CustomersResponse>

    @POST("api/customers")
    suspend fun createCustomer(@Body request: CreateCustomerRequest): Response<StandardApiResponse>

    // --- GSTIN Verification & Business Lookup ---
    @GET("api/gstin/lookup")
    suspend fun lookupGstin(
        @Query("gstin") gstin: String
    ): Response<GstLookupResponse>

    // --- Product Inventory ---
    @GET("api/inventory")
    suspend fun getInventory(
        @Query("query") query: String? = null,
        @Query("category") category: String? = null,
        @Query("lowStockOnly") lowStockOnly: Boolean = false
    ): Response<InventoryResponse>

    @POST("api/inventory")
    suspend fun createProduct(@Body request: CreateProductRequest): Response<StandardApiResponse>
}
