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
  /** Skip cache — force fresh request */
  noCache?: boolean
}

// ==================== SIMPLE MEMORY CACHE ====================
// Caches GET responses for 15 seconds.
// Mutation calls (POST/PUT/DELETE) invalidate related cache automatically.

interface CacheEntry<T = unknown> {
  data: ApiResponse<T>
  timestamp: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry>()
  private defaultTtl: number

  constructor(ttlMs = 15_000) {
    this.defaultTtl = ttlMs
  }

  get<T>(key: string): ApiResponse<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.defaultTtl) {
      this.cache.delete(key)
      return null
    }
    return entry.data as ApiResponse<T>
  }

  set<T>(key: string, data: ApiResponse<T>): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /** Invalidate all entries matching a prefix (e.g. '/api/products') */
  invalidate(prefix?: string): void {
    if (!prefix) {
      this.cache.clear()
      return
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /** Clean up expired entries */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTtl) {
        this.cache.delete(key)
      }
    }
  }
}

const apiCache = new ApiCache(15_000) // 15 second cache

// Auto-cleanup every 60 seconds
if (typeof window !== 'undefined') {
  setInterval(() => apiCache.cleanup(), 60_000)
}

// ==================== API CLIENT ====================

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    const state = useStore.getState()
    return state.token
  }

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

  private handleUnauthorized(): void {
    const state = useStore.getState()
    if (state.isAuthenticated) {
      state.logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  private buildCacheKey(method: string, url: string, body?: unknown): string {
    if (body) {
      return `${method}:${url}:${JSON.stringify(body)}`
    }
    return `${method}:${url}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { body, headers: customHeaders, noCache, ...restOptions } = options
    const method = restOptions.method?.toUpperCase() || 'GET'
    const url = `${this.baseUrl}${endpoint}`
    const cacheKey = this.buildCacheKey(method, url, body)

    // For GET requests, check cache first (unless noCache is true)
    if (method === 'GET' && !noCache) {
      const cached = apiCache.get<T>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: this.buildHeaders(customHeaders),
        body: body ? JSON.stringify(body) : undefined,
      })

      if (response.status === 401) {
        this.handleUnauthorized()
        return { error: 'Sesi Anda telah berakhir. Silakan login kembali.' }
      }

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

      if (response.status === 204) {
        const result: ApiResponse<T> = { data: undefined as T, success: true }
        if (method === 'GET' && !noCache) {
          apiCache.set(cacheKey, result)
        }
        return result
      }

      const json = await response.json()

      let result: ApiResponse<T>

      if (typeof json === 'object' && json !== null && 'success' in json) {
        if (json.success === false) {
          result = { error: json.error || json.message || 'Terjadi kesalahan' }
        } else {
          result = { data: json.data as T, success: true }
        }
      } else {
        result = { data: json as T, success: true }
      }

      // Cache successful GET responses
      if (method === 'GET' && !noCache && result.success) {
        apiCache.set(cacheKey, result)
      }

      // Invalidate cache on mutations (POST/PUT/PATCH/DELETE)
      if (method !== 'GET' && result.success) {
        apiCache.invalidate(endpoint.split('?')[0])
      }

      return result
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return { error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' }
      }
      const message =
        error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
      return { error: message }
    }
  }

  async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  async delete<T = unknown>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /** Clear all cached responses, or by prefix */
  clearCache(prefix?: string): void {
    apiCache.invalidate(prefix)
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

/** Force refresh — skip cache for next GET request */
export const apiRefresh = <T = unknown>(url: string, options?: RequestOptions) =>
  api.get<T>(url, { ...options, noCache: true })
