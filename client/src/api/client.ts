/**
 * Base API Client
 * 
 * Provides a centralized HTTP client for making API requests with
 * consistent error handling and authentication.
 */

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Base request options
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make an API request with proper error handling
 */
async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      ...headers,
    },
  };

  if (body) {
    config.headers = {
      ...config.headers,
      'Content-Type': 'application/json',
    };
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    let details;
    
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
      details = json.details || json.errors;
    } catch {
      // Not JSON, use text as message
    }
    
    throw new APIError(response.status, message, details);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

/**
 * API client with typed methods
 */
export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  patch: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
  put: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export default api;
