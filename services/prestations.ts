import http from '../src/api/http';
import { API } from '../src/config/env';

export interface PrestationCategorie {
  id: number;
  nom: string;
  description?: string;
}

export interface Prestation {
  id: number;
  nom: string;
  description: string;
  prixFixe: number | null;
  prixMin: number | null;
  prixMax: number | null;
  durationMinutes: number | null;
  preparationTimeMinutes: number | null;
  categorieId: number;
  categorieNom: string;
  validated?: boolean;
  /** "Affichée mais non réservable": listed, but cannot be booked online. */
  showAsUnavailable?: boolean;
  /** Who the client may ask for (first names), when the prestation needs someone. */
  collaborateurOptions?: { id: number; label: string }[] | null;
  /** A pack: its steps (done one after the other). */
  etapeIds?: number[] | null;
}

export const isBookable = (p: Prestation) => p.validated !== false && !p.showAsUnavailable;

export interface PageResult<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

export async function fetchCategories(etablissementId: number): Promise<PrestationCategorie[]> {
  const url = `${API.BASE_URL}/prestation-categories/etablissement/${etablissementId}?page=0&size=50&sort=id,asc`;
  const { data } = await http.get<PageResult<PrestationCategorie>>(url);
  return data.content;
}

export async function fetchPrestationsByCategory(categorieId: number): Promise<Prestation[]> {
  const url = `${API.BASE_URL}/prestations/categorie/${categorieId}`;
  const { data } = await http.get<Prestation[]>(url);
  return data;
}
