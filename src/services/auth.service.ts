/**
 * AuthService – Handles all authentication API calls.
 * Extends BaseRepository and updates the auth store on success.
 */
import { BaseRepository } from '@api'
import type { ApiResponse, AuthTokens, LoginCredentials, RegisterPayload, User } from '@types'

class AuthService extends BaseRepository {
  protected readonly endpoint = '/api/auth'

  async login(
    credentials: LoginCredentials,
  ): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    return this.post('/login', credentials)
  }

  async register(
    payload: RegisterPayload,
  ): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    return this.post('/register', payload)
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.post('/logout')
  }

  async me(): Promise<ApiResponse<User>> {
    return this.get('/me')
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return this.post('/refresh', { refresh_token: refreshToken })
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.post('/forgot-password', { email })
  }

  async resetPassword(payload: {
    token: string
    email: string
    password: string
    password_confirmation: string
  }): Promise<ApiResponse<void>> {
    return this.post('/reset-password', payload)
  }
}

export const authService = new AuthService()
