// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { login } from '../../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState('dali@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase());

  const canSubmit = !!email && !!password && isValidEmail(email) && !loading;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse e-mail valide.');
      return;
    }

    try {
      setLoading(true);
      const result = await login(email.trim(), password);
      setLoading(false);

      if (result.success) {
        if (typeof result.clientId === 'number') {
          console.log('Login OK — clientId:', result.clientId);
          console.log('**********', result.token);
        } else {
          console.log(
            'Login OK — no clientId in response (will still be able to navigate).'
          );
        }

        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        console.log('Login error:', result.message);
        Alert.alert('Connexion échouée', result.message);
      }
    } catch (e: any) {
      setLoading(false);
      console.log('Login exception:', e);
      Alert.alert('Erreur', e?.message ?? 'Une erreur est survenue.');
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View className="flex-1 pt-12 px-4 pb-4 bg-white">
        <Text className="text-center text-2xl font-bold mb-10">
          Vous avez déjà un compte réza
        </Text>

        <TextInput
          placeholder="E-mail"
          className="input-base mb-4"
          placeholderTextColor="#000"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <TextInput
          placeholder="Mot de passe"
          secureTextEntry
          className="input-base mb-2.5"
          placeholderTextColor="#000"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={() => canSubmit && handleLogin()}
        />

        {/* 🔹 Ouverture de l'écran "Mot de passe oublié" */}
        <TouchableOpacity
          className="mb-4"
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text className="text-base italic underline mb-11">
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          className={`btn-primary ${!canSubmit ? 'opacity-50' : ''}`}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="btn-primary-text">Se connecter</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center my-11 px-4">
          <View className="flex-1 h-px bg-black" />
          <Text className="mx-3 text-base text-black">Ou</Text>
          <View className="flex-1 h-px bg-black" />
        </View>

        <Text className="text-center text-lg font-medium mb-8">
          Nouveau sur Reza ?
        </Text>
        <TouchableOpacity
          className="btn-outline"
          onPress={() => navigation.navigate('Signup')}
        >
          <Text className="btn-outline-text">Créer mon compte</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default LoginScreen;
