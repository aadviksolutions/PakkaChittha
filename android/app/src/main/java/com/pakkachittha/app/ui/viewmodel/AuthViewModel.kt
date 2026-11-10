package com.pakkachittha.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pakkachittha.app.data.model.UserDto
import com.pakkachittha.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Authenticated(val user: UserDto, val businessName: String?) : AuthUiState()
    object Unauthenticated : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

class AuthViewModel(private val repository: AuthRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        checkSession()
    }

    fun checkSession() {
        viewModelScope.launch {
            repository.sessionToken.collect { token ->
                if (!token.isNullOrBlank()) {
                    val name = repository.userName.first() ?: "Vyapari"
                    val biz = repository.businessName.first()
                    _uiState.value = AuthUiState.Authenticated(
                        user = UserDto(id = "", email = "", name = name),
                        businessName = biz
                    )
                } else {
                    _uiState.value = AuthUiState.Unauthenticated
                }
            }
        }
    }

    fun login(email: String, pass: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val res = repository.login(email.trim(), pass)
            res.fold(
                onSuccess = { data ->
                    _uiState.value = AuthUiState.Authenticated(
                        user = data.user ?: UserDto(id = "", email = email, name = "Vyapari"),
                        businessName = data.business?.name
                    )
                },
                onFailure = { err ->
                    _uiState.value = AuthUiState.Error(err.message ?: "Invalid credentials")
                }
            )
        }
    }

    fun loginWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val res = repository.loginWithGoogle(idToken)
            res.fold(
                onSuccess = { data ->
                    _uiState.value = AuthUiState.Authenticated(
                        user = data.user ?: UserDto(id = "", email = "", name = "Vyapari"),
                        businessName = data.business?.name
                    )
                },
                onFailure = { err ->
                    _uiState.value = AuthUiState.Error(err.message ?: "Google sign-in failed")
                }
            )
        }
    }

    fun handleDirectSession(token: String, userId: String, email: String, name: String, businessName: String?) {
        _uiState.value = AuthUiState.Authenticated(
            user = UserDto(id = userId, email = email, name = name),
            businessName = businessName
        )
    }

    fun register(name: String, email: String, pass: String, bizName: String?) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val res = repository.register(name.trim(), email.trim(), pass, bizName?.trim())
            res.fold(
                onSuccess = { data ->
                    _uiState.value = AuthUiState.Authenticated(
                        user = data.user ?: UserDto(id = "", email = email, name = name),
                        businessName = data.business?.name
                    )
                },
                onFailure = { err ->
                    _uiState.value = AuthUiState.Error(err.message ?: "Registration failed")
                }
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _uiState.value = AuthUiState.Unauthenticated
        }
    }

    fun resetError() {
        if (_uiState.value is AuthUiState.Error) {
            _uiState.value = AuthUiState.Unauthenticated
        }
    }
}
