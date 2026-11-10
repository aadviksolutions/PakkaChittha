package com.pakkachittha.app.data.repository

import com.pakkachittha.app.data.api.PakkachitthaApiService
import com.pakkachittha.app.data.local.AppPreferences
import com.pakkachittha.app.data.model.*
import kotlinx.coroutines.flow.Flow

class AuthRepository(
    private val api: PakkachitthaApiService,
    private val prefs: AppPreferences
) {
    val sessionToken: Flow<String?> = prefs.sessionToken
    val userName: Flow<String?> = prefs.userName
    val businessName: Flow<String?> = prefs.businessName

    suspend fun login(email: String, pass: String): Result<AuthResponse> {
        return try {
            val res = api.login(LoginRequest(email, pass))
            if (res.isSuccessful && res.body()?.success == true) {
                val data = res.body()!!
                val token = data.sessionToken ?: data.token ?: ""
                prefs.saveAuthSession(
                    token = token,
                    userId = data.user?.id,
                    name = data.user?.name,
                    email = data.user?.email,
                    businessId = data.business?.id,
                    businessName = data.business?.name
                )
                Result.success(data)
            } else {
                val errMsg = res.body()?.error ?: res.errorBody()?.string() ?: "Invalid login credentials."
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun loginWithGoogle(idToken: String): Result<AuthResponse> {
        return try {
            val res = api.authenticateWithGoogle(GoogleAuthRequest(idToken = idToken, credential = idToken))
            if (res.isSuccessful && res.body()?.success == true) {
                val data = res.body()!!
                val token = data.sessionToken ?: data.token ?: ""
                prefs.saveAuthSession(
                    token = token,
                    userId = data.user?.id,
                    name = data.user?.name,
                    email = data.user?.email,
                    businessId = data.business?.id,
                    businessName = data.business?.name
                )
                Result.success(data)
            } else {
                val errMsg = res.body()?.error ?: res.errorBody()?.string() ?: "Google authentication failed."
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(name: String, email: String, pass: String, bizName: String?): Result<AuthResponse> {
        return try {
            val res = api.register(RegisterRequest(name, email, pass, bizName))
            if (res.isSuccessful && res.body()?.success == true) {
                val data = res.body()!!
                val token = data.sessionToken ?: data.token ?: ""
                prefs.saveAuthSession(
                    token = token,
                    userId = data.user?.id,
                    name = data.user?.name,
                    email = data.user?.email,
                    businessId = data.business?.id,
                    businessName = data.business?.name
                )
                Result.success(data)
            } else {
                val errMsg = res.body()?.error ?: "Registration failed."
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {}
        prefs.clearSession()
    }
}
