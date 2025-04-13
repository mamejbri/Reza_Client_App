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

type ReservationUpdate = {
    reservationId: string;
    newDate: string;
    newTime: string;
    newPeople: number;
};

export const fetchUserReservations = async () => {
    const user = await getCurrentUser();
    if (!user) return [];

    const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
    const fullUser = await userRes.json();

    const placesRes = await fetch(`${API_BASE_URL}/places`);
    const places = await placesRes.json();

    return (fullUser.reservations || []).map((res: Reservation) => {
        const place = places.find((p: any) => p.id === res.place_id);

        return {
            ...res,
            place,
            name: place?.name,
            address: place?.address,
            image: { uri: place?.images?.[0] || '' },
        };
    });
};

export const updateReservation = async (
    reservationId: string,
    placeId: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string,
    newPeople: number
): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        // Fetch user
        const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
        const userData = await userRes.json();

        // Update reservation
        const updatedReservations = (userData.reservations || []).map((res: any) =>
            res.id === reservationId
                ? {
                    ...res,
                    date: newDate,
                    time: newTime,
                    people: newPeople,
                }
                : res
        );

        await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservations: updatedReservations }),
        });

        // Update slots in place
        const placeRes = await fetch(`${API_BASE_URL}/places/${placeId}`);
        const place = await placeRes.json();
        const updatedSlots = { ...place.available_slots };

        // Clear old slot
        if (updatedSlots[oldDate]) {
            updatedSlots[oldDate] = updatedSlots[oldDate].map((s) =>
                s.time === oldTime && s.reserved_by === user.id
                    ? { ...s, reserved_by: null }
                    : s
            );
        }

        // Set new slot
        if (updatedSlots[newDate]) {
            updatedSlots[newDate] = updatedSlots[newDate].map((s) =>
                s.time === newTime && s.reserved_by === null
                    ? { ...s, reserved_by: user.id }
                    : s
            );
        }

        await fetch(`${API_BASE_URL}/places/${placeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available_slots: updatedSlots }),
        });

        return true;
    } catch (err) {
        console.error('updateReservation error:', err);
        return false;
    }
};


export const cancelReservation = async (
    reservationId: string,
    placeId: string,
    date: string,
    time: string
): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
        const userData = await userRes.json();

        const updatedReservations = (userData.reservations || []).filter(
            (res: any) => res.id !== reservationId
        );

        await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservations: updatedReservations }),
        });

        const placeRes = await fetch(`${API_BASE_URL}/places/${placeId}`);
        const place = await placeRes.json();

        const updatedSlots = { ...place.available_slots };

        if (updatedSlots[date]) {
            updatedSlots[date] = updatedSlots[date].map((s) =>
                s.time === time && s.reserved_by === user.id
                    ? { ...s, reserved_by: null }
                    : s
            );
        }

        await fetch(`${API_BASE_URL}/places/${placeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available_slots: updatedSlots }),
        });

        return true;
    } catch (err) {
        console.error('cancelReservation error:', err);
        return false;
    }
};

export const addReservation = async (
    placeId: string,
    date: string,
    time: string,
    people: number
): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        // Generate a unique reservation ID
        const reservationId = `res_${Date.now()}`;

        // Fetch current user data
        const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
        const userData = await userRes.json();

        const newReservation: Reservation = {
            id: reservationId,
            place_id: placeId,
            date,
            time,
            people,
            status: 'confirmed',
        };

        const updatedReservations = [...(userData.reservations || []), newReservation];

        // Update user reservations
        await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservations: updatedReservations }),
        });

        // Fetch and update place slots
        const placeRes = await fetch(`${API_BASE_URL}/places/${placeId}`);
        const place = await placeRes.json();
        const updatedSlots = { ...place.available_slots };

        if (updatedSlots[date]) {
            updatedSlots[date] = updatedSlots[date].map((s: any) =>
                s.time === time && s.reserved_by === null
                    ? { ...s, reserved_by: user.id }
                    : s
            );
        }

        await fetch(`${API_BASE_URL}/places/${placeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available_slots: updatedSlots }),
        });

        return true;
    } catch (err) {
        console.error('addReservation error:', err);
        return false;
    }
};
