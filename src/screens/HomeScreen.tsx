// src/screens/HomeScreen.tsx
import React, { useState } from 'react';
import {
  Text,
  Pressable,
  ImageBackground,
  View,
  StatusBar,
  StyleSheet,
  I18nManager,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../types/navigation';
import { EstablishmentType } from '../../types/establishment';
import { useI18n } from '../i18n/LocaleProvider';
import { useResponsive, MAX_CONTENT_WIDTH } from '../utils/responsive';
import AppIcon from '../icons/AppIcon';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  background: '#FAFAF8',
  ink: '#111111',
  muted: '#6B6B6B',
  brand: '#C53334',
};

const categories = [
  {
    id: '1',
    type: EstablishmentType.RESTAURANT,
    image: require('../../assets/images/restaurant-bg.png'),
  },
  {
    id: '2',
    type: EstablishmentType.SPA,
    image: require('../../assets/images/coiffeur-bg.png'),
  },
  {
    id: '3',
    type: EstablishmentType.ACTIVITY,
    image: require('../../assets/images/activites-bg.png'),
  },
];

// No gradient library in the project: the bottom scrim is built from stacked bands
// whose opacity eases in, which reads as a smooth gradient on the photo.
const SCRIM_STEPS = 14;
const SCRIM_MAX_OPACITY = 0.82;
const scrimBands = Array.from({ length: SCRIM_STEPS }, (_, i) => {
  const t = (i + 1) / SCRIM_STEPS;
  return SCRIM_MAX_OPACITY * t * t;
});

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const chevron = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';
  const [pressedId, setPressedId] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom + 16, 28),
        }}
      >
        {/* HEADER */}
        <View style={{ paddingTop: scale(18), paddingBottom: scale(18) }}>
          <View style={styles.accent} />
          <Text
            style={{
              fontSize: scale(28),
              lineHeight: scale(34),
              fontWeight: '800',
              letterSpacing: -0.6,
              color: COLORS.ink,
              textAlign: 'left',
            }}
          >
            {t('home.title')}
          </Text>
          <Text
            style={{
              marginTop: scale(6),
              fontSize: scale(14.5),
              lineHeight: scale(20),
              color: COLORS.muted,
              textAlign: 'left',
            }}
          >
            {t('home.subtitle')}
          </Text>
        </View>

        {/*
          The 3 cards share whatever height is left under the navbar + header (flex: 1 each),
          so all of them are always fully visible, whatever the phone size — no scrolling.
        */}
        <View style={{ flex: 1, gap: 14 }}>
          {categories.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                navigation.navigate('SearchResults', {
                  type: item.type,
                })
              }
              onPressIn={() => setPressedId(item.id)}
              onPressOut={() => setPressedId(null)}
              accessibilityRole="button"
              accessibilityLabel={t(`types.${item.type}`)}
              // Static style on purpose: NativeWind's Pressable wrapper drops function styles,
              // which would lose flex: 1 and collapse the card to 0 height.
              style={[
                styles.cardShadow,
                pressedId === item.id && { transform: [{ scale: 0.98 }], opacity: 0.94 },
              ]}
            >
              <View style={styles.cardClip}>
                <ImageBackground source={item.image} resizeMode="cover" style={{ flex: 1 }}>
                  {/* Light overall tint so every photo sits in the same tonal range */}
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />

                  {/* Bottom scrim for text legibility */}
                  <View style={styles.scrim} pointerEvents="none">
                    {scrimBands.map((opacity, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${opacity})` }} />
                    ))}
                  </View>

                  {/* Label + call to action */}
                  <View style={styles.cardContent}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={{
                          fontSize: scale(22),
                          fontWeight: '800',
                          letterSpacing: -0.3,
                          color: '#FFFFFF',
                          textAlign: 'left',
                        }}
                      >
                        {t(`types.${item.type}`)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          marginTop: 2,
                          fontSize: scale(13),
                          color: 'rgba(255,255,255,0.82)',
                          textAlign: 'left',
                        }}
                      >
                        {t(`home.tagline.${item.type}`)}
                      </Text>
                    </View>

                    <AppIcon name={chevron} size={scale(24)} color="#FFFFFF" />
                  </View>
                </ImageBackground>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  accent: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.brand,
    marginBottom: 12,
  },
  // Shadow lives on the outer view, clipping on the inner one: overflow: 'hidden'
  // on the same view would cut the iOS shadow off.
  cardShadow: {
    flex: 1,
    minHeight: 0,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  cardClip: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  cardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
});

export default HomeScreen;
