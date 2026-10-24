// src/ui/AppAlert.tsx
/**
 * Branded replacement for React Native's Alert: same `Alert.alert(title, message, buttons)` API,
 * rendered by <AppAlertHost /> (mounted once in App.tsx). Alerts raised while one is open are queued.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import AppIcon from '../icons/AppIcon';
import { translate } from '../i18n/LocaleProvider';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = { cancelable?: boolean };

type AlertRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

const BRAND = '#C53334';

let queue: AlertRequest[] = [];
let notify: (() => void) | null = null;

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    queue.push({
      title,
      message,
      buttons: buttons && buttons.length ? buttons : [{ text: translate('common.ok') }],
      options,
    });
    notify?.();
  },
};

type Tone = 'success' | 'error' | 'info';

/** The tone (icon + color) is inferred from the translated titles the app already uses. */
const toneOf = (title: string): Tone => {
  const is = (...keys: string[]) => keys.some((k) => translate(k) === title);
  if (is('common.success', 'establishment.confirmedTitle', 'profile.loggedOutTitle')) return 'success';
  if (is('common.error', 'establishment.slotTakenTitle')) return 'error';
  return 'info';
};

const TONES: Record<Tone, { icon: string; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: '#1E9E5A', bg: '#E8F6EE' },
  error: { icon: 'alert-circle', color: BRAND, bg: '#FBECEC' },
  info: { icon: 'information-circle', color: '#111111', bg: '#F1F1EF' },
};

export const AppAlertHost: React.FC = () => {
  const [current, setCurrent] = useState<AlertRequest | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    notify = () => setCurrent((cur) => cur ?? queue.shift() ?? null);
    notify();
    return () => {
      notify = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [current, progress]);

  const close = (button?: AlertButton) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrent(queue.shift() ?? null);
      button?.onPress?.();
    });
  };

  if (!current) return null;

  const tone = TONES[toneOf(current.title)];
  const cancelButton = current.buttons.find((b) => b.style === 'cancel');
  // Primary action last, like the native dialog; cancel is rendered as the quiet option.
  const actions = current.buttons.filter((b) => b !== cancelButton);
  const dismissable = current.options?.cancelable ?? !!cancelButton;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close(cancelButton)}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? () => close(cancelButton) : undefined} />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: progress,
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <AppIcon name={tone.icon} size={30} color={tone.color} />
          </View>

          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && <Text style={styles.message}>{current.message}</Text>}

          <View style={styles.actions}>
            {actions.map((b, i) => {
              const destructive = b.style === 'destructive';
              const primary = i === actions.length - 1;
              return (
                <TouchableOpacity
                  key={`${b.text}-${i}`}
                  onPress={() => close(b)}
                  activeOpacity={0.85}
                  style={[styles.button, { backgroundColor: primary ? BRAND : '#F1F1EF' }]}
                >
                  <Text style={[styles.buttonText, { color: primary ? '#FFFFFF' : destructive ? BRAND : '#111111' }]}>
                    {b.text ?? translate('common.ok')}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {cancelButton && (
              <TouchableOpacity onPress={() => close(cancelButton)} activeOpacity={0.6} style={styles.cancel}>
                <Text style={styles.cancelText}>{cancelButton.text ?? translate('common.cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,15,15,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: '#5F5F5F',
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 20,
    gap: 8,
  },
  button: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  cancel: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B6B6B',
  },
});
