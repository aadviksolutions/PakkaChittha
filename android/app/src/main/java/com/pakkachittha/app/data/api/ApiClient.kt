package com.pakkachittha.app.data.api

import android.content.Context
import com.google.gson.GsonBuilder
import com.pakkachittha.app.BuildConfig
import com.pakkachittha.app.data.local.AppPreferences
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    @Volatile
    private var apiService: PakkachitthaApiService? = null

    fun getService(context: Context): PakkachitthaApiService {
        return apiService ?: synchronized(this) {
            apiService ?: buildService(context).also { apiService = it }
        }
    }

    private fun buildService(context: Context): PakkachitthaApiService {
        val appPreferences = AppPreferences(context.applicationContext)
        val authInterceptor = AuthInterceptor(appPreferences)

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        val gson = GsonBuilder()
            .setLenient()
            .create()

        val retrofit = Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

        return retrofit.create(PakkachitthaApiService::class.java)
    }
}
