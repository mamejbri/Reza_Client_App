// src/services/etablissements.ts
import http from '../src/api/http';
import { API } from '../src/config/env';
import { EstablishmentType } from '../types/establishment';

export type OpeningHoursDto = {
  day?: string | null;          // "MONDAY"..."SUNDAY"
  morningOpen?: string | null;  // "HH:mm"
  morningClose?: string | null; // "HH:mm"
  eveningOpen?: string | null;  // "HH:mm"
  eveningClose?: string | null; // "HH:mm"
};

export type NearbyEtablissementDTO = EtablissementDTO & {
  distanceKm?: number | null;
};

export interface EtablissementDTO {
  id: number;
  nom: string;
  lieu?: string | null;
  businessType: EstablishmentType;

  imageUrl?: string | null;
  photoPaths?: string[] | null;
  menuPhotoPaths?: string[] | null;
  description?: string | null;

  image?: string | null;
  cover?: string | null;
  mainImage?: string | null;
  photo?: string | null;
photos?: {
    id: number;
    url: string;
    menuPhoto: boolean;
    primary: boolean;
    [key: string]: any;
  }[];
  address?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;

  /** unified fields: allow null too */
  rating?: number | null;
  reviewsCount?: number | null;

  priceRange?: string | null;

  openingHours?: OpeningHoursDto[] | null;
  todayHours?: OpeningHoursDto | null;

  nextSlots?: string[] | null;
}


export interface PageResult<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function fetchEtablissementsByTypes(
  types: EstablishmentType[] | EstablishmentType,
  page = 0,
  size = 10,
  sortBy = 'nom'
): Promise<PageResult<EtablissementDTO>> {
  const list = Array.isArray(types) ? types : [types];
  const params = new URLSearchParams();

  list.forEach((t) => params.append('types', t));

  const base = API.BASE_URL.replace(/\/+$/, '');
  const url =
    `${base}/etablissements/find_type/` +
    `${page}/${size}/${encodeURIComponent(sortBy)}?${params.toString()}`;

  console.log('fetchEtablissementsByTypes URL:', url);

  const { data } = await http.get<PageResult<EtablissementDTO>>(url);

  if (data.content && data.content.length > 0) {
    const first = data.content[0];
    console.log(
      'ETABS FIRST ITEM (from backend):',
      JSON.stringify(
        {
          id: first.id,
          nom: first.nom,
          imageUrl: first.imageUrl,
          photoPaths: first.photoPaths,
          menuPhotoPaths: first.menuPhotoPaths,
        },
        null,
        2,
      ),
    );
  } else {
    console.log('ETABS: empty content array');
  }

  return data;
}
export async function fetchNearbyEtablissements(
  businessType: EstablishmentType,
  lat: number,
  lng: number,
  radiusKm: number,
  page = 0,
  size = 20
): Promise<PageResult<NearbyEtablissementDTO>> {
  const base = API.BASE_URL.replace(/\/+$/, '');

  const params = new URLSearchParams();
  params.set('businessType', businessType);
  params.set('lat', String(lat));
  params.set('lng', String(lng));
  params.set('radiusKm', String(radiusKm));
  params.set('page', String(page));
  params.set('size', String(size));

  const url = `${base}/etablissements/nearby?${params.toString()}`;

  console.log('fetchNearbyEtablissements URL:', url);

  const { data } = await http.get<PageResult<NearbyEtablissementDTO>>(url);

  if (data.content && data.content.length > 0) {
    const first = data.content[0];
    console.log(
      'NEARBY FIRST ITEM (from backend):',
      JSON.stringify(
        {
          id: first.id,
          nom: first.nom,
          distanceKm: first.distanceKm,
          imageUrl: first.imageUrl,
          photoPaths: first.photoPaths,
        },
        null,
        2,
      ),
    );
  } else {
    console.log('NEARBY: empty content array');
  }

  return data;
}

export async function fetchEtablissementById(
  id: number
): Promise<EtablissementDTO> {
  const base = API.BASE_URL.replace(/\/+$/, '');
  const url = `${base}/etablissements/find/by/id/${id}`;

  console.log('fetchEtablissementById URL:', url);

  const { data } = await http.get<EtablissementDTO>(url);

  const photos = Array.isArray((data as any).photos)
    ? (data as any).photos.map((p: any) => ({
        id: p.id,
        url: p.url,
        primary: p.primary,
        menuPhoto: p.menuPhoto,
      }))
    : null;

  console.log(
    '%cMOBILE REZA DTO',
    'background:#222;color:#fff;padding:4px',
    JSON.stringify(
      {
        id: data.id,
        nom: data.nom,
        imageUrl: data.imageUrl,
        photoPaths: data.photoPaths,
        menuPhotoPaths: data.menuPhotoPaths,
        photos,
      },
      null,
      2,
    ),
  );

  return data;
}


export async function fetchSearchEtablissements(req: any): Promise<PageResult<EtablissementDTO>> {
  const base = API.BASE_URL.replace(/\/+$/, '');
  const url = `${base}/etablissements/search`;

  console.log("SEARCH PAYLOAD:", JSON.stringify(req, null, 2));

  const { data } = await http.post<PageResult<EtablissementDTO>>(url, req);
  return data;
}

