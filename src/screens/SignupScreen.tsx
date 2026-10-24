// src/screens/SignupScreen.tsx
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Alert } from '../ui/AppAlert';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { signup } from '../../services/auth';
import { useI18n } from '../i18n/LocaleProvider';
import AppIcon from '../icons/AppIcon';
import { AuthLayout, AuthInput, AuthButton, AuthFooterLink, BRAND } from '../ui/AuthKit';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());
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
      Alert.alert(t('common.error'), t('signup.formInvalid'));
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
        Alert.alert(t('signup.failed'), result.message || t('common.genericError'));
      }
    } catch (e: any) {
      setLoading(false);
      console.log('Signup exception:', e);
      Alert.alert(t('common.error'), e?.message ?? t('common.genericError'));
    }
  };

  return (
    <AuthLayout title={t('signup.title')} subtitle={t('signup.subtitle')}>
      <AuthInput
        icon="mail-outline"
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        valid={isValidEmail(email)}
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <AuthInput
        ref={passwordRef}
        icon="lock-closed-outline"
        placeholder={t('auth.password')}
        secure
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />

      <AuthInput
        ref={phoneRef}
        icon="call-outline"
        placeholder={t('signup.phone')}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        value={phone}
        valid={isValidPhone(phoneDigits)}
        // keep only digits, capped at 13 to match the validator
        onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 13))}
        maxLength={13}
      />

      <Pressable
        onPress={() => setAccepted((prev) => !prev)}
        style={styles.terms}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
          {accepted && <AppIcon name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={styles.termsText}>{t('signup.acceptCgu')}</Text>
      </Pressable>

      <AuthButton
        label={t('auth.createAccount')}
        onPress={handleSignup}
        disabled={!canSubmit}
        loading={loading}
      />

      <AuthFooterLink
        prompt={t('signup.haveAccount')}
        action={t('auth.login')}
        onPress={() => navigation.navigate('Login')}
      />
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  terms: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#C9C4BE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: { backgroundColor: BRAND, borderColor: BRAND },
  termsText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#4A4540' },
});

export default SignupScreen;
