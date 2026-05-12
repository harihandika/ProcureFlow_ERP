import { apiClient } from '@/lib/api-client';
import type { AuthUser, LoginResponse } from '@/lib/auth';

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<AuthUser>('/auth/me');
  return response.data;
}
