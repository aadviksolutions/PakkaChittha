package com.pakkachittha.app.data.api

import com.pakkachittha.app.data.local.AppPreferences
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val appPreferences: AppPreferences) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()
            .header("Accept", "application/json")
            .header("User-Agent", "PakkachitthaNativeAndroid/1.0.0")

        val token = runBlocking {
            appPreferences.getSessionTokenSync()
        }

        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
            requestBuilder.header("x-session-token", token)
        }

        val response = chain.proceed(requestBuilder.build())

        if (response.code == 401) {
            // Session expired
            runBlocking {
                appPreferences.clearSession()
            }
        }

        return response
    }
}
