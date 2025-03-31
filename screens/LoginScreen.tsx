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
        <View className="flex-1 p-6 bg-white justify-center">
            <Text className="text-center text-xl font-bold mb-8">Vous avez déjà un compte réza</Text>
            <TextInput placeholder="E-mail" className="input-base mb-4" placeholderTextColor="#000" />
            <TextInput placeholder="Mot de passe" secureTextEntry className="input-base mb-3" placeholderTextColor="#000"  />
            <TouchableOpacity className="mb-4"><Text className="text-right text-blue-500 mb-42">Mot de passe oublié ?</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleLogin} className="btn-primary">
                <Text className="btn-primary-text">Se connecter</Text>
            </TouchableOpacity>
            <Text className="text-center my-42">Ou</Text>
            <Text className="text-center font-medium mb-8">Nouveau sur Reza ?</Text>
            <TouchableOpacity className="btn-outline" onPress={() => navigation.navigate('Signup')}>
                <Text className="btn-outline-text">Créer mon compte</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;
