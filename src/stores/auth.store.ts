import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginCredentials, RegisterPayload, AuthTokens } from '@types'
import { STORAGE_KEYS, DEMO_USER } from '@constants'

/**
 * Authentication store.
 * Manages user identity, tokens, and session lifecycle.
 */
export const useAuthStore = defineStore('auth', () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN))
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ─── Getters ──────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)
  const currentUser = computed(() => user.value)
  const userPlan = computed(() => user.value?.plan ?? 'free')
  const isAdmin = computed(() => !!user.value?.is_admin)

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Hydrate auth state from persisted tokens.
   * Called once on app boot via router guard.
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)

    if (token) {
      accessToken.value = token
      const stored = localStorage.getItem(STORAGE_KEYS.USER)
      if (stored) {
        try {
          user.value = JSON.parse(stored) as User
        } catch {
          _clearSession()
        }
      }
    }

    isInitialized.value = true
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { authService } = await import('@services')
      const response = await authService.login(credentials)
      setSession(response.data.tokens, response.data.user)
    } catch (err) {
      error.value = _errorMessage(err, 'Invalid email or password.')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function register(payload: RegisterPayload): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { authService } = await import('@services')
      const response = await authService.register(payload)
      setSession(response.data.tokens, response.data.user)
    } catch (err) {
      error.value = _errorMessage(err, 'Could not create the account.')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    try {
      const { authService } = await import('@services')
      await authService.logout()
    } catch {
      // Stateless tokens — clearing locally is what matters.
    } finally {
      _clearSession()
      isLoading.value = false
    }
  }

  function _errorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const response = (err as { response?: { data?: { error?: { message?: string } } } }).response
      return response?.data?.error?.message ?? fallback
    }
    return fallback
  }

  function setSession(tokens: AuthTokens, currentUser: User): void {
    accessToken.value = tokens.access_token
    user.value = currentUser

    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.access_token)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser))
  }

  function setUser(updatedUser: User): void {
    user.value = updatedUser
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser))
  }

  /**
   * Establishes a demo session so the authenticated app is explorable without a
   * backend. Replace with a real `authService` call once the API is wired up.
   */
  function signInAsDemo(): void {
    const now = new Date().toISOString()
    const demoUser: User = {
      id: 'demo-user',
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      email_verified_at: now,
      avatar: null,
      plan: 'pro',
      created_at: now,
      updated_at: now,
    }
    const demoTokens: AuthTokens = {
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    }
    setSession(demoTokens, demoUser)
    isInitialized.value = true
  }

  function _clearSession(): void {
    user.value = null
    accessToken.value = null

    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
  }

  return {
    // State
    user,
    accessToken,
    isInitialized,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    currentUser,
    userPlan,
    isAdmin,
    // Actions
    initialize,
    login,
    register,
    logout,
    setSession,
    setUser,
    signInAsDemo,
  }
})
