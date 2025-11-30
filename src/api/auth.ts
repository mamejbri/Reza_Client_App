import http from './http';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCachedUser } from '../../services/user';

export type LoginReq  = { email: string; password: string };
export type LoginResp = { token: string; userId: number; email: string; clientId?: number };

const TOKEN_KEY = 'token';
const CLIENT_ID_KEY = 'client_id';

export async function setStoredClientId(id: number | null | undefined) {
  try {
    if (typeof id === 'number') await AsyncStorage.setItem(CLIENT_ID_KEY, String(id));
    else await AsyncStorage.removeItem(CLIENT_ID_KEY);
  } catch {}
}
export async function getStoredClientId(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(CLIENT_ID_KEY);
    return val != null ? Number(val) : null;
  } catch { return null; }
}
export async function getToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function login(req: LoginReq): Promise<LoginResp> {
  const { data } = await http.post<LoginResp>('/auth/login_client', req);
  if (data?.token) {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    http.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    if (data.clientId) await setStoredClientId(data.clientId);
  }
  return data;
}

export async function logout() {
  await AsyncStorage.multiRemove([TOKEN_KEY, CLIENT_ID_KEY]);
  delete (http.defaults.headers.common as any)['Authorization'];
  await clearCachedUser();
}
