// src/types/establishment.ts
export enum EstablishmentType {
  SPA = 'SPA',
  RESTAURANT = 'RESTAURANT',
  ACTIVITY = 'ACTIVITY',
}

/** Translation keys — render with t(ESTABLISHMENT_LABELS[type]). */
export const ESTABLISHMENT_LABELS: Record<EstablishmentType, string> = {
  [EstablishmentType.SPA]: 'types.SPA',
  [EstablishmentType.RESTAURANT]: 'types.RESTAURANT',
  [EstablishmentType.ACTIVITY]: 'types.ACTIVITY',
};
