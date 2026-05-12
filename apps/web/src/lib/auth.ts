export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  departmentId: string | null;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

const TOKEN_KEY = 'procureflow.accessToken';
const USER_KEY = 'procureflow.user';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage);
}

export function getAccessToken() {
  if (!canUseStorage()) {
    return null;
  }

  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const rawUser = window.sessionStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession(session: LoginResponse) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(TOKEN_KEY, session.accessToken);
  setStoredAuthUser(session.user);
}

export function setStoredAuthUser(user: AuthUser) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

export function logout() {
  clearAuthSession();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function buildLoginUrl(redirectTo?: string) {
  if (!redirectTo || redirectTo === '/login') {
    return '/login';
  }

  return `/login?redirect=${encodeURIComponent(redirectTo)}`;
}

export function redirectToLogin(redirectTo?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(buildLoginUrl(redirectTo));
}
