// src/screens/LoginScreen.tsx
import React, { useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Alert } from '../ui/AppAlert';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { login } from '../../services/auth';
import { useI18n } from '../i18n/LocaleProvider';
import { AuthLayout, AuthInput, AuthButton, AuthFooterLink, BRAND } from '../ui/AuthKit';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase());

  const canSubmit = !!email && !!password && isValidEmail(email) && !loading;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('common.fillAllFields'));
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(t('common.error'), t('common.invalidEmail'));
      return;
    }

    try {
      setLoading(true);
      const result = await login(email.trim(), password);
      setLoading(false);

      if (result.success) {
        // Back to where the user came from (e.g. a booking that needed a login); Home otherwise.
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        console.log('Login error:', result.message);
        Alert.alert(t('auth.loginFailed'), result.message);
      }
    } catch (e: any) {
      setLoading(false);
      console.log('Login exception:', e);
      Alert.alert(t('common.error'), e?.message ?? t('common.genericError'));
    }
  };

  return (
    <AuthLayout title={t('auth.welcomeBack')} subtitle={t('auth.loginSubtitle')}>
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
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={() => canSubmit && handleLogin()}
      />

      <TouchableOpacity
        style={styles.forgot}
        onPress={() => navigation.navigate('ForgotPassword')}
        hitSlop={8}
      >
        <Text style={styles.forgotText}>{t('auth.forgot')}</Text>
      </TouchableOpacity>

      <AuthButton
        label={t('auth.login')}
        onPress={handleLogin}
        disabled={!canSubmit}
        loading={loading}
      />

      <AuthFooterLink
        prompt={t('auth.noAccount')}
        action={t('auth.signupLink')}
        onPress={() => navigation.navigate('Signup')}
      />
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginTop: -2, marginBottom: 10 },
  forgotText: { color: BRAND, fontSize: 14, fontWeight: '600' },
});

export default LoginScreen;
