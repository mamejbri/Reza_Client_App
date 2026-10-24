import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from './LocaleProvider';
import AppIcon from '../icons/AppIcon';

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';

/** Compact "FR · MAD" button that opens a language/currency picker. */
const LocaleSwitcher: React.FC<{ light?: boolean }> = ({ light }) => {
  const { lang, languages, setLanguage, selectedCurrency, currencies, setCurrency, t } = useI18n();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const chip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
    >
      {active && <AppIcon name="checkmark" size={15} color="#fff" />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityLabel={t('locale.title')}
        activeOpacity={0.7}
        style={[styles.trigger, { backgroundColor: light ? 'rgba(0,0,0,0.35)' : '#F3F3F1' }]}
      >
        <AppIcon name="globe-outline" size={15} color={light ? '#FFFFFF' : INK} />
        <Text style={[styles.triggerText, { color: light ? '#FFFFFF' : INK }]}>
          {lang.toUpperCase()} · {selectedCurrency}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{t('locale.title')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel={t('common.close')}>
                <AppIcon name="close" size={24} color={INK} />
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>{t('locale.language')}</Text>
            <View style={styles.chips}>
              {languages.map((l) => chip(l.label, l.code === lang, () => setLanguage(l.code), l.code))}
            </View>

            <Text style={styles.section}>{t('locale.currency')}</Text>
            <View style={styles.chips}>
              {currencies.map((c) => chip(c, c === selectedCurrency, () => setCurrency(c), c))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triggerText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },

  backdrop: { flex: 1, backgroundColor: 'rgba(12,8,6,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#DDD8D2', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 19, fontWeight: '800', color: INK },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E0DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 14, fontWeight: '600', color: INK },
  chipTextActive: { color: '#FFFFFF' },
});

export default LocaleSwitcher;
