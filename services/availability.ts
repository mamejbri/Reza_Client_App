// src/services/availability.ts
import http from '../src/api/http';
import { API } from '../src/config/env';

export type AvailabilitySlotsResponse = {
  prestationId: number;
  etablissementId: number;
  date: string;              // "YYYY-MM-DD"
  durationMinutes: number;
  stepMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  slots: string[];           // ["HH:mm", ...]
};

/**
 * Get 15-min (by default) start times where at least one eligible collaborator
 * is free for the whole prestation duration (incl. optional buffers).
 */
export async function fetchPrestationAvailability(
  etablissementId: number,
  prestationId: number,
  dateISO: string,            // "YYYY-MM-DD"
  stepMinutes = 15,
  bufferBefore = 0,
  bufferAfter = 0
): Promise<AvailabilitySlotsResponse> {
  const url = `${API.BASE_URL}/availability/prestations/${encodeURIComponent(
    String(prestationId)
  )}/slots`;

  const { data } = await http.get<AvailabilitySlotsResponse>(url, {
    params: {
      etablissementId,
      date: dateISO,
      step: stepMinutes,
      bufferBefore,
      bufferAfter,
    },
  });
  return data;
}

/**
 * Start times for a whole cart: its prestations one after the other (a pack as its steps),
 * each by someone qualified and free for it. Only the first prestation used to be checked.
 */
export async function fetchPanierAvailability(
  etablissementId: number,
  prestationIds: number[],
  dateISO: string,
  collaborateurByPrestation: Record<number, number | null> = {},
  excludeReservationId?: number
): Promise<AvailabilitySlotsResponse> {
  const pins = Object.entries(collaborateurByPrestation)
    .filter(([, c]) => c != null)
    .map(([p, c]) => `${p}:${c}`);

  const { data } = await http.get<AvailabilitySlotsResponse>(`${API.BASE_URL}/availability/panier/slots`, {
    params: {
      etablissementId,
      prestationIds: prestationIds.join(','),
      date: dateISO,
      collaborateurs: pins.length ? pins.join(',') : undefined,
      excludeReservationId,
    },
  });
  return data;
}
