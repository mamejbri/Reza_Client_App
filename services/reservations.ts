import { API_BASE_URL } from '@env';
import { getCurrentUser } from './auth';

type Reservation = {
    id: string;
    place_id: string;
    date: string;
    time: string;
    people?: number;
    status: string;
    program_id?: string;
};

type Place = {
    id: string;
    name: string;
    address: string;
    images: string[];
    programs?: any[];
};

export const fetchUserReservations = async () => {
    const user = await getCurrentUser();
    if (!user) return [];

    const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
    const fullUser = await userRes.json();

    const placesRes = await fetch(`${API_BASE_URL}/places`);
    const places = await placesRes.json();

    return (fullUser.reservations || []).map((res: Reservation) => {
        const place = places.find((p: Place) => p.id === res.place_id);
        const program = res.program_id
            ? place?.programs?.find((p: any) => p.id === res.program_id)
            : undefined;

        return {
            ...res,
            place,
            name: place?.name,
            address: place?.address,
            image: { uri: place?.images?.[0] || '' },
            program,
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
    newPeople?: number,
    newProgramId?: string
): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        // Fetch user
        const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
        const userData = await userRes.json();

        // Update reservation in user
        const updatedReservations = (userData.reservations || []).map((res: Reservation) =>
            res.id === reservationId
                ? {
                    ...res,
                    date: newDate,
                    time: newTime,
                    people: newPeople,
                    program_id: newProgramId ?? res.program_id,
                }
                : res
        );

        await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservations: updatedReservations }),
        });

        // Fetch place
        const placeRes = await fetch(`${API_BASE_URL}/places/${placeId}`);
        const place = await placeRes.json();

        if (newProgramId) {
            // Program-based reservation
            const programs = place.programs || [];

            const oldProgram = programs.find((p: any) => p.id === (newProgramId ?? res.program_id));
            const newProgram = programs.find((p: any) => p.id === newProgramId);

            if (oldProgram?.available_slots?.[oldDate]) {
                oldProgram.available_slots[oldDate] = oldProgram.available_slots[oldDate].map((s: any) =>
                    s.time === oldTime && s.reserved_by === user.id ? { ...s, reserved_by: null } : s
                );
            }

            if (newProgram?.available_slots?.[newDate]) {
                newProgram.available_slots[newDate] = newProgram.available_slots[newDate].map((s: any) =>
                    s.time === newTime && s.reserved_by === null ? { ...s, reserved_by: user.id } : s
                );
            }

            await fetch(`${API_BASE_URL}/places/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ programs }),
            });
        } else {
            // Non-program reservation (e.g. restaurant)
            const updatedSlots = { ...place.available_slots };

            if (updatedSlots[oldDate]) {
                updatedSlots[oldDate] = updatedSlots[oldDate].map((s: any) =>
                    s.time === oldTime && s.reserved_by === user.id ? { ...s, reserved_by: null } : s
                );
            }

            if (updatedSlots[newDate]) {
                updatedSlots[newDate] = updatedSlots[newDate].map((s: any) =>
                    s.time === newTime && s.reserved_by === null ? { ...s, reserved_by: user.id } : s
                );
            }

            await fetch(`${API_BASE_URL}/places/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available_slots: updatedSlots }),
            });
        }

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
    time: string,
    programId?: string
): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
        const userData = await userRes.json();

        const updatedReservations = (userData.reservations || []).filter(
            (res: Reservation) => res.id !== reservationId
        );

        await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservations: updatedReservations }),
        });

        const placeRes = await fetch(`${API_BASE_URL}/places/${placeId}`);
        const place = await placeRes.json();

        if (programId) {
            const programs = place.programs || [];
            const program = programs.find((p: any) => p.id === programId);

            if (program?.available_slots?.[date]) {
                program.available_slots[date] = program.available_slots[date].map((s: any) =>
                    s.time === time && s.reserved_by === user.id ? { ...s, reserved_by: null } : s
                );
            }

            await fetch(`${API_BASE_URL}/places/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ programs }),
            });
        } else {
            const updatedSlots = { ...place.available_slots };

            if (updatedSlots[date]) {
                updatedSlots[date] = updatedSlots[date].map((s: any) =>
                    s.time === time && s.reserved_by === user.id ? { ...s, reserved_by: null } : s
                );
            }

            await fetch(`${API_BASE_URL}/places/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available_slots: updatedSlots }),
            });
        }

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
    people?: number,
    programId?: string
): Promise<Reservation | null> => {
    try {
        const user = await getCurrentUser();
        if (!user) return null;

        const userRes = await fetch(`${API_BASE_URL}/users/${user.id}`);
        const userData = await userRes.json();

        const alreadyExists = (userData.reservations || []).some(
            (r: Reservation) => r.place_id === placeId && r.date === date && r.time === time
        );
        if (alreadyExists) return null;

        const reservationId = `res_${Date.now()}`;

        const newReservation: Reservation = {
            id: reservationId,
            place_id: placeId,
            date,
            time,
            status: 'pending',
            ...(people ? { people } : {}),
            ...(programId ? { program_id: programId } : {}),
        };

        const updatedReservations = [...(userData.reservations || []), newReservation];
        await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservations: updatedReservations }),
        });

        const placeRes = await fetch(`${API_BASE_URL}/places/${placeId}`);
        const place = await placeRes.json();

        if (programId) {
            const programs = place.programs || [];
            const program = programs.find((p: any) => p.id === programId);

            if (program?.available_slots?.[date]) {
                program.available_slots[date] = program.available_slots[date].map((s: any) =>
                    s.time === time && s.reserved_by === null ? { ...s, reserved_by: user.id } : s
                );
            }

            await fetch(`${API_BASE_URL}/places/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ programs }),
            });
        } else {
            const updatedSlots = { ...place.available_slots };
            if (updatedSlots[date]) {
                updatedSlots[date] = updatedSlots[date].map((s: any) =>
                    s.time === time && s.reserved_by === null ? { ...s, reserved_by: user.id } : s
                );
            }

            await fetch(`${API_BASE_URL}/places/${placeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available_slots: updatedSlots }),
            });
        }

        return newReservation;
    } catch (err) {
        console.error('addReservation error:', err);
        return null;
    }
};
