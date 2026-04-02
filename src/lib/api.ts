import { useStore } from '@/lib/store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success?: boolean
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Get the auth token from Zustand store.
   * Must be called outside of React components.
   */
  private getToken(): string | null {
    // Access the store state directly (safe for non-React usage)
    const state = useStore.getState()
    return state.token
  }

  /**
   * Build headers with auth token and content type.
   */
  private buildHeaders(custom?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(custom as Record<string, string>),
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Handle 401 responses by clearing auth state and redirecting to login.
   */
  private handleUnauthorized(): void {
    const state = useStore.getState()
    if (state.isAuthenticated) {
      state.logout()
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  /**
   * Core request handler with error handling.
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { body, headers: customHeaders, ...restOptions } = options
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: this.buildHeaders(customHeaders),
        body: body ? JSON.stringify(body) : undefined,
      })

      // Handle unauthorized
      if (response.status === 401) {
        this.handleUnauthorized()
        return { error: 'Sesi Anda telah berakhir. Silakan login kembali.' }
      }

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Request gagal dengan status ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          // Use default error message if response is not JSON
        }
        return { error: errorMessage }
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { data: undefined as T, success: true }
      }

      // Parse successful response
      // API routes return { success: true, data: <payload> } or { success: false, error: <msg> }
      const json = await response.json()

      // If the API returns a structured response with success/error, unwrap it
      if (typeof json === 'object' && json !== null && 'success' in json) {
        if (json.success === false) {
          return { error: json.error || json.message || 'Terjadi kesalahan' }
        }
        // Return the inner data payload directly
        return { data: json.data as T, success: true }
      }

      // For responses without success wrapper, return as-is
      return { data: json as T, success: true }
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return { error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' }
      }
      const message =
        error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      return { error: message }
    }
  }

  /**
   * GET request.
   */
  async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request.
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  /**
   * PUT request.
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  /**
   * PATCH request.
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  /**
   * DELETE request.
   */
  async delete<T = unknown>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL)

// Export shorthand functions
export const apiGet = <T = unknown>(url: string, options?: RequestOptions) =>
  api.get<T>(url, options)

export const apiPost = <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
  api.post<T>(url, body, options)

export const apiPut = <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
  api.put<T>(url, body, options)

export const apiPatch = <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
  api.patch<T>(url, body, options)

export const apiDelete = <T = unknown>(url: string, options?: RequestOptions) =>
  api.delete<T>(url, options)
