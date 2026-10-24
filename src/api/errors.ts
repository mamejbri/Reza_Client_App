import { isAxiosError } from 'axios';

/** The backend answers 409 SLOT_UNAVAILABLE when the slot was taken (e.g. by a concurrent booking). */
export function isSlotUnavailable(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    error.response?.status === 409 &&
    (error.response?.data as { code?: string } | undefined)?.code === 'SLOT_UNAVAILABLE'
  );
}
