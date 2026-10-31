// screens/ReservationDetailScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButton } from '../ui/AuthKit';
import { Alert } from '../ui/AppAlert';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';

import CancelReservationModal from '../../components/CancelReservationModal';
import EditReservationForm from '../../components/EditReservationForm';
import AppIcon from '../icons/AppIcon';
import { isoToFrDisplay, formatDuration } from '../../utils/date';
import CustomCalendarModal from '../../components/CustomCalendarModal';

import {
  createReservation,
  updateReservation,
  cancelReservation, // <- PUT /reservations/:id (CLIENT_CANCELLED), not DELETE
} from '../../services/reservations';

import {
  createAvis,
  fetchAvisByReservation, // <- only this is used to decide if this reservation already has a review
  fetchReviewSummary,
  type Avis,
} from '../../services/avis';

import RNCalendarEvents from 'react-native-calendar-events';
import dayjs from 'dayjs';
import { EstablishmentType } from '../../types/establishment';
import { API } from '../config/env';
import { fetchEtablissementById } from '../../services/etablissements';
import { useI18n } from '../i18n/LocaleProvider';
import { isSlotUnavailable } from '../api/errors';
import { useResponsive, MAX_CONTENT_WIDTH, SCROLL_DECELERATION } from '../utils/responsive';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ------------- IMAGE HELPERS (same spirit as SearchResultsScreen) -------------

const ABSOLUTE = /^https?:\/\//i;

/**
 * Resolve image URL:
 * - If absolute ("http..."), return as is
 * - If relative ("/media/..." etc.), prepend API.BASE_URL
 */
/** Shown when the establishment has no profile picture (or it fails to load). */
const defaultImg = require('../../assets/images/default_image.jpg');

const resolveImageUrl = (maybePath?: string | null): string => {
  if (!maybePath) return '';

  if (ABSOLUTE.test(maybePath)) {
    return maybePath;
  }

  const base = (API.BASE_URL ?? '').replace(/\/+$/, '');
  const path = (maybePath ?? '').replace(/^\/+/, '');

  const finalUrl = `${base}/${path}`;
  // console.log('ReservationDetail resolveImageUrl:', { maybePath, finalUrl });
  return finalUrl;
};

/**
 * Prefer cover image; else first gallery image; else legacy fields.
 * Mirrors the idea of pickImage() in SearchResultsScreen.
 */
const pickImage = (item: any): string => {
  if (!item) return '';

  const fromGallery =
    Array.isArray(item.photoPaths) && item.photoPaths.length > 0
      ? item.photoPaths[0]
      : '';

  return (
    item.imageUrl ||
    fromGallery ||
    item.image ||
    item.cover ||
    item.mainImage ||
    item.photo ||
    ''
  );
};

// -------------------------------------------------------------------

/** Figure out business type from several shapes */
const inferEstablishmentType = (reservation: any): EstablishmentType => {
  const rawType =
    reservation?.place?.businessType ??
    reservation?.place?.type ??
    reservation?.etablissement?.businessType ??
    reservation?.businessType ??
    reservation?.establishmentType ??
    null;

  if (typeof rawType === 'string') {
    const t = rawType.toUpperCase();
    if (t.includes('RESTAURANT')) return EstablishmentType.RESTAURANT;
    if (t.includes('SPA') || t.includes('BEAUT') || t.includes('ACTIV')) return EstablishmentType.SPA;
  }
  const hasProgram = !!reservation?.program || !!reservation?.program_id || !!reservation?.prestationId;
  return hasProgram ? EstablishmentType.SPA : EstablishmentType.RESTAURANT;
};

/** Compute whether reservation is finished (time-based, not status) */
const isReservationFinishedByTime = (reservation: any, routeFlag?: boolean): boolean => {
  if (routeFlag === true) return true;

  const dateISO =
    reservation?.date ??
    reservation?.dateISO ??
    reservation?.dateReservation;

  const startStr =
    reservation?.time ??
    reservation?.hour ??
    reservation?.heureDebut ??
    reservation?.heure_debut;

  if (!dateISO) return false;

  // Normalize HH:mm
  const hhmm = (startStr || '00:00').toString().slice(0, 5);
  const startDT = dayjs(`${dateISO}T${hhmm}`);

  // Prefer explicit end time if present
  const finStr = reservation?.heureFin ?? reservation?.heure_fin;
  if (finStr) {
    const finHHmm = finStr.toString().slice(0, 5);
    const endDT = dayjs(`${dateISO}T${finHHmm}`);
    return endDT.isBefore(dayjs());
  }

  // Else compute end from duration if we have one
  const duration =
    reservation?.program?.duration_minutes ??
    reservation?.program?.duration ??
    reservation?.prestationDuration ??
    reservation?.durationMinutes ??
    null;

  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    const endDT = startDT.add(duration, 'minute');
    return endDT.isBefore(dayjs());
  }

  // Fallback: consider past if start is in the past
  return startDT.isBefore(dayjs());
};

const ReservationDetailScreen = () => {
  const { t } = useI18n();
  const { contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const [fetchedEtab, setFetchedEtab] = useState<any>(null);

useEffect(() => {
  const id =
    reservation?.place?.id ??
    reservation?.etablissement?.id ??
    reservation?.etablissementId ??
    reservation?.placeId ??
    reservation?.establishmentId;

  if (id) {
    fetchEtablissementById(id)
      .then(dto => setFetchedEtab(dto))
      .catch(() => {});
  }
}, []);

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const reservation = route?.params?.reservation ?? {};
  const startInEditMode: boolean = !!route?.params?.startInEditMode;
  const routeIsPast: boolean | undefined = route?.params?.isPast;

  const establishmentImg = resolveImageUrl(fetchedEtab?.imageUrl ?? reservation?.imageUrl);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [establishmentImg]);

  const placeObj = useMemo(() => {
    const raw = reservation?.place ?? reservation?.etablissement ?? {};
    const id =
      raw?.id ??
      reservation?.etablissementId ??
      reservation?.placeId ??
      reservation?.establishmentId ??
      null;

    const name =
      raw?.name ??
      raw?.nom ??
      reservation?.name ??
      reservation?.establishmentName ??
      reservation?.title ??
      '—';

    const address =
      raw?.address ??
      reservation?.address ??
      reservation?.establishmentAddress ??
      reservation?.lieu ??
      '';

    const images = Array.isArray(raw?.images) ? raw.images : [];
    const reviews = Array.isArray(raw?.reviews) ? raw.reviews : [];
    const menu = Array.isArray(raw?.menu) ? raw.menu : [];
    const available_slots = raw?.available_slots ?? {};
    const openingHours = raw?.openingHours ?? reservation?.openingHours ?? [];

    return { id, name, address, images, reviews, menu, available_slots, openingHours, ...raw };
  }, [reservation]);

const passedImage = route?.params?.imageUrl ?? null;

 const headerImageUri = useMemo(() => {
  // 1) If AppointmentsScreen passed a real resolved image → always trust it
  if (passedImage) return passedImage;

  // 2) Else fallback to place-based logic
  const fallback = pickImage(placeObj as any);
  return resolveImageUrl(fallback);
}, [passedImage, placeObj]);


  /** ===== Local fallback review summary (from placeObj.reviews) ===== */
  const reviewsArray = useMemo(
    () => (Array.isArray(placeObj?.reviews) ? placeObj.reviews : []),
    [placeObj?.reviews]
  );

  const localSummary = useMemo(() => {
    if (!reviewsArray.length) return { average: 0, count: 0 };
    let sum = 0;
    let cnt = 0;
    for (const r of reviewsArray) {
      const v = Number(r?.rating ?? r?.note ?? r?.stars ?? 0);
      if (Number.isFinite(v)) {
        sum += v;
        cnt += 1;
      }
    }
    const avg = cnt ? Math.round((sum / cnt) * 10) / 10 : 0;
    return { average: avg, count: cnt };
  }, [reviewsArray]);
  /** ================================================================ */

  const [tab, setTab] = useState<'view' | 'edit'>(startInEditMode ? 'edit' : 'view');
  const [activeEditTab, setActiveEditTab] =
    useState<'rendezvous' | 'menu' | 'avis' | 'apropos'>('rendezvous');

  const [people, setPeople] = useState<number | undefined>(
    reservation?.people ?? reservation?.partySize
  );
  const [dateISO, setDateISO] = useState<string>(reservation?.date ?? reservation?.dateISO ?? '');
  const [time, setTime] = useState<string>(
    (reservation?.time ?? reservation?.hour ?? reservation?.heureDebut ?? '').toString()
  );

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCal, setShowCal] = useState(false);

  // Aggregated summary from backend (preferred)
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);

  // Review state (user's own avis on THIS reservation)
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [myReview, setMyReview] = useState<Avis | null>(null);

  const resolvedClientId: number | null = useMemo(() => {
    const c =
      reservation?.client_id ??
      reservation?.clientId ??
      reservation?.user?.id ??
      reservation?.client?.id ??
      null;
    return typeof c === 'number' ? c : null;
  }, [reservation]);

  // Only check for existing avis tied to THIS reservation id
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resId = typeof reservation?.id === 'number' ? reservation.id : undefined;
        const etabId = Number(placeObj?.id ?? 0) || undefined;

        // 1) Only look up avis for THIS reservation
        if (resId) {
          try {
            const found = await fetchAvisByReservation(resId); // 200 or 404
            if (mounted && found) {
              setMyReview(found);
              setShowReviewForm(false);
            }
          } catch (e: any) {
            // 404 => no review yet; keep myReview null
          }
        }

        // 2) Summary (for header stars)
        if (etabId) {
          try {
            const s = await fetchReviewSummary(etabId);
            if (mounted && s) {
              setSummary({ average: s.average ?? 0, count: s.count ?? 0 });
            }
          } catch {
            if (mounted) setSummary(null); // fall back to local compute in render
          }
        }
      } catch (e) {
        console.warn('Failed to preload avis for reservation', e);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation?.id, placeObj?.id]);

  const establishmentType = inferEstablishmentType(reservation);
  const isRestaurant = establishmentType === EstablishmentType.RESTAURANT;
  const past = isReservationFinishedByTime(reservation, routeIsPast);

  const addToCalendar = async () => {
    try {
      const permission = await RNCalendarEvents.requestPermissions();
      if (permission !== 'authorized') {
        Alert.alert(t('detail.calendarDenied'), t('detail.calendarDeniedMessage'));
        return;
      }
      if (!dateISO || !time) {
        Alert.alert(t('detail.missingInfo'), t('detail.missingDateTime'));
        return;
      }
      const startDate = dayjs(`${dateISO}T${time.length > 5 ? time.slice(0, 5) : time}`).toISOString();
      const duration =
        reservation?.program?.duration_minutes ??
        reservation?.program?.duration ??
        reservation?.durationMinutes ??
        40;
      const endDate = dayjs(startDate).add(duration, 'minutes').toISOString();

      const title = t('detail.eventTitle', { name: placeObj.name });
      await RNCalendarEvents.saveEvent(title, {
        startDate,
        endDate,
        location: placeObj.address ?? '',
        notes: reservation?.program
          ? t('detail.eventProgram', { title: reservation.program.title })
          : t('detail.eventPeople', { n: people ?? '-' }),
      });
      Alert.alert(t('detail.calendarAdded'), t('detail.calendarAddedMessage'));
    } catch (error) {
      console.error('Erreur lors de l’ajout au calendrier:', error);
      Alert.alert(t('common.error'), t('detail.calendarError'));
    }
  };

  const openInMaps = () => {
    const lat = placeObj?.location?.lat;
    const lng = placeObj?.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert(t('common.addressUnavailable'), t('detail.noCoords'));
      return;
    }
    const coords = `${lat},${lng}`;
    const label = encodeURIComponent(placeObj.name || 'Destination');
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const url =
      Platform.OS === 'ios'
        ? `${scheme}//?q=${label}&ll=${coords}`
        : `${scheme}0,0?q=${coords}(${label})`;
    Linking.openURL(url);
  };

  const prettyDate = dateISO ? isoToFrDisplay(dateISO) : '—';
  const prettyTime = time ? (time.length > 5 ? time.slice(0, 5) : time) : '—';

  const RatingRow = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => {
    return (
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value >= n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              activeOpacity={0.85}
              style={{ padding: 4 }}
            >
              <AppIcon name={filled ? 'star' : 'star-outline'} size={32} color={filled ? BRAND : '#D6D1CB'} />
            </TouchableOpacity>
          );
        })}
        <Text style={styles.ratingValue}>{value ? `${value}/5` : '—/5'}</Text>
      </View>
    );
  };

  const submitReview = async () => {
    try {
      // Only after reservation is finished (time-based)
      if (!past) {
        Alert.alert(t('detail.notYet'), t('detail.afterAppointment'));
        return;
      }
      if (!reviewRating) {
        Alert.alert(t('detail.ratingRequired'), t('detail.ratingRequiredMessage'));
        return;
      }
      if (!reviewText.trim()) {
        Alert.alert(t('detail.emptyMessage'), t('detail.emptyMessageText'));
        return;
      }
      const etablissementId = Number(placeObj?.id);
      const clientId = resolvedClientId ?? undefined;
      const reservationId = typeof reservation?.id === 'number' ? reservation.id : undefined;
      if (!etablissementId || !clientId) {
        Alert.alert(t('detail.missingInfo'), t('detail.missingIds'));
        return;
      }

      setReviewSubmitting(true);

      const saved = await createAvis({
        etablissementId,
        clientId,
        reservationId, // backend enforces one-per-reservation
        rating: reviewRating,
        contenu: reviewText.trim(),
      });

      setMyReview(saved);
      setShowReviewForm(false);
      setReviewText('');
      setReviewRating(0);
      Alert.alert(t('detail.thanks'), t('detail.reviewSent'));
    } catch (e: any) {
      console.error('createAvis error', e);
      const status = e?.response?.status;
      let msg =
        e?.response?.data?.message ||
        e?.message ||
        t('detail.reviewError');

      if (status === 403) {
        msg = t('detail.afterAppointment');
      } else if (status === 409) {
        msg = t('detail.reviewExists');
        setShowReviewForm(false);
      }
      Alert.alert(t('common.error'), msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const hasReview = !!myReview;

  // Decide which summary to render: server first, else local fallback
  const summaryToShow = summary ?? localSummary;
  const hasAnyReviews = (summary?.count ?? localSummary.count) > 0;

  // Early return only after every hook has run (hooks must be called in the same order on each render).
  if (!route?.params?.reservation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  const heroHeight = Math.round(Math.min(contentWidth, MAX_CONTENT_WIDTH) * 0.7) + insets.top;
  // a cart shows all its prestations, in the order booked (only the first one used to show)
  const panier: { id: number; nom: string }[] = Array.isArray(reservation?.prestations) ? reservation.prestations : [];
  const prestationName =
    (panier.length > 1 ? panier.map((p) => p.nom).join(' + ') : null) ??
    reservation?.program?.title ??
    reservation?.program?.nom ??
    reservation?.programTitle ??
    reservation?.prestationName ??
    '—';
  const bookedMinutes =
    reservation?.heureDebut && reservation?.heureFin
      ? dayjs(`2000-01-01T${String(reservation.heureFin).slice(0, 5)}`).diff(
          dayjs(`2000-01-01T${String(reservation.heureDebut).slice(0, 5)}`),
          'minute'
        )
      : undefined;
  const prestationDuration = (reservation?.program?.duration_minutes ??
    reservation?.durationMinutes ??
    (bookedMinutes && bookedMinutes > 0 ? bookedMinutes : undefined) ??
    reservation?.prestationDuration) as number | undefined;
  const momentLabel = (() => {
    const hh = Number(String(time).split(':')[0] || '0');
    return Number.isFinite(hh) && hh < 18 ? t('detail.lunch') : t('detail.dinner');
  })();

  return (
    <ScrollView
      style={styles.screen}
      decelerationRate={SCROLL_DECELERATION}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
    >
      {/* HERO */}
      <View style={{ height: heroHeight, backgroundColor: '#1A1512' }}>
        <Image
          source={establishmentImg && !imgFailed ? { uri: establishmentImg } : defaultImg}
          defaultSource={defaultImg}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
        <View style={[styles.topShade, { height: insets.top + 90 }]} pointerEvents="none">
          {SHADE_BANDS.map((o, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${o})` }} />
          ))}
        </View>
      </View>

      <View style={styles.body}>
        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <View style={[styles.status, past ? styles.statusPast : styles.statusUpcoming]}>
            <View style={[styles.statusDot, { backgroundColor: past ? MUTED : '#2E9E5B' }]} />
            <Text style={[styles.statusText, { color: past ? MUTED : '#2E9E5B' }]}>
              {past ? t('appointments.past') : t('appointments.upcoming')}
            </Text>
          </View>

          <Text style={styles.name}>{placeObj.name}</Text>

          <View style={styles.addressRow}>
            <AppIcon name="location" size={17} color={MUTED} />
            <Text style={styles.address}>
              {placeObj.address && String(placeObj.address).trim().length > 0
                ? placeObj.address
                : t('common.addressUnavailable')}
            </Text>
          </View>

          <View style={styles.pills}>
            {hasAnyReviews ? (
              <>
                <View style={[styles.pill, styles.pillBrand]}>
                  <AppIcon name="star" size={14} color="#fff" />
                  <Text style={styles.pillBrandText}>{summaryToShow.average.toFixed(1)}</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{t('common.reviews', { count: summaryToShow.count })}</Text>
                </View>
              </>
            ) : (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{t('common.noReviews')}</Text>
              </View>
            )}
          </View>

          {/* Quick actions — HIDE when finished */}
          {!past && (
            <TouchableOpacity onPress={addToCalendar} activeOpacity={0.8} style={styles.calendarButton}>
              <AppIcon name="calendar" size={18} color={BRAND} />
              <Text style={styles.calendarButtonText}>{t('detail.addToCalendar')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* "J’ai réservé pour" */}
        {tab === 'view' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('detail.bookedFor')}</Text>

            {isRestaurant ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <AppIcon name="people-outline" size={20} color={BRAND} />
                </View>
                <Text style={[styles.detailValue, { flex: 1 }]}>{t('detail.people')}</Text>
                <Text style={styles.detailBig}>{people ?? '-'}</Text>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <AppIcon name="sparkles-outline" size={20} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>{t('detail.prestation')}</Text>
                  <Text style={styles.detailValue}>{prestationName}</Text>
                  {!!prestationDuration && (
                    <Text style={styles.detailSub}>{formatDuration(prestationDuration)}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Date */}
            <TouchableOpacity
              onPress={() => !past && setShowCal(true)}
              activeOpacity={past ? 1 : 0.8}
              style={styles.detailRow}
            >
              <View style={styles.detailIcon}>
                <AppIcon name="calendar-outline" size={20} color={BRAND} />
              </View>
              <Text style={[styles.detailValue, { flex: 1 }]}>{prettyDate}</Text>
            </TouchableOpacity>

            {/* Moment + time */}
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <AppIcon name="time-outline" size={20} color={BRAND} />
              </View>
              <Text style={[styles.detailValue, { flex: 1 }]}>{prettyTime}</Text>
              {isRestaurant && (
                <View style={styles.momentChip}>
                  <Text style={styles.momentText}>{momentLabel}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Calendar modal */}
        <CustomCalendarModal
          visible={!past && showCal}
          onClose={() => setShowCal(false)}
          onSelectDate={(iso) => {
            setDateISO(iso);
            setShowCal(false);
          }}
          selectedDate={dateISO}
          disabledDates={[]}
        />

        {/* 🔽 Always show user's review for THIS reservation if present */}
        {hasReview && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('detail.yourReview')}</Text>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <AppIcon
                  key={i}
                  name={i <= (myReview?.rating ?? 0) ? 'star' : 'star-outline'}
                  size={18}
                  color={i <= (myReview?.rating ?? 0) ? BRAND : '#D6D1CB'}
                />
              ))}
              <Text style={styles.ratingValue}>{(myReview?.rating ?? 0)}/5</Text>
            </View>
            {!!myReview?.contenu && <Text style={styles.reviewText}>{myReview.contenu}</Text>}
          </View>
        )}

        {/* Past vs Upcoming actions */}
        {past ? (
          <>
            {/* Show "leave avis" only if THIS reservation has no avis */}
            {!hasReview && !showReviewForm && (
              <View style={styles.actions}>
                <AuthButton label={t('detail.leaveReview')} onPress={() => setShowReviewForm(true)} />
              </View>
            )}

            {!hasReview && showReviewForm && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('detail.yourReview')}</Text>
                <RatingRow value={reviewRating} onChange={setReviewRating} />
                <TextInput
                  value={reviewText}
                  onChangeText={setReviewText}
                  placeholder={t('detail.reviewPlaceholder')}
                  placeholderTextColor={MUTED}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={styles.reviewInput}
                />
                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    disabled={reviewSubmitting}
                    onPress={() => {
                      setShowReviewForm(false);
                      setReviewText('');
                      setReviewRating(0);
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <AuthButton
                      label={reviewSubmitting ? t('detail.sending') : t('detail.send')}
                      onPress={submitReview}
                      loading={reviewSubmitting}
                    />
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View key={tab}>
            {tab === 'view' ? (
              <View style={styles.actions}>
                {reservation?.status !== 'confirmed' && (
                  <AuthButton
                    label={t('detail.move')}
                    onPress={() => {
                      setTab('edit');
                      setActiveEditTab('rendezvous');
                    }}
                  />
                )}
                <TouchableOpacity onPress={() => setShowCancelModal(true)} activeOpacity={0.8} style={styles.dangerButton}>
                  <AppIcon name="close-circle-outline" size={20} color={BRAND} />
                  <Text style={styles.dangerButtonText}>{t('detail.cancel')}</Text>
                </TouchableOpacity>

                <CancelReservationModal
                  isVisible={showCancelModal}
                  onKeep={() => setShowCancelModal(false)}
                  onCancel={async () => {
                    const ok = await cancelReservation(
                      reservation?.id,
                      placeObj?.id,
                      reservation?.date,
                      reservation?.time,
                      reservation?.program_id ?? reservation?.prestationId
                    );
                    if (ok) {
                      setShowCancelModal(false);
                      navigation.navigate('Appointments');
                    } else {
                      Alert.alert(t('detail.oops'), t('detail.cancelError'));
                    }
                  }}
                />
              </View>
            ) : (
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity onPress={() => setTab('view')} style={styles.backLink} hitSlop={8}>
                  <AppIcon name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'} size={18} color={BRAND} />
                  <Text style={styles.backLinkText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                {activeEditTab === 'rendezvous' && (
                  <EditReservationForm
                    establishmentType={establishmentType}
                    etablissementId={Number(placeObj?.id ?? 0)}
                    clientId={resolvedClientId ?? undefined}
                    initialPeople={people}
                    initialDateISO={dateISO}
                    initialTime={time ? time.slice(0, 5) : ''}
                    availableSlots={placeObj?.available_slots ?? {}}
                    initialProgramId={
                      isRestaurant ? undefined : (reservation?.program_id ?? reservation?.prestationId)
                    }
                    openingHours={placeObj?.openingHours ?? []}
                    editPrestationIds={panier.map((x) => x.id)}
                    excludeReservationId={
                      reservation?.id && reservation.id !== 'new' ? Number(reservation.id) : undefined
                    }
                    onPartySizeChange={(n) => setPeople(n)}
                    onConfirm={async (p, dISO, hhmm, programId, clientIdFromForm, collaborateurId) => {
                      const cid = clientIdFromForm ?? resolvedClientId;
                      if (!isRestaurant && !programId) {
                        Alert.alert(t('detail.choiceRequired'), t('detail.selectPrestation'));
                        return;
                      }

                      let success = false;

                      try {
                        if (!reservation?.id || reservation?.id === 'new') {
                          if (!cid) {
                            Alert.alert(t('common.sessionRequired'), t('detail.clientMissing'));
                            return;
                          }
                          const created = await createReservation(
                            Number(placeObj?.id),
                            dISO,
                            hhmm,
                            p,
                            isRestaurant ? undefined : programId,
                            Number(cid),
                            collaborateurId
                          );
                          success = !!created;
                          if (created) {
                            reservation.id = created.id;
                            reservation.date = created.date;
                            reservation.time = created.time;
                            reservation.people = created.partySize ?? p;
                            reservation.status = created.statut;
                            reservation.program_id = created.prestationId ?? (programId as any);
                          }
                        } else {
                          if (!cid) {
                            Alert.alert(t('common.sessionRequired'), t('detail.clientMissing'));
                            return;
                          }

                          // No end time sent: the server works it out from the whole cart
                          // (it used to be the first prestation's duration, cutting a cart short).
                          success = await updateReservation({
                            id: reservation.id,
                            clientId: Number(cid),
                            dateISO: dISO,
                            timeHHmm: hhmm,
                            statut: (reservation?.statut as any) ?? 'PENDING',
                            people: p,
                            programId: isRestaurant ? undefined : programId,
                            collaborateurId: collaborateurId ?? undefined,
                            source: 'ENLIGNE',
                          });

                          if (success) {
                            reservation.date = dISO;
                            reservation.time = hhmm;
                            reservation.people = p ?? reservation.people;
                            reservation.program_id = isRestaurant
                              ? reservation.program_id
                              : (programId ?? reservation.program_id);
                          }
                        }
                      } catch (e: any) {
                        if (isSlotUnavailable(e)) {
                          // Someone else got the slot first: the form clears the time and reloads slots.
                          Alert.alert(t('establishment.slotTakenTitle'), t('establishment.slotTaken'));
                          return 'SLOT_TAKEN';
                        }
                        Alert.alert(t('common.error'), e?.response?.data?.message ?? t('detail.saveError'));
                        return;
                      }

                      if (success) {
                        setPeople(p ?? people);
                        setDateISO(dISO);
                        setTime(hhmm);
                        setTab('view');
                      } else {
                        console.warn('Failed to save reservation');
                      }
                    }}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';
const SURFACE = '#F5F3F0';

// Gradient-like top shade without a gradient library: stacked bands fading out.
const SHADE_BANDS = Array.from({ length: 10 }, (_, i) => 0.5 * (1 - i / 10) ** 2);

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F7' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: 16 },

  infoCard: {
    marginTop: -48,
    padding: 20,
    gap: 6,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  status: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusUpcoming: { backgroundColor: 'rgba(46,158,91,0.1)' },
  statusPast: { backgroundColor: SURFACE },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  name: { fontSize: 26, lineHeight: 31, fontWeight: '800', color: INK, letterSpacing: -0.4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  address: { flex: 1, fontSize: 15, lineHeight: 21, color: MUTED },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: SURFACE,
  },
  pillText: { fontSize: 14, fontWeight: '600', color: INK },
  pillBrand: { backgroundColor: BRAND },
  pillBrandText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  calendarButton: {
    marginTop: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(197,51,52,0.08)',
  },
  calendarButtonText: { fontSize: 15, fontWeight: '700', color: BRAND },

  card: { marginTop: 16, padding: 18, gap: 10, borderRadius: 22, backgroundColor: '#FFFFFF', ...shadow },
  cardTitle: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 2 },
  detailRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: SURFACE,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '700', color: INK },
  detailSub: { marginTop: 2, fontSize: 13, color: MUTED },
  detailBig: { fontSize: 22, fontWeight: '800', color: INK, marginEnd: 6 },
  momentChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FFFFFF' },
  momentText: { fontSize: 13, fontWeight: '700', color: INK },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ratingValue: { marginStart: 8, fontSize: 14, color: MUTED, fontWeight: '600' },
  reviewStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewText: { fontSize: 15, lineHeight: 22, color: '#3A3530' },
  reviewInput: {
    minHeight: 120,
    padding: 14,
    borderRadius: 16,
    backgroundColor: SURFACE,
    fontSize: 15,
    lineHeight: 21,
    color: INK,
  },
  reviewActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  secondaryButton: {
    height: 58,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E4E0DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: INK },

  actions: { marginTop: 20, gap: 12 },
  dangerButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(197,51,52,0.35)',
    backgroundColor: '#FFFFFF',
  },
  dangerButtonText: { fontSize: 16, fontWeight: '700', color: BRAND },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 12 },
  backLinkText: { fontSize: 15, fontWeight: '700', color: BRAND },
});

export default ReservationDetailScreen;
