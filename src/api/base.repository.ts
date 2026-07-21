/**
 * Base repository class providing typed HTTP helpers.
 * All service classes should extend this.
 */
import { apiClient } from './client'
import type { AxiosRequestConfig } from 'axios'
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@types'

export abstract class BaseRepository {
  protected abstract readonly endpoint: string

  protected get<T>(path: string = '', config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return apiClient.get<ApiResponse<T>>(`${this.endpoint}${path}`, config).then((r) => r.data)
  }

  protected getPaginated<T>(
    params?: PaginationParams,
    config?: AxiosRequestConfig,
  ): Promise<PaginatedResponse<T>> {
    return apiClient
      .get<PaginatedResponse<T>>(this.endpoint, { params, ...config })
      .then((r) => r.data)
  }

  protected post<T>(
    path: string = '',
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return apiClient
      .post<ApiResponse<T>>(`${this.endpoint}${path}`, data, config)
      .then((r) => r.data)
  }

  protected put<T>(
    path: string = '',
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return apiClient
      .put<ApiResponse<T>>(`${this.endpoint}${path}`, data, config)
      .then((r) => r.data)
  }

  protected patch<T>(
    path: string = '',
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return apiClient
      .patch<ApiResponse<T>>(`${this.endpoint}${path}`, data, config)
      .then((r) => r.data)
  }

  protected delete<T>(path: string = '', config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return apiClient.delete<ApiResponse<T>>(`${this.endpoint}${path}`, config).then((r) => r.data)
  }

  protected postFormData<T>(
    path: string = '',
    formData: FormData,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return apiClient
      .post<ApiResponse<T>>(`${this.endpoint}${path}`, formData, {
        ...config,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  }
}
