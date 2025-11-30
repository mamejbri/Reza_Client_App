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
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';

import CancelReservationModal from '../../components/CancelReservationModal';
import EditReservationForm from '../../components/EditReservationForm';
import IcoMoonIcon from '../icons/IcoMoonIcon';
import { isoToFrDisplay } from '../../utils/date';
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
import 'dayjs/locale/fr';
import { EstablishmentType } from '../../types/establishment';
import { API } from '../config/env';
import { fetchEtablissementById } from '../../services/etablissements';

dayjs.locale('fr');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ------------- IMAGE HELPERS (same spirit as SearchResultsScreen) -------------

const ABSOLUTE = /^https?:\/\//i;

/**
 * Resolve image URL:
 * - If absolute ("http..."), return as is
 * - If relative ("/media/..." etc.), prepend API.BASE_URL
 */
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

  if (!route?.params?.reservation) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C53334" />
      </View>
    );
  }

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
        Alert.alert('Permission refusée', "L'accès au calendrier est nécessaire pour ajouter l'événement.");
        return;
      }
      if (!dateISO || !time) {
        Alert.alert('Informations manquantes', 'Date ou heure indisponible.');
        return;
      }
      const startDate = dayjs(`${dateISO}T${time.length > 5 ? time.slice(0, 5) : time}`).toISOString();
      const duration =
        reservation?.program?.duration_minutes ??
        reservation?.program?.duration ??
        reservation?.durationMinutes ??
        40;
      const endDate = dayjs(startDate).add(duration, 'minutes').toISOString();

      const title = `Réservation chez ${placeObj.name}`;
      await RNCalendarEvents.saveEvent(title, {
        startDate,
        endDate,
        location: placeObj.address ?? '',
        notes: reservation?.program
          ? `Programme : ${reservation.program.title}`
          : `Pour ${people ?? '-'} personne(s)`,
      });
      Alert.alert('Ajouté au calendrier', 'Votre réservation a été ajoutée avec succès.');
    } catch (error) {
      console.error('Erreur lors de l’ajout au calendrier:', error);
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'ajout à votre calendrier.");
    }
  };

  const openInMaps = () => {
    const lat = placeObj?.location?.lat;
    const lng = placeObj?.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Adresse indisponible', "Coordonnées manquantes pour l'itinéraire.");
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
      <View className="flex-row items-center mb-3">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value >= n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              activeOpacity={0.85}
              style={{ padding: 4 }}
            >
              <IcoMoonIcon
                name={filled ? 'star-solid' : 'star'}
                size={26}
                color={filled ? '#F5A524' : '#C9C9C9'}
              />
            </TouchableOpacity>
          );
        })}
        <Text className="ml-2 text-[14px] text-gray-600">{value ? `${value}/5` : '—/5'}</Text>
      </View>
    );
  };

  const submitReview = async () => {
    try {
      // Only after reservation is finished (time-based)
      if (!past) {
        Alert.alert('Pas encore disponible', 'Vous pourrez laisser un avis après votre rendez-vous.');
        return;
      }
      if (!reviewRating) {
        Alert.alert('Note requise', 'Merci de noter votre expérience (1 à 5 étoiles).');
        return;
      }
      if (!reviewText.trim()) {
        Alert.alert('Message vide', 'Merci de saisir votre avis.');
        return;
      }
      const etablissementId = Number(placeObj?.id);
      const clientId = resolvedClientId ?? undefined;
      const reservationId = typeof reservation?.id === 'number' ? reservation.id : undefined;
      if (!etablissementId || !clientId) {
        Alert.alert('Informations manquantes', "Impossible d'identifier l'établissement ou le client.");
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
      Alert.alert('Merci !', 'Votre avis a bien été envoyé.');
    } catch (e: any) {
      console.error('createAvis error', e);
      const status = e?.response?.status;
      let msg =
        e?.response?.data?.message ||
        e?.message ||
        "Impossible d'envoyer votre avis pour le moment.";

      if (status === 403) {
        msg = 'Vous pourrez laisser un avis après votre rendez-vous.';
      } else if (status === 409) {
        msg = 'Vous avez déjà laissé un avis pour cette réservation.';
        setShowReviewForm(false);
      }
      Alert.alert('Erreur', msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const hasReview = !!myReview;

  // Decide which summary to render: server first, else local fallback
  const summaryToShow = summary ?? localSummary;
  const hasAnyReviews = (summary?.count ?? localSummary.count) > 0;

  return (
    <ScrollView className="bg-white flex-1 px-4">
      {/* Header card */}
      <View
        className="rounded-2xl overflow-hidden bg-[#F3F3F3] width-flex"
        style={{ marginBottom: 26}}
      >
        {/* 👉 Image: first photo of the establishment, like SearchResults logic */}
      <View style={{ height: 180 }}>
  <Image
  source={{
    uri:
      fetchedEtab?.imageUrl
        ? API.BASE_URL + '/' + fetchedEtab.imageUrl.replace(/^\/+/, '')
        : reservation?.imageUrl
        ? API.BASE_URL + '/' + reservation.imageUrl.replace(/^\/+/, '')
        : undefined,
  }}
  defaultSource={require('../../assets/images/food.png')}
  style={{ width: '100%', height: '100%' }}
  resizeMode="cover"
/>

</View>


        <View className="py-4 px-2.5 gap-3"
        style={{paddingLeft:12}}
        >
          <Text className="text-xl font-extrabold">{placeObj.name}</Text>

          {/* Address */}
          <View className="flex-row items-center gap-2">
            <IcoMoonIcon name="location" size={22} color="#C53334" />
            <Text className="text-[16px] font-medium">
              {placeObj.address && String(placeObj.address).trim().length > 0
                ? placeObj.address
                : 'Adresse indisponible'}
            </Text>
          </View>

          {/* Reviews summary */}
          <View className="flex-row items-center gap-2">
            {hasAnyReviews ? (
              <>
                <IcoMoonIcon name="star" size={20} color="#C53334" />
                <Text className="text-base font-semibold">
                  {summaryToShow.average.toFixed(1)}
                </Text>
                <Text className="text-base text-gray-700">• {summaryToShow.count} avis</Text>
              </>
            ) : (
              <Text className="text-base text-gray-600">Aucun avis</Text>
            )}
          </View>
        </View>
      </View>

      {/* Quick actions — HIDE when finished */}
      {!past && (
        <ScrollView horizontal className="my-6" contentContainerStyle={{ paddingHorizontal: 4 }}>
          <View className="flex-row gap-3"
                        style={{marginBottom:26}}

          >
             <TouchableOpacity onPress={addToCalendar} className="btn-small-icon">
              <IcoMoonIcon name="calendar" size={18} color="#fff" />
              <Text className="btn-small-icon-text"
              >Ajouter à mon agenda</Text>
            </TouchableOpacity>

            {/*<TouchableOpacity className="btn-small-icon">
              <IcoMoonIcon name="notifcations" size={18} color="#fff" />
              <Text className="btn-small-icon-text">Me notifier 1 jour avant</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={openInMaps} className="btn-small-icon">
              <IcoMoonIcon name="location" size={18} color="#fff" />
              <Text className="btn-small-icon-text">Itinéraire</Text>
            </TouchableOpacity>*/}
          </View>
        </ScrollView>
      )}

      {/* "J’ai réservé pour" */}
      <View className="rounded-2xl bg-[#F7F7F7] px-3 py-4">
        <Text className="text-[16px] font-semibold mb-3">J’ai réservé pour</Text>

        {isRestaurant ? (
          <View className="bg-white rounded-2xl px-4 py-3 mb-3 flex-row items-center justify-between">
            <Text className="text-[16px] font-semibold">Nombre de personnes :</Text>
            <View className="bg-[#F3F3F3] rounded-xl px-3 py-2">
              <Text className="text-[16px] font-bold">{people ?? '-'}</Text>
            </View>
          </View>
        ) : (
          <View className="bg-white rounded-2xl px-4 py-3 mb-3">
            <Text className="text-[16px] font-semibold mb-1">Prestation</Text>
            <Text className="text-[15px] font-medium">
              {reservation?.program?.title ??
                reservation?.program?.nom ??
                reservation?.programTitle ??
                reservation?.prestationName ??
                '—'}
            </Text>
            {!!(reservation?.program?.duration_minutes ?? reservation?.durationMinutes) && (
              <Text className="text-[13px] text-gray-600 mt-1">
                {(reservation?.program?.duration_minutes ?? reservation?.durationMinutes) as number} min
              </Text>
            )}
          </View>
        )}

        {/* Date */}
        <TouchableOpacity
          onPress={() => !past && setShowCal(true)}
          className="bg-white rounded-2xl px-4 py-3 mb-3"
          activeOpacity={past ? 1 : 0.8}
        >
          <Text className="text-center text-[16px] font-semibold">{prettyDate}</Text>
        </TouchableOpacity>

        {/* Moment + time */}
        <View className="flex-row items-center">
          <View className="bg-white px-3 py-2 rounded-xl mr-2">
            <Text className="text-[14px] font-semibold">
              {(() => {
                const hh = Number(String(time).split(':')[0] || '0');
                return Number.isFinite(hh) && hh < 18 ? 'Midi' : 'Soir';
              })()}
            </Text>
          </View>
          <View className="bg-white px-4 py-2 rounded-xl">
            <Text className="text-[14px] font-medium">{time ? time.slice(0, 5) : '—'}</Text>
          </View>
        </View>
      </View>

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
        <View className="mt-6 mb-2 bg-[#F7F7F7] rounded-2xl p-4">
          <Text className="text-[16px] font-semibold mb-2">Votre avis</Text>
          <View className="flex-row items-center mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <IcoMoonIcon
                key={i}
                name={i <= (myReview?.rating ?? 0) ? 'star-solid' : 'star'}
                size={18}
                color={i <= (myReview?.rating ?? 0) ? '#F5A524' : '#C9C9C9'}
              />
            ))}
            <Text className="ml-2 text-[13px] text-gray-600">{(myReview?.rating ?? 0)}/5</Text>
          </View>
          {!!myReview?.contenu && (
            <Text className="text-[15px] text-gray-800">{myReview.contenu}</Text>
          )}
        </View>
      )}

      {/* Past vs Upcoming actions */}
      {past ? (
        <>
          {/* Show "leave avis" only if THIS reservation has no avis */}
          {!hasReview && !showReviewForm && (
            <View className="flex-col mt-4 mb-10">
              <TouchableOpacity onPress={() => setShowReviewForm(true)} className="btn-primary">
                <Text className="btn-primary-text">Laisser un avis</Text>
              </TouchableOpacity>
            </View>
          )}

          {!hasReview && showReviewForm && (
            <View className="mt-4 mb-10 bg-[#F7F7F7] rounded-2xl p-4">
              <Text className="text-[16px] font-semibold mb-3">Votre avis</Text>
              <RatingRow value={reviewRating} onChange={setReviewRating} />
              <View className="bg-white rounded-2xl">
                <TextInput
                  value={reviewText}
                  onChangeText={setReviewText}
                  placeholder="Dites-nous comment s’est passée votre expérience…"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{ padding: 12, minHeight: 120, borderRadius: 16 }}
                />
              </View>
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  disabled={reviewSubmitting}
                  onPress={submitReview}
                  className="btn-primary flex-1 items-center justify-center"
                >
                  <Text className="btn-primary-text">
                    {reviewSubmitting ? 'Envoi…' : 'Envoyer'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={reviewSubmitting}
                  onPress={() => {
                    setShowReviewForm(false);
                    setReviewText('');
                    setReviewRating(0);
                  }}
                  className="btn-black flex-1 items-center justify-center"
                >
                  <Text className="btn-black-text">Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        <View key={tab}>
          {tab === 'view' ? (
            <>
              <View className="flex-column mt-6 gap-3 mb-4">
                {reservation?.status !== 'confirmed' && (
                  <TouchableOpacity
                    onPress={() => {
                      setTab('edit');
                      setActiveEditTab('rendezvous');
                    }}
                    className="btn-primary"
                  >
                    <Text className="btn-primary-text">Déplacer ma Réza</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowCancelModal(true)} className="btn-black">
                  <Text className="btn-black-text">Annuler ma Réza</Text>
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
                      Alert.alert("Oups", "Impossible d'annuler la réservation pour le moment.");
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <>
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
                  onPartySizeChange={(n) => setPeople(n)}
                  onConfirm={async (p, dISO, t, programId, clientIdFromForm) => {
                    const cid = clientIdFromForm ?? resolvedClientId;
                    if (!isRestaurant && !programId) {
                      Alert.alert('Choix requis', 'Veuillez sélectionner une prestation.');
                      return;
                    }

                    let success = false;

                    if (!reservation?.id || reservation?.id === 'new') {
                      if (!cid) {
                        Alert.alert('Session requise', 'Veuillez vous reconnecter (clientId introuvable).');
                        return;
                      }
                      const created = await createReservation(
                        Number(placeObj?.id),
                        dISO,
                        t,
                        p,
                        isRestaurant ? undefined : programId,
                        Number(cid)
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
                        Alert.alert('Session requise', 'Veuillez vous reconnecter (clientId introuvable).');
                        return;
                      }

                      const durationMin =
                        reservation?.program?.duration_minutes ??
                        reservation?.program?.duration ??
                        reservation?.durationMinutes ??
                        undefined;

                      success = await updateReservation({
                        id: reservation.id,
                        clientId: Number(cid),
                        dateISO: dISO,
                        timeHHmm: t,
                        statut: (reservation?.statut as any) ?? 'PENDING',
                        people: p,
                        programId: isRestaurant ? undefined : programId,
                        durationMin:
                          isRestaurant ? undefined : (typeof durationMin === 'number' ? durationMin : undefined),
                        source: 'ENLIGNE',
                      });

                      if (success) {
                        reservation.date = dISO;
                        reservation.time = t;
                        reservation.people = p ?? reservation.people;
                        reservation.program_id = isRestaurant
                          ? reservation.program_id
                          : (programId ?? reservation.program_id);
                      }
                    }

                    if (success) {
                      setPeople(p ?? people);
                      setDateISO(dISO);
                      setTime(t);
                      setTab('view');
                    } else {
                      console.warn('Failed to save reservation');
                    }
                  }}
                />
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default ReservationDetailScreen;
