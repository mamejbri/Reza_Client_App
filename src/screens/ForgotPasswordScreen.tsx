// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { Alert } from '../ui/AppAlert';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { requestPasswordReset } from '../../services/auth';
import { useI18n } from '../i18n/LocaleProvider';
import { AuthLayout, AuthInput, AuthButton, AuthFooterLink } from '../ui/AuthKit';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase());

  const canSubmit = !!email && isValidEmail(email) && !loading;

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('forgot.emailRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(t('common.error'), t('common.invalidEmail'));
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(email.trim());
      setLoading(false);

      Alert.alert(
        t('forgot.sentTitle'),
        t('forgot.sentMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e: any) {
      setLoading(false);
      console.log('Forgot password error:', e);
      Alert.alert(
        t('common.error'),
        e?.message ?? t('forgot.error')
      );
    }
  };

  return (
    <AuthLayout title={t('forgot.title')} subtitle={t('forgot.copy')}>
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
        returnKeyType="send"
        onSubmitEditing={() => canSubmit && handleSubmit()}
      />

      <AuthButton
        label={t('forgot.send')}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={loading}
      />

      <AuthFooterLink prompt="" action={t('forgot.back')} onPress={() => navigation.goBack()} />
    </AuthLayout>
  );
};

export default ForgotPasswordScreen;
