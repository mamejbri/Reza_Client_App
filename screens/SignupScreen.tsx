import React, { useState } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { signup } from '../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SignupScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

    const isValidPhone = (phone: string) =>
        /^[0-9]{8}$/.test(phone);

    const canSubmit =
        phone &&
        email &&
        password &&
        isValidEmail(email) &&
        isValidPhone(phone) &&
        accepted &&
        !loading;

    const handleSignup = async () => {
        if (!phone || !email || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
            return;
        }

        if (!isValidEmail(email)) {
            Alert.alert('Erreur', 'Veuillez entrer une adresse e-mail valide.');
            return;
        }

        if (!isValidPhone(phone)) {
            Alert.alert('Erreur', 'Le numéro de téléphone doit contenir exactement 8 chiffres.');
            return;
        }

        if (!accepted) {
            Alert.alert('Erreur', 'Veuillez accepter les CGU.');
            return;
        }

        setLoading(true);
        const result = await signup(phone, email, password);
        setLoading(false);

        if (result.success) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Appointments' }],
            });
        } else {
            if (result.error === 'EMAIL_IN_USE') {
                Alert.alert('Adresse déjà utilisée', 'Cette adresse e-mail est déjà utilisée. Veuillez en choisir une autre.');
            } else {
                Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer plus tard.');
            }
        }
    };

    return (
        <ScrollView>
            <View className="flex-1 pt-12 px-4 pb-4 bg-white">
                <Text className="text-center text-2xl font-bold mb-10">Nouveau sur Reza ?</Text>

                <TextInput
                    placeholder="Numéro de téléphone"
                    keyboardType="phone-pad"
                    className="input-base mb-4"
                    placeholderTextColor="#000"
                    value={phone}
                    onChangeText={setPhone}
                />

                <TextInput
                    placeholder="E-mail"
                    className="input-base mb-4"
                    placeholderTextColor="#000"
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput
                    placeholder="Mot de passe"
                    secureTextEntry
                    className="input-base mb-3"
                    placeholderTextColor="#000"
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    onPress={() => setAccepted(!accepted)}
                    className="flex-row mb-11 gap-2.5">
                    <View className={`w-6 h-6 rounded-full items-center justify-center ${accepted ? 'bg-gray-400' : 'bg-black-12'}`} >
                        {accepted && <View className="w-4 h-4 rounded-full bg-danger" />}
                    </View>
                    <Text className="text-base italic underline">J’accepte les CGU de Reza</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSignup}
                    className={`btn-primary ${!canSubmit ? 'opacity-50' : ''}`}
                    disabled={!canSubmit}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="btn-primary-text">Créer mon compte</Text>
                    )}
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
