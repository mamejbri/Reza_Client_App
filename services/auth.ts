import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

type User = {
    id: number;
    email: string;
    phone: string;
    password: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
};

export const signup = async (
    phone: string,
    email: string,
    password: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Check if the email already exists
        const res = await fetch(`${API_BASE_URL}/users?email=${email}`);
        const users: User[] = await res.json();

        if (users.length > 0) {
            return { success: false, error: 'EMAIL_IN_USE' };
        }

        // Create new user
        const createRes = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, email, password, firstName: '', lastName: '', photo: '' }),
        });

        if (!createRes.ok) {
            return { success: false, error: 'CREATE_FAILED' };
        }

        const newUser = await createRes.json();

        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'NETWORK_ERROR' };
    }
};

export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const user = await AsyncStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
};

export const login = async (
    email: string,
    password: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/users?email=${email}&password=${password}`);
        const users: User[] = await res.json();

        if (users.length === 0) {
            return { success: false, error: 'INVALID_CREDENTIALS' };
        }

        await AsyncStorage.setItem('user', JSON.stringify(users[0]));
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: 'NETWORK_ERROR' };
    }
};

export const updateCurrentUser = async (updates: Partial<User>): Promise<{ success: boolean }> => {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false };
        }

        const updatedUser = { ...currentUser, ...updates };

        const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        if (!res.ok) {
            return { success: false };
        }

        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
};

export const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'Utilisateur introuvable' };

        if (user.password !== currentPassword) {
            return { success: false, error: 'Mot de passe actuel incorrect' };
        }

        const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword }),
        });

        if (!res.ok) {
            return { success: false, error: 'Erreur serveur' };
        }

        // Update local storage
        user.password = newPassword;
        await AsyncStorage.setItem('user', JSON.stringify(user));

        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: 'Erreur réseau' };
    }
};

export const logout = async () => {
    await AsyncStorage.removeItem('user');
};
