import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { logout, getCurrentUser } from '../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const user = await getCurrentUser();
            if (user) {
                setEmail(user.email || '');
                setPhone(user.phone || '');
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        await logout();
        Alert.alert('Déconnecté', 'Vous avez été déconnecté.');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    return (
        <ScrollView>
            <View className="flex-1 bg-white px-6 pt-12 pb-8">
                <Text className="text-2xl font-bold mb-8 text-center">Mon Profil</Text>

                <Text className="text-base font-medium mb-2">Adresse e-mail</Text>
                <TextInput
                    value={email}
                    editable={false}
                    className="input-base mb-6 bg-gray-100 text-black"
                    placeholderTextColor="#000"
                />

                <Text className="text-base font-medium mb-2">Numéro de téléphone</Text>
                <TextInput
                    value={phone}
                    editable={false}
                    className="input-base mb-10 bg-gray-100 text-black"
                    placeholderTextColor="#000"
                />

                <TouchableOpacity onPress={handleLogout} className="btn-outline w-full">
                    <Text className="btn-outline-text text-center">Déconnexion</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default ProfileScreen;
