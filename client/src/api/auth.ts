/**
 * Authentication API
 */

import api, { APIError } from './client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  username: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
}

/**
 * Login with username and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return api.post<LoginResponse>('/api/login', credentials);
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
  await api.post('/api/logout');
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await api.get<AuthCheckResponse>('/api/auth/check');
    return response.authenticated;
  } catch (error) {
    if (error instanceof APIError && error.status === 401) {
      return false;
    }
    throw error;
  }
}

export const authApi = {
  login,
  logout,
  checkAuth,
};

export default authApi;
