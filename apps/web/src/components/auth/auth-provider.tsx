'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage, isUnauthorizedApiError } from '@/lib/api-error';
import { getCurrentUser, login, type LoginPayload } from '@/lib/auth-api';
import {
  clearAuthSession,
  getAccessToken,
  getAuthUser,
  setAuthSession,
  setStoredAuthUser,
  type AuthUser,
} from '@/lib/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const currentUserQueryKey = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [storedUser, setStoredUser] = useState<AuthUser | null>(() => getAuthUser());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    enabled: Boolean(accessToken),
    retry: false,
  });

  const user = currentUserQuery.data ?? storedUser;
  const status: AuthStatus = !accessToken
    ? 'unauthenticated'
    : user
      ? 'authenticated'
      : currentUserQuery.isLoading
        ? 'loading'
        : 'unauthenticated';

  useEffect(() => {
    if (currentUserQuery.data) {
      setStoredUser(currentUserQuery.data);
      setStoredAuthUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data]);

  useEffect(() => {
    if (!currentUserQuery.isError) {
      return;
    }

    if (isUnauthorizedApiError(currentUserQuery.error)) {
      clearAuthSession();
      setAccessToken(null);
      setStoredUser(null);
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
    }
  }, [currentUserQuery.error, currentUserQuery.isError, queryClient]);

  const handleLogin = useCallback(async (payload: LoginPayload) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const session = await login(payload);
      setAuthSession(session);
      setAccessToken(session.accessToken);
      setStoredUser(session.user);
      queryClient.setQueryData(currentUserQueryKey, session.user);
      return session.user;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Login failed. Please check your credentials and try again.');
      setLoginError(message);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }, [queryClient]);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    setAccessToken(null);
    setStoredUser(null);
    setLoginError(null);
    queryClient.removeQueries({ queryKey: currentUserQueryKey });
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (!accessToken) {
      return null;
    }

    const refreshedUser = await queryClient.fetchQuery({
      queryKey: currentUserQueryKey,
      queryFn: getCurrentUser,
    });

    setStoredUser(refreshedUser);
    setStoredAuthUser(refreshedUser);

    return refreshedUser;
  }, [accessToken, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoggingIn,
      loginError,
      login: handleLogin,
      logout: handleLogout,
      refreshUser,
    }),
    [handleLogin, handleLogout, isLoggingIn, loginError, refreshUser, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
