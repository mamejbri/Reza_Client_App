import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

type User = {
    id: number;
    email: string;
    phone: string;
    password: string;
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
            body: JSON.stringify({ phone, email, password }),
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

export const logout = async () => {
    await AsyncStorage.removeItem('user');
};
