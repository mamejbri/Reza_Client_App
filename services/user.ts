// src/services/user.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import http from '../src/api/http';
import { API } from '../src/config/env';
import { getToken, getStoredClientId, setStoredClientId } from '../src/api/auth';

const USER_CACHE_KEY = 'currentUser';

export type CurrentUser = {
  id?: number | string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  clientId?: number | null;
};
export type UpdateUserPayload = Partial<Pick<CurrentUser, 'firstName' | 'lastName' | 'photo'>>;
export type UpdateResult = { success: boolean; message?: string };

export async function clearCachedUser() {
  try { await AsyncStorage.removeItem(USER_CACHE_KEY); } catch {}
}
async function readCachedUser(): Promise<CurrentUser | null> {
  try { const raw = await AsyncStorage.getItem(USER_CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function writeCachedUser(u: CurrentUser) {
  try { await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u)); } catch {}
}

function decodeJwtPayload(token: string): any | null {
  try {
    const [, b64] = token.split('.');
    if (!b64) return null;
    const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    const bin = globalThis.atob
      ? globalThis.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
    const json = decodeURIComponent(
      bin.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch { return null; }
}

export async function getCurrentUser(forceRefresh = false): Promise<CurrentUser | null> {
  if (!forceRefresh) {
    const cached = await readCachedUser();
    if (cached) return cached;
  }

  const token = await getToken();
  if (!token) { await clearCachedUser(); return null; }

  // Prefer backend
  for (const url of [`${API.BASE_URL}/clients/me`, `${API.BASE_URL}/users/me`]) {
    try {
      const { data } = await http.get<CurrentUser>(url);
      const withClientId: CurrentUser = { ...data, clientId: data?.clientId ?? (await getStoredClientId()) ?? null };
      if (withClientId.clientId != null) await setStoredClientId(withClientId.clientId);
      await writeCachedUser(withClientId);
      return withClientId;
    } catch { /* try next */ }
  }

  // Fallback: decode token
  const payload = decodeJwtPayload(token);
  if (payload && (payload.email || payload.sub)) {
    const guessed: CurrentUser = {
      id: payload.uid ?? payload.userId ?? payload.sub,
      email: payload.email,
      firstName: payload.firstName ?? payload.given_name,
      lastName: payload.lastName ?? payload.family_name,
      clientId: payload.cid ?? (await getStoredClientId()) ?? null,
    };
    await writeCachedUser(guessed);
    return guessed;
  }
  return null;
}

export async function updateCurrentUser(patch: UpdateUserPayload): Promise<UpdateResult> {
  for (const url of [`${API.BASE_URL}/clients/me`, `${API.BASE_URL}/users/me`]) {
    try {
      const { data } = await http.put<CurrentUser>(url, patch);
      const existing = (await readCachedUser()) ?? {};
      const merged: CurrentUser = { ...existing, ...data, ...patch };
      if (merged.clientId != null) await setStoredClientId(merged.clientId);
      await writeCachedUser(merged);
      return { success: true };
    } catch { /* next */ }
  }
  return { success: false, message: 'Impossible de mettre à jour le profil.' };
}
