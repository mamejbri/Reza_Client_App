// services/reservations.ts
import { API_BASE_URL } from '@env';
import { getCurrentUser } from './auth';

type Reservation = {
    id: string;
    place_id: string;
    date: string;
    time: string;
    people: number;
    status: string;
};

type Place = {
    id: string;
    name: string;
    address: string;
    images: string[];
};

export const fetchUserReservations = async (): Promise<any[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
    const fullUser = await userRes.json();

    const placesRes = await fetch(`${API_BASE_URL}/places`);
    const places: Place[] = await placesRes.json();

    const enrichedReservations = (fullUser.reservations || []).map((res: Reservation) => {
        const place = places.find((p) => p.id === res.place_id);
        return {
            ...res,
            name: place?.name,
            address: place?.address,
            image: { uri: place?.images?.[0] || '' },
        };
    });

    return enrichedReservations;
};
