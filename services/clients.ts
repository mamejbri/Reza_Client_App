// services/clients.ts
import http from "../src/api/http";

/** --- Types from your backend contracts --- */
export interface ClientProfileResponse {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  photo?: string | null;
}

export interface UpdateClientProfileRequest {
  firstName?: string;
  lastName?: string;
  photo?: string | null;
}

/** (kept) Minimal DTOs if you still use them elsewhere */
export interface CreateClientPayload {
  nom?: string;
  prenom?: string;
  telephone: string;
}
export interface ClientDto {
  id: number;
  nom?: string;
  prenom?: string;
  telephone?: string;
}

/** Create (legacy helper if needed elsewhere) */
export async function createClientBasic(payload: CreateClientPayload): Promise<ClientDto> {
  const { data } = await http.post<ClientDto>("/clients", payload);
  return data;
}

/** 🔹 Load current client profile (GET /clients/me) */
export async function getClientProfile(): Promise<ClientProfileResponse | null> {
  try {
    const { data } = await http.get<ClientProfileResponse>("/clients/me");
    return data;
  } catch {
    return null;
  }
}

/** 🔹 Update current client profile (PUT /clients/me) */
export async function updateClientProfile(
  payload: UpdateClientProfileRequest
): Promise<{ success: boolean; data?: ClientProfileResponse; message?: string }> {
  try {
    const { data } = await http.put<ClientProfileResponse>("/clients/me", payload);
    return { success: true, data };
  } catch (e: any) {
    const message =
      e?.response?.data?.message ||
      e?.message ||
      "Échec de la mise à jour du profil.";
    return { success: false, message };
  }
}
