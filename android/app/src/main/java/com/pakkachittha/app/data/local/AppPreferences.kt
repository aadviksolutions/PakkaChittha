package com.pakkachittha.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "pakkachittha_prefs")

class AppPreferences(private val context: Context) {

    companion object {
        private val KEY_SESSION_TOKEN = stringPreferencesKey("session_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_USER_NAME = stringPreferencesKey("user_name")
        private val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        private val KEY_BUSINESS_ID = stringPreferencesKey("business_id")
        private val KEY_BUSINESS_NAME = stringPreferencesKey("business_name")
        private val KEY_LANGUAGE = stringPreferencesKey("preferred_language")
    }

    val sessionToken: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_SESSION_TOKEN]
    }

    val userName: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_USER_NAME]
    }

    val businessName: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_BUSINESS_NAME]
    }

    val preferredLanguage: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_LANGUAGE] ?: "en"
    }

    suspend fun saveLanguage(lang: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_LANGUAGE] = if (lang == "hi") "hi" else "en"
        }
    }

    suspend fun getSessionTokenSync(): String? {
        return context.dataStore.data.first()[KEY_SESSION_TOKEN]
    }

    suspend fun saveAuthSession(
        token: String,
        userId: String?,
        name: String?,
        email: String?,
        businessId: String?,
        businessName: String?
    ) {
        context.dataStore.edit { prefs ->
            prefs[KEY_SESSION_TOKEN] = token
            if (userId != null) prefs[KEY_USER_ID] = userId
            if (name != null) prefs[KEY_USER_NAME] = name
            if (email != null) prefs[KEY_USER_EMAIL] = email
            if (businessId != null) prefs[KEY_BUSINESS_ID] = businessId
            if (businessName != null) prefs[KEY_BUSINESS_NAME] = businessName
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.remove(KEY_SESSION_TOKEN)
            prefs.remove(KEY_USER_ID)
            prefs.remove(KEY_USER_NAME)
            prefs.remove(KEY_USER_EMAIL)
            prefs.remove(KEY_BUSINESS_ID)
            prefs.remove(KEY_BUSINESS_NAME)
        }
    }
}
