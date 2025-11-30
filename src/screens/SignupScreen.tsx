// src/screens/SignupScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { signup } from '../../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ✅ Prefilled with values that pass your validators:
// - email: valid format
// - password: non-empty
// - phone: exactly 13 digits (you currently require 13 digits)
const DEFAULT_EMAIL = 'user@example.com';
const DEFAULT_PASSWORD = '12345678';
const DEFAULT_PHONE_13_DIGITS = '2161234567890'; // 13 digits

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [phone, setPhone] = useState(DEFAULT_PHONE_13_DIGITS);
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.toLowerCase());
  const isValidPhone = (digitsOnly: string) => /^[0-9]{13}$/.test(digitsOnly);

  const phoneDigits = useMemo(() => phone.replace(/\D/g, ''), [phone]);

  const canSubmit =
    !!phoneDigits &&
    !!email &&
    !!password &&
    isValidEmail(email) &&
    isValidPhone(phoneDigits) &&
    accepted &&
    !loading;

  const handleSignup = async () => {
    if (!canSubmit) {
      Alert.alert('Erreur', "Veuillez remplir correctement le formulaire et accepter les CGU.");
      return;
    }
    try {
      setLoading(true);
      const result = await signup(phoneDigits.trim(), email.trim(), password);
      setLoading(false);

      if (result.success) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        console.log('Signup error:', result.message);
        Alert.alert('Inscription échouée', result.message || 'Une erreur est survenue.');
      }
    } catch (e: any) {
      setLoading(false);
      console.log('Signup exception:', e);
      Alert.alert('Erreur', e?.message ?? 'Une erreur est survenue.');
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View className="flex-1 pt-12 px-4 pb-4 bg-white">
        <Text className="text-center text-2xl font-bold mb-10">Nouveau sur Reza ?</Text>

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
          className="input-base mb-3"
          placeholderTextColor="#000"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
        />

        <TextInput
          placeholder="Numéro de téléphone (13 chiffres)"
          keyboardType="phone-pad"
          className="input-base mb-4"
          placeholderTextColor="#000"
          value={phone}
          onChangeText={(v) => {
            // keep only digits as user types
            const digits = v.replace(/\D/g, '');
            // cap at 13 digits to match your validator
            setPhone(digits.slice(0, 13));
          }}
          maxLength={13}
        />

        {/* ✅ Pretty checkbox + label, side-by-side */}
        <Pressable
          onPress={() => setAccepted((prev) => !prev)}
          className="flex-row items-center gap-3 mb-11"
          android_ripple={{ color: '#eee' }}
          hitSlop={8}
        >
          <View
            className={`w-6 h-6 rounded-md border items-center justify-center ${
              accepted ? 'bg-danger border-danger' : 'bg-white border-gray-400'
            }`}
          >
            {accepted ? (
              <Text className="text-white text-sm">✓</Text>
            ) : (
              <Text className="text-transparent text-sm">✓</Text>
            )}
          </View>
          <Text className="text-base underline">J’accepte les CGU de Reza</Text>
        </Pressable>

        {/* --- BUTTON Submit Signup --- */}
<View className="px-4">
  <TouchableOpacity
    onPress={handleSignup}
    className={`btn-primary ${!canSubmit ? 'opacity-50' : ''}`}
    disabled={!canSubmit}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text className="btn-primary-text">Créer mon compte</Text>
    )}
  </TouchableOpacity>
</View>


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
