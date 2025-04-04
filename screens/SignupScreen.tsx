import React, { useState } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SignupScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    const [accepted, setAccepted] = useState(false);

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
        <ScrollView>
            <View className="flex-1 pt-12 px-4 pb-4 bg-white">
                <Text className="text-center text-2xl font-bold mb-10">Nouveau sur Reza ?</Text>
                <TextInput placeholder="Numéro de téléphone" keyboardType="phone-pad" className="input-base mb-4" placeholderTextColor="#000" />
                <TextInput placeholder="E-mail" className="input-base mb-4" placeholderTextColor="#000" />
                <TextInput placeholder="Mot de passe" secureTextEntry className="input-base mb-3" placeholderTextColor="#000" />
                <TouchableOpacity
                    onPress={() => setAccepted(!accepted)}
                    className="flex-row mb-11 gap-2.5">
                    <View className={`w-6 h-6 rounded-full items-center justify-center ${accepted ? 'bg-gray-400' : 'bg-black-12'}`} >
                        {accepted && <View className="w-4 h-4 rounded-full bg-danger" />}
                    </View>
                    <Text className="text-base italic underline">
                        J’accepte les CGU de Reza
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogin} className="btn-primary">
                    <Text className="btn-primary-text">Créer mon compte</Text>
                </TouchableOpacity>
                <View className="flex-row items-center my-11 px-4">
                    <View className="flex-1 h-px bg-black" />
                    <Text className="mx-3 text-base text-black">Ou</Text>
                    <View className="flex-1 h-px bg-black" />
                </View>
                <Text className="text-center text-lg font-medium mb-8">Vous avez déjà un compte réza</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')} className="btn-outline">
                    <Text className="btn-outline-text">Se connecter</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default SignupScreen;
