import { API } from "../src/config/env";
import { CONTENT_LANG_HEADER, getContentLanguage } from "../src/i18n/contentLanguage";

export interface FilterOption {
  id: number;
  value: string;     //  <-- 🔥 ADD THIS
  libelle: string;
  group: string;
}

export type FilterGroup = {
  groupLabel: string;
  group: string;
  options: FilterOption[];
};

export async function fetchFilterGroups(type: string): Promise<FilterGroup[]> {
  const url = `${API.BASE_URL}/filters/by-business-type?businessType=${type.toUpperCase()}`;
  const res = await fetch(url, { headers: { [CONTENT_LANG_HEADER]: getContentLanguage() } });
console.log("CALLING:", url);

  if (!res.ok) {
    console.log("❌ Backend responded with:", res.status);
    throw new Error("Unable to fetch filters");
  }

  return res.json();
}


export async function fetchMyFilters(): Promise<FilterOption[]> {
  const url = `${API.BASE_URL}/filters/me`;
  const res = await fetch(url, { headers: { [CONTENT_LANG_HEADER]: getContentLanguage() } });
  if (!res.ok) throw new Error("Unable to fetch selected filters");
  return res.json();
}

export async function updateMyFilters(ids: number[]): Promise<void> {
  const url = `${API.BASE_URL}/filters/me`;
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filterIds: ids }),
  });
}
