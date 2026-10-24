// src/screens/AppointmentsScreen.tsx
import React, { useCallback, useState } from 'react';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppIcon from '../icons/AppIcon';
import Profile from '../../components/Profile';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import dayjs from 'dayjs';

import {
  fetchUserReservations,
  fetchUserPastReservations,
} from '../../services/reservations';
import { API } from '../config/env';
import { useI18n } from '../i18n/LocaleProvider';
import { useResponsive, SCROLL_DECELERATION, MAX_CONTENT_WIDTH } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';
const SURFACE = '#F5F3F0';

const ABS = /^https?:\/\//i;
const resolveImg = (p?: string) => {
  if (!p) return "";
  if (ABS.test(p)) return p;
  return API.BASE_URL.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");
};

const getFinalImage = (item: any) => {
  if (item.imageUrl) return resolveImg(item.imageUrl);

  if (item.photos?.length) return resolveImg(item.photos[0]);

  return "";
};


type Nav = NativeStackNavigationProp<RootStackParamList, 'Appointments'>;

/** "2025-04-15" -> "Mardi 15 avr. 2025" in the current app language. */
function frPrettyDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  const label = d.format('dddd D MMM YYYY');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function hhmm(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
}

/** Shown when the establishment has no profile picture (or it fails to load). */
const fallbackImg = require('../../assets/images/default_image.jpg');

// ================================
// CARD (defined outside the screen so photos don't reload on every render)
// ================================
const Card = ({ item, width, onPress }: { item: any; width: number; onPress: () => void }) => {
  const finalImage = getFinalImage(item);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const d = dayjs(item.date);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[styles.card, { width }]}>
      {/* IMAGE */}
      <View style={[styles.cardImageBox, { height: Math.round(width * 0.5) }]}>
        {/* Blurred placeholder until the real photo loads */}
        {!imgLoaded && (
          <Image source={fallbackImg} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={5} />
        )}
        <Image
          source={finalImage && !imgFailed ? { uri: finalImage } : fallbackImg}
          style={{ width: '100%', height: '100%', opacity: imgLoaded ? 1 : 0 }}
          resizeMode="cover"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
        />

        {/* Calendar tile */}
        {d.isValid() && (
          <View style={styles.dateTile}>
            <Text style={styles.dateTileMonth}>{d.format('MMM').replace('.', '').toUpperCase()}</Text>
            <Text style={styles.dateTileDay}>{d.format('D')}</Text>
          </View>
        )}
      </View>

      {/* INFO */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>

        {!!item.address && (
          <View style={styles.row}>
            <AppIcon name="location" size={15} color={MUTED} />
            <Text style={styles.cardMeta} numberOfLines={1}>{item.address}</Text>
          </View>
        )}

        <View style={styles.cardChips}>
          <View style={styles.chip}>
            <AppIcon name="date" size={16} color={BRAND} />
            <Text style={styles.chipText} numberOfLines={1}>{frPrettyDate(item.date)}</Text>
          </View>
          {!!item.heureDebut && (
            <View style={styles.chip}>
              <AppIcon name="clock" size={16} color={BRAND} />
              <Text style={styles.chipText}>{hhmm(item.heureDebut)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const AppointmentsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'info'>('appointments');
  const [rezSection, setRezSection] = useState<'upcoming' | 'past'>('upcoming');

  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  const [pastReservations, setPastReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.min(contentWidth, MAX_CONTENT_WIDTH) - 32;

  // ================================
  // Load UPCOMING reservations on entry
  // ================================
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadUpcoming = async () => {
        try {
          setLoading(true);
          const up = await fetchUserReservations();
          if (mounted) setUpcomingReservations(up);
        } finally {
          if (mounted) setLoading(false);
        }
      };

      loadUpcoming();
      return () => (mounted = false);
    }, [])
  );

  // ================================
  // Load PAST reservations only on demand
  // ================================
  const loadPastReservations = useCallback(async () => {
    setLoading(true);
    try {
      const past = await fetchUserPastReservations();
      setPastReservations(past);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAppointments = activeTab === 'appointments';
  const isUpcoming = rezSection === 'upcoming';
  const isPast = rezSection === 'past';

  // ================================
  // HEADER: main segmented control
  // ================================
  const tabs: { key: 'appointments' | 'info'; icon: string; label: string }[] = [
    { key: 'appointments', icon: 'calendar', label: t('appointments.myAppointments') },
    { key: 'info', icon: 'profile', label: t('appointments.myInfo') },
  ];

  const HeaderTabs = (
    <View style={styles.segment}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.85}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppIcon name={tab.icon} size={17} color={active ? '#fff' : MUTED} />
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ================================
  // UPCOMING / PAST: underline tabs
  // ================================
  const SectionToggle = (
    <View style={styles.subTabs}>
      {([
        ['upcoming', t('appointments.upcoming')],
        ['past', t('appointments.past')],
      ] as const).map(([key, label]) => {
        const active = rezSection === key;
        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => {
              setRezSection(key);
              if (key === 'past') loadPastReservations();
            }}
            style={styles.subTab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.subTabText, active && styles.subTabTextActive]}>{label}</Text>
            <View style={[styles.subTabBar, active && styles.subTabBarActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const data = isUpcoming ? upcomingReservations : pastReservations;
  const bottomPad = Math.max(insets.bottom + 16, 32);

  // ================================
  // RENDER
  // ================================
  return (
    <View style={styles.screen}>
      {isAppointments ? (
        <FlatList
          data={loading ? [] : data}
          decelerationRate={SCROLL_DECELERATION}
          keyExtractor={(item) => String(item.id ?? Math.random())}
          ListHeaderComponent={
            <View style={styles.header}>
              {HeaderTabs}
              {SectionToggle}
            </View>
          }
          renderItem={({ item }) => (
            <Card
              item={item}
              width={cardWidth}
              onPress={() => navigation.navigate('ReservationDetail', { reservation: item, isPast })}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={BRAND} />
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <AppIcon name="calendar" size={30} color={BRAND} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isUpcoming ? t('appointments.noUpcoming') : t('appointments.noPast')}
                </Text>

                {isUpcoming && (
                  <TouchableOpacity
                    style={styles.emptyButton}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.dispatch(
                        CommonActions.reset({
                          index: 0,
                          routes: [{ name: 'Home' }],
                        })
                      )
                    }
                  >
                    <Text style={styles.emptyButtonText}>{t('appointments.bookCta')}</Text>
                    <AppIcon name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: bottomPad }}
        />
      ) : (
        <ScrollView decelerationRate={SCROLL_DECELERATION} contentContainerStyle={{ paddingBottom: bottomPad }}>
          <View style={styles.header}>{HeaderTabs}</View>
          <View style={styles.profileWrap}>
            <Profile />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F7' },
  header: { paddingHorizontal: 16, paddingTop: 16, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  profileWrap: { paddingHorizontal: 16, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },

  segment: { flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: '#EFECE8' },
  segmentItem: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  segmentItemActive: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  segmentText: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: MUTED },
  segmentTextActive: { color: '#FFFFFF' },

  subTabs: { flexDirection: 'row', gap: 24, marginTop: 20, marginBottom: 18 },
  subTab: { paddingTop: 4 },
  subTabText: { fontSize: 17, fontWeight: '600', color: MUTED },
  subTabTextActive: { color: INK, fontWeight: '800' },
  subTabBar: { height: 3, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  subTabBarActive: { backgroundColor: BRAND },

  card: {
    alignSelf: 'center',
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardImageBox: { width: '100%', backgroundColor: '#ECE9E5' },
  dateTile: {
    position: 'absolute',
    top: 12,
    start: 12,
    width: 54,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
  },
  dateTileMonth: { fontSize: 11, fontWeight: '800', color: BRAND, letterSpacing: 0.8 },
  dateTileDay: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: INK },
  cardBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: INK },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMeta: { flex: 1, fontSize: 14, color: MUTED },
  cardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: SURFACE,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: INK },

  loading: { paddingVertical: 64, alignItems: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 48 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(197,51,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: INK, textAlign: 'center' },
  emptyButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    height: 50,
    borderRadius: 16,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default AppointmentsScreen;
