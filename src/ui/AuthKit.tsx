// src/ui/AuthKit.tsx — shared building blocks for the Login / Signup screens.
import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../icons/AppIcon';

const heroImage = require('../../assets/images/background.png');

export const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';
const FIELD_BG = '#F5F3F0';
const NAVBAR_HEIGHT = 62;

/** Full-screen auth layout: photo hero with title, then a rounded white sheet holding the form. */
export const AuthLayout: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground source={heroImage} style={styles.hero} resizeMode="cover">
          <View style={styles.heroShade} />
          <View style={styles.heroFade} />
          <View style={[styles.heroText, { paddingTop: insets.top + NAVBAR_HEIGHT + 24 }]}>
            <View style={styles.accent} />
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </ImageBackground>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

type AuthInputProps = TextInputProps & {
  icon: string;
  /** Renders a show/hide toggle and masks the value. */
  secure?: boolean;
  /** Shows a green check once the value is valid. */
  valid?: boolean;
};

export const AuthInput = forwardRef<TextInput, AuthInputProps>(
  ({ icon, secure, valid, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);

    return (
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <AppIcon name={icon} size={20} color={focused ? BRAND : MUTED} />
        <TextInput
          ref={ref}
          {...props}
          secureTextEntry={secure && hidden}
          placeholderTextColor={MUTED}
          style={[styles.fieldInput, style]}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button">
            <AppIcon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={MUTED} />
          </TouchableOpacity>
        ) : valid ? (
          <AppIcon name="checkmark-circle" size={20} color="#2E9E5B" />
        ) : null}
      </View>
    );
  }
);

export const AuthButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}> = ({ label, onPress, disabled, loading }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    accessibilityRole="button"
    style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <View style={styles.buttonRow}>
        <Text style={styles.buttonText}>{label}</Text>
        <AppIcon name="arrow-forward" size={20} color="#fff" />
      </View>
    )}
  </TouchableOpacity>
);

/** "New to Reza? Sign up" style line at the bottom of the sheet. */
export const AuthFooterLink: React.FC<{ prompt: string; action: string; onPress: () => void }> = ({
  prompt,
  action,
  onPress,
}) => (
  <View style={styles.footer}>
    <Text style={styles.footerPrompt}>{prompt} </Text>
    <TouchableOpacity onPress={onPress} hitSlop={8} accessibilityRole="link">
      <Text style={styles.footerAction}>{action}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },

  hero: { minHeight: 320, justifyContent: 'flex-end', backgroundColor: INK },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,8,6,0.45)' },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(12,8,6,0.35)',
  },
  heroText: { paddingHorizontal: 24, paddingBottom: 56 },
  accent: { width: 36, height: 3, borderRadius: 2, backgroundColor: BRAND, marginBottom: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 22, marginTop: 8, maxWidth: 320 },

  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 14,
  },

  field: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: FIELD_BG,
  },
  fieldFocused: { borderColor: BRAND, backgroundColor: '#FFFFFF' },
  fieldInput: { flex: 1, height: '100%', fontSize: 16, color: INK, paddingVertical: 0 },

  button: {
    height: 58,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 'auto', paddingTop: 24 },
  footerPrompt: { color: MUTED, fontSize: 15 },
  footerAction: { color: BRAND, fontSize: 15, fontWeight: '700' },
});
