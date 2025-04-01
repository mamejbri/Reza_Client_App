import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    const handleLogin = () => {
        // TODO: Replace with real login logic
        const isAuthenticated = true;

        if (isAuthenticated) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Appointments' }],
            });
        }
    };

    return (
        <View className="flex-1 pt-12 px-4 pb-4 bg-white">
            <Text className="text-center text-2xl font-bold mb-10">Vous avez déjà un compte réza</Text>
            <TextInput placeholder="E-mail" className="input-base mb-4" placeholderTextColor="#000" />
            <TextInput placeholder="Mot de passe" secureTextEntry className="input-base mb-2.5" placeholderTextColor="#000" />
            <TouchableOpacity className="mb-4"><Text className="text-base italic underline mb-11">Mot de passe oublié ?</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleLogin} className="btn-primary">
                <Text className="btn-primary-text">Se connecter</Text>
            </TouchableOpacity>
            <View className="flex-row items-center my-11 px-4">
                <View className="flex-1 h-px bg-black" />
                <Text className="mx-3 text-base text-black">Ou</Text>
                <View className="flex-1 h-px bg-black" />
            </View>
            <Text className="text-center text-lg font-medium mb-8">Nouveau sur Reza ?</Text>
            <TouchableOpacity className="btn-outline" onPress={() => navigation.navigate('Signup')}>
                <Text className="btn-outline-text">Créer mon compte</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;
