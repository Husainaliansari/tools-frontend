import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { appConfig } from '@config'
import { STORAGE_KEYS, HTTP_STATUS } from '@constants'

// ─── Create base instance ─────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
})

// ─── Request interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${appConfig.apiBaseUrl}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })
          // FastAPI envelope: tokens live under data.data.
          const tokens = data.data ?? data

          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.access_token)
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${tokens.access_token}`
          }

          return apiClient(originalRequest)
        } catch {
          // Refresh failed – clear tokens and redirect to login
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
          localStorage.removeItem(STORAGE_KEYS.USER)

          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  },
)

export { apiClient }
export type { AxiosInstance }
