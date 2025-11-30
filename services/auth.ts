// src/services/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../src/config/env';
import http from '../src/api/http';

type Ok = { success: true };
type Fail = { success: false; message: string };

export type LoginResult =
  | { success: true; token: string; clientId?: number }
  | Fail;

export type SignupResult = Ok | Fail;

const TOKEN_KEY = 'token';
const CLIENT_ID_KEY = 'clientId';

// Small safe helpers
export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredClientId(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function setTokenAndClientId(token: string, clientId?: number) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (typeof clientId === 'number' && Number.isFinite(clientId)) {
    await AsyncStorage.setItem(CLIENT_ID_KEY, String(clientId));
  }
}

/**
 * Login client.
 * Endpoint: POST /auth/login_client
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const url = `${API.BASE_URL}/auth/login_client`;
  console.log('POST', url, { email });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let msg = '';
      try {
        const b = await res.json();
        msg = b?.message || b?.error || '';
      } catch {}
      if (res.status === 401) {
        return {
          success: false,
          message: msg || 'Email ou mot de passe incorrect.',
        };
      }
      return {
        success: false,
        message: msg || `Erreur serveur (${res.status}).`,
      };
    }

    const data = await res.json();
    const token: string | undefined = data?.token;
    if (!token) {
      return {
        success: false,
        message: 'Réponse invalide du serveur (pas de token).',
      };
    }

    const clientId: number | undefined =
      (typeof data?.clientId === 'number' && data.clientId) ||
      (typeof data?.user?.clientId === 'number' && data.user.clientId) ||
      (typeof data?.client?.id === 'number' && data.client.id) ||
      undefined;

    await setTokenAndClientId(token, clientId);

    return { success: true, token, clientId };
  } catch (e: any) {
    return {
      success: false,
      message:
        e?.message?.toString?.() ||
        'Impossible de contacter le serveur.',
    };
  }
}

/**
 * CLIENT signup:
 * Endpoint: POST /auth/register_client
 */
export async function signup(
  phoneDigits: string,
  email: string,
  password: string
): Promise<SignupResult> {
  const url = `${API.BASE_URL}/auth/register_client`;
  console.log('POST', url, { email, phoneNumber: phoneDigits });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        phoneNumber: phoneDigits,
      }),
    });

    if (!res.ok) {
      let msg = '';
      try {
        const b = await res.json();
        msg = b?.message || b?.error || '';
      } catch {}
      if (res.status === 409)
        return { success: false, message: 'Adresse e-mail déjà utilisée.' };
      if (res.status === 400)
        return { success: false, message: msg || 'Données invalides.' };
      return {
        success: false,
        message: msg || `Erreur serveur (${res.status}).`,
      };
    }

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      message:
        e?.message?.toString?.() ||
        'Impossible de contacter le serveur.',
    };
  }
}

/** 🔹 Demande d’e-mail de réinitialisation de mot de passe */
export async function requestPasswordReset(email: string): Promise<void> {
  const base = API.BASE_URL.replace(/\/+$/, '');
  const url = `${base}/auth/forgot-password`;
  await http.post(url, { email });
}

export async function logout() {
  await AsyncStorage.multiRemove([TOKEN_KEY, CLIENT_ID_KEY]);
}
