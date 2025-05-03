import { API_BASE_URL } from '@env';

export interface Moyen {
    id: string;
    name: string;
    image: string;
}

export const fetchGlobalMoyens = async (): Promise<Moyen[]> => {
    const res = await fetch(`${API_BASE_URL}/moyens`);
    if (!res.ok) throw new Error('Failed to fetch moyens');
    return await res.json();
};
