// src/components/EditReservationForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Alert } from '../src/ui/AppAlert';
import dayjs from 'dayjs';
import CustomCalendarModal from './CustomCalendarModal';
import { isoToFrDisplay, formatDuration } from '../utils/date';
import AppIcon from '../src/icons/AppIcon';
import { AuthButton } from '../src/ui/AuthKit';
import { getCurrentUser } from '../services/user';
import { EstablishmentType } from '../types/establishment';
import {
  fetchCategories,
  fetchPrestationsByCategory,
  PrestationCategorie,
  Prestation,
  isBookable,
} from '../services/prestations';
import { fetchPanierAvailability, fetchPrestationAvailability } from '../services/availability';
import { useI18n } from '../src/i18n/LocaleProvider';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getStoredClientId } from '../src/api/auth';

type OpeningHoursLike = {
  day?: string | { name?: string } | any;
  HeureOuvertureMatin?: any;
  HeureFermetureMatin?: any;
  HeureOuvertureMidi?: any;
  HeureFermetureMidi?: any;
  heureOuvertureMatin?: any;
  heureFermetureMatin?: any;
  heureOuvertureMidi?: any;
  heureFermetureMidi?: any;
};

interface Props {
  establishmentType: EstablishmentType;
  etablissementId: number;
  clientId?: number;
  initialPeople?: number;
  initialDateISO: string;
  initialTime: string;
  availableSlots: Record<string, { time: string; reserved_by: string | null }[]>; // legacy / compat
  initialProgramId?: string;
  openingHours?: OpeningHoursLike[];
  /** Resolve to 'SLOT_TAKEN' when the slot was taken meanwhile: the form clears the time and reloads slots. */
  onConfirm: (
    people: number | undefined,
    dateISO: string,
    time: string,
    programId?: string,
    clientId?: number,
    collaborateurId?: number | null
  ) => Promise<void | 'SLOT_TAKEN'>;
  onPartySizeChange?: (people: number) => void;
  /**
   * SPA multi-prestation cart: the first item locks the visit date/time, each later item is
   * checked to follow the others at that time, and the whole cart is booked as one reservation.
   */
  enableCart?: boolean;
  onConfirmCart?: (
    cartItems: Prestation[],
    dateISO: string,
    time: string,
    clientId: number,
    collaborateurByPrestation: Record<number, number>
  ) => Promise<void | 'SLOT_TAKEN'>;
  /** Editing a booked cart: its prestations, the first one being the one shown as selected. */
  editPrestationIds?: number[];
  /** Editing: the reservation itself does not block the times it already holds. */
  excludeReservationId?: number;
}

/* ---------------- time helpers (15-min step) ---------------- */
const STEP_MIN = 15;

const toHm = (v: any): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const hhmm = v.slice(0, 5);
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return undefined;
  }
  if (typeof v === 'object') {
    const h = v?.hour ?? v?.H ?? v?.h;
    const m = v?.minute ?? v?.M ?? v?.m;
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return undefined;
};

const cmpHm = (a: string, b: string) => a.localeCompare(b);

const addMinutesHm = (hm: string, delta: number): string => {
  const [H, M] = hm.split(':').map(Number);
  const total = H * 60 + M + delta;
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const rangeStep = (start?: string, end?: string, stepMin = STEP_MIN): string[] => {
  if (!start || !end) return [];
  const out: string[] = [];
  let cur = start;
  while (cmpHm(cur, end) < 0) {
    out.push(cur);
    cur = addMinutesHm(cur, stepMin);
  }
  return out;
};

/* ---------------- day matching ---------------- */
const DOW_ENUM: ReadonlyArray<
  'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
> = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const normalizeBackendDay = (d: any): string => {
  if (!d) return '';
  if (typeof d === 'string') return d.toUpperCase();
  if (typeof d === 'object') {
    const name = (d.name ?? d)?.toString?.() ?? String(d);
    return String(name).toUpperCase();
  }
  return String(d).toUpperCase();
};

const EditReservationForm: React.FC<Props> = ({
  establishmentType,
  etablissementId,
  initialPeople,
  initialDateISO,
  initialTime,
  availableSlots,
  initialProgramId,
  openingHours,
  onConfirm,
  clientId: clientIdProp,
  onPartySizeChange,
  enableCart,
  onConfirmCart,
  editPrestationIds,
  excludeReservationId,
}) => {
  const { t, formatMoney, formatDate } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [people, setPeople] = useState<number>(initialPeople ?? 2);
  const [dateISO, setDateISO] = useState<string>(initialDateISO);
  const [time, setTime] = useState<string>(initialTime);
  const [showCal, setShowCal] = useState(false);

  const [categories, setCategories] = useState<PrestationCategorie[]>([]);
  const [prestationsByCat, setPrestationsByCat] = useState<Record<number, Prestation[]>>({});
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingPrestations, setLoadingPrestations] = useState<number | null>(null);

  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);

  const [isSaving, setIsSaving] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<number | null>(
    typeof clientIdProp === 'number' ? clientIdProp : null
  );

  // ⬇️ NEW: server slots from /availability (used for non-restaurant)
  const [serverSlots, setServerSlots] = useState<string[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  // bumped to re-fetch availability after a slot conflict
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

  // modal to pick time
  const [showTimeModal, setShowTimeModal] = useState(false);

  // SPA cart: items share the visit date/time locked by the first one
  const [cartItems, setCartItems] = useState<Prestation[]>([]);
  const [cartDate, setCartDate] = useState('');
  const [cartTime, setCartTime] = useState('');
  const [showCart, setShowCart] = useState(false);
  // practitioner asked for the prestation being chosen (null: no preference), and for each cart item
  const [selectedCollaborateurId, setSelectedCollaborateurId] = useState<number | null>(null);
  const [cartPins, setCartPins] = useState<Record<number, number | null>>({});
  // whether the prestation being chosen can follow the cart at its time (checked with the server)
  const [fitChecking, setFitChecking] = useState(false);
  const [fitOk, setFitOk] = useState(false);

  /* ---------- people ---------- */
  const setPeopleAndEmit = (val: number) => {
    const next = Math.max(1, Math.min(20, val));
    setPeople(next);
    if (establishmentType === EstablishmentType.RESTAURANT && typeof onPartySizeChange === 'function') {
      onPartySizeChange(next);
    }
  };

  const isRestaurant = establishmentType === EstablishmentType.RESTAURANT;
  const isOther = !isRestaurant;

  /* ---------- load categories (non-restaurant) ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isRestaurant) {
        try {
          setLoadingCat(true);
          const cats = await fetchCategories(etablissementId);
          if (mounted) setCategories(cats);
        } catch (e) {
          console.error('❌ fetchCategories failed', e);
        } finally {
          if (mounted) setLoadingCat(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isRestaurant, etablissementId]);

  /* ---------- resolve clientId ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof clientIdProp === 'number' && clientIdProp > 0) {
        if (mounted) setResolvedClientId(clientIdProp);
        return;
      }
      try {
        const user = await getCurrentUser(false);
        const id =
          (typeof (user as any)?.clientId === 'number' ? (user as any).clientId : undefined) ??
          (typeof (user as any)?.id === 'number' ? (user as any).id : undefined);
        if (mounted) setResolvedClientId(id ?? null);
      } catch {
        if (mounted) setResolvedClientId(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clientIdProp]);

  const finalClientId = useMemo(() => {
    return typeof clientIdProp === 'number' && clientIdProp > 0
      ? clientIdProp
      : typeof resolvedClientId === 'number' && resolvedClientId > 0
      ? resolvedClientId
      : undefined;
  }, [clientIdProp, resolvedClientId]);

  /* ---------- expand category ---------- */
  const handleExpandCategory = async (catId: number) => {
    if (expandedCategoryId === catId) {
      setExpandedCategoryId(null);
      setSelectedProgramId(null);
      setTime('');
      setServerSlots([]); // reset server slots
      return;
    }
    setExpandedCategoryId(catId);
    setSelectedProgramId(null);
    setTime('');
    setServerSlots([]);

    if (!prestationsByCat[catId]) {
      try {
        setLoadingPrestations(catId);
        const list = await fetchPrestationsByCategory(catId);
        setPrestationsByCat((prev) => ({ ...prev, [catId]: list }));
      } catch (e) {
        console.error('❌ fetchPrestationsByCategory failed', e);
      } finally {
        setLoadingPrestations(null);
      }
    }
  };

  useEffect(() => {
    setSelectedCollaborateurId(null);
  }, [selectedProgramId]);

  const selectedCategory = categories.find((c) => c.id === expandedCategoryId) || null;
  const prestations = selectedCategory ? prestationsByCat[selectedCategory.id] ?? [] : [];
  const selectedProgram = prestations.find((p) => p.id === Number(selectedProgramId)) ?? null;

  /* ---------- hours from openingHours ---------- */
  const hoursRowForDate = useMemo(() => {
    if (!Array.isArray(openingHours) || openingHours.length === 0) return null;
    const dowEnum = DOW_ENUM[dayjs(dateISO).day()];
    return openingHours.find((r) => normalizeBackendDay(r?.day) === dowEnum) || null;
  }, [openingHours, dateISO]);

  const mo = useMemo(
    () => toHm((hoursRowForDate as any)?.HeureOuvertureMatin ?? (hoursRowForDate as any)?.heureOuvertureMatin),
    [hoursRowForDate]
  );
  const mc = useMemo(
    () => toHm((hoursRowForDate as any)?.HeureFermetureMatin ?? (hoursRowForDate as any)?.heureFermetureMatin),
    [hoursRowForDate]
  );
  const eo = useMemo(
    () => toHm((hoursRowForDate as any)?.HeureOuvertureMidi ?? (hoursRowForDate as any)?.heureOuvertureMidi),
    [hoursRowForDate]
  );
  const ec = useMemo(
    () => toHm((hoursRowForDate as any)?.HeureFermetureMidi ?? (hoursRowForDate as any)?.heureFermetureMidi),
    [hoursRowForDate]
  );

  // Build all visible slots (STEP_MIN) from opening hours
 const allSlotsFromHours: string[] = useMemo(() => {
  // If no hours – fallback for restaurant
  if (!hoursRowForDate) {
    if (isRestaurant) {
      return rangeStep("09:00", "23:00", STEP_MIN);
    }
    return [];
  }

  const blocks: Array<{ start: string; end: string }> = [];
  if (mo && mc) blocks.push({ start: mo, end: mc });
  if (eo && ec) blocks.push({ start: eo, end: ec });
  if (mo && ec && !mc && !eo) blocks.push({ start: mo, end: ec });

  if (blocks.length === 0) {
    const start = mo ?? eo;
    const end = ec ?? mc;
    if (start && end) blocks.push({ start, end });
  }

  let raw: string[] = [];
  for (const b of blocks) raw = raw.concat(rangeStep(b.start, b.end, STEP_MIN));

  const todayIso = dayjs().format("YYYY-MM-DD");
  if (dateISO === todayIso) {
    const nowHm = dayjs().format("HH:mm");
    raw = raw.filter((t) => t >= nowHm);
  }

  return Array.from(new Set(raw)).sort();
}, [hoursRowForDate, mo, mc, eo, ec, dateISO, isRestaurant]);


  // Fallback slots from legacy availableSlots (used mainly on edit)
  const slotsFromAvailable: string[] = useMemo(() => {
    if (!availableSlots) return [];
    const dayEntries = availableSlots[dateISO] ?? [];
    return Array.from(
      new Set(
        dayEntries
          .map((s) => (s.time || '').toString().slice(0, 5))
          .filter((t) => t && /^\d{2}:\d{2}$/.test(t))
      )
    ).sort();
  }, [availableSlots, dateISO]);

  /* ---------- fetch availability for non-restaurant ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isOther) {
        setServerSlots([]);
        return;
      }
      if (!selectedProgramId) {
        setServerSlots([]);
        return;
      }
      // the visit time is locked by the cart: checked further down instead
      if (cartItems.length > 0) return;
      try {
        setAvailLoading(true);
        const programId = Number(selectedProgramId);
        // a booked cart is checked as a whole (its first prestation may have been changed)
        const ids =
          editPrestationIds && editPrestationIds.length > 1 ? [programId, ...editPrestationIds.slice(1)] : [programId];
        const resp =
          ids.length > 1 || selectedCollaborateurId != null || excludeReservationId != null
            ? await fetchPanierAvailability(
                etablissementId,
                ids,
                dateISO,
                { [programId]: selectedCollaborateurId },
                excludeReservationId
              )
            : await fetchPrestationAvailability(etablissementId, programId, dateISO, STEP_MIN);
        if (!mounted) return;
        const slots = Array.isArray(resp.slots)
          ? resp.slots.map((s) => s.toString().slice(0, 5))
          : [];
        setServerSlots(slots);
      } catch (e) {
        if (mounted) setServerSlots([]); // fallback
      } finally {
        if (mounted) setAvailLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOther, selectedProgramId, selectedCollaborateurId, etablissementId, dateISO, slotsReloadKey, cartItems.length > 0]);

  // base slots:
  // - RESTAURANT: openingHours or legacy availableSlots
  // - OTHER (SPA, etc.): prefer serverSlots from backend; fallback to openingHours or legacy
const baseSlots: string[] = useMemo(() => {
  if (isRestaurant) {
    // RESTAURANT → ALWAYS RETURN FULL OPENING HOURS, NO FILTER
    return allSlotsFromHours;
  }

  // NON-RESTAURANT → USE SERVER FIRST, THEN HOURS, THEN LEGACY
  if (serverSlots.length > 0) return Array.from(new Set(serverSlots)).sort();
  if (allSlotsFromHours.length > 0) return allSlotsFromHours;
  return slotsFromAvailable;
}, [isRestaurant, allSlotsFromHours, slotsFromAvailable, serverSlots]);


const finalTimeList: string[] = useMemo(() => {
  let list = [...baseSlots];

  // For restaurant: NEVER append legacy initialTime
  if (!isRestaurant && initialTime && !list.includes(initialTime)) {
    list.push(initialTime);
  }

  // Remove past slots only for today
  const todayIso = dayjs().format("YYYY-MM-DD");
  if (dateISO === todayIso) {
    const nowHm = dayjs().format("HH:mm");
    list = list.filter((t) => t >= nowHm);
  }

  return Array.from(new Set(list)).sort();
}, [baseSlots, initialTime, dateISO, isRestaurant]);


  // Decide sectioning (only if we have openingHours)
  const hasMorningPair = !!(mo && mc);
  const hasAfternoonPair = !!(eo && ec);
  const isMergedContinuous = !!(mo && ec && !mc && !eo);
  const showTwoSections = hasMorningPair || hasAfternoonPair ? !isMergedContinuous : false;

  const sectioned = useMemo(() => {
    if (!showTwoSections) {
      return { single: finalTimeList, morning: [] as string[], afternoon: [] as string[] };
    }
    const morningSlots = rangeStep(mo!, mc!, STEP_MIN).filter((t) => finalTimeList.includes(t));
    const afternoonSlots = rangeStep(eo!, ec!, STEP_MIN).filter((t) => finalTimeList.includes(t));
    return { single: [] as string[], morning: morningSlots, afternoon: afternoonSlots };
  }, [showTwoSections, finalTimeList, mo, mc, eo, ec]);

  // Availability check per chip
  // For non-restaurant, if serverSlots is used as base, all chips in finalTimeList are valid, so just return true.
  const isChipEnabled = (t: string) => {
    if (isRestaurant) return true;
    if (serverSlots.length > 0) return serverSlots.includes(t);
    return true;
  };

  const onSelectTime = (t: string) => {
    if (!isChipEnabled(t)) return;
    setTime(t);
    setShowTimeModal(false);
  };

  /**
   * Client id for booking. Re-reads storage (the user may have logged in since this screen
   * opened); when nobody is logged in, offers to go to the login screen instead of failing silently.
   */
  const ensureClient = async (): Promise<number | undefined> => {
    if (finalClientId) return finalClientId;
    const stored = await getStoredClientId();
    if (typeof stored === 'number' && stored > 0) {
      setResolvedClientId(stored);
      return stored;
    }
    Alert.alert(t('booking.loginRequiredTitle'), t('booking.loginRequired'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.login'), onPress: () => navigation.navigate('Login') },
    ]);
    return undefined;
  };

  const onConfirmPress = async () => {
    if (!time) return;
    if (!isRestaurant && !selectedProgramId) return;
    const cid = await ensureClient();
    if (!cid) return;
    setIsSaving(true);
    try {
      const outcome = await onConfirm(
        isRestaurant ? people : undefined,
        dateISO,
        time,
        selectedProgramId ?? undefined,
        cid,
        selectedCollaborateurId
      );
      if (outcome === 'SLOT_TAKEN') {
        setTime('');
        setSlotsReloadKey((k) => k + 1);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = !!time && (isRestaurant || !!selectedProgramId);

  /* ---------- SPA cart ---------- */
  const cartMode = !!enableCart && !isRestaurant && typeof onConfirmCart === 'function';
  const cartLocked = cartMode && cartItems.length > 0;
  const allPrestations = useMemo(() => Object.values(prestationsByCat).flat(), [prestationsByCat]);
  const selectedPrestation = allPrestations.find((p) => String(p.id) === selectedProgramId) ?? null;
  const isInCart = (id: number) => cartItems.some((p) => p.id === id);
  const cartTotalMinutes = cartItems.reduce((sum, p) => sum + (p.durationMinutes ?? 0), 0);
  /** Lowest price of a prestation (its fixed price, or the bottom of its range); null on quote. */
  const priceOf = (p: Prestation) => p.prixFixe ?? p.prixMin ?? null;
  const cartTotalPrice = cartItems.reduce((sum, p) => sum + (priceOf(p) ?? 0), 0);
  // "à partir de" when a price is a range or on quote
  const cartTotalIsFrom = cartItems.some((p) => p.prixFixe == null);
  const practitionerName = (p: Prestation, id: number | null | undefined) =>
    id == null ? '' : (p.collaborateurOptions ?? []).find((c) => c.id === id)?.label ?? '';

  // Each later item must follow the cart at the locked visit time, every prestation by someone free for it.
  useEffect(() => {
    let mounted = true;
    setFitOk(false);
    if (!cartLocked || !selectedPrestation || isInCart(selectedPrestation.id)) {
      setFitChecking(false);
      return;
    }
    const ids = [...cartItems.map((p) => p.id), selectedPrestation.id];
    const pins = { ...cartPins, [selectedPrestation.id]: selectedCollaborateurId };
    setFitChecking(true);
    fetchPanierAvailability(etablissementId, ids, cartDate, pins)
      .then((resp) => {
        if (!mounted) return;
        const ok = (resp.slots ?? []).some((s) => s.toString().slice(0, 5) === cartTime);
        setFitOk(ok);
        if (!ok) Alert.alert(t('booking.title'), t('booking.cannotChain', { time: cartTime }));
      })
      .catch(() => {
        if (mounted) setFitOk(false);
      })
      .finally(() => {
        if (mounted) setFitChecking(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLocked, selectedPrestation?.id, selectedCollaborateurId, cartItems, cartDate, cartTime, etablissementId]);

  // the first item needs a chosen time; later items must fit after the cart at the locked visit time
  const canAddToCart =
    cartMode &&
    !!selectedPrestation &&
    !isInCart(selectedPrestation.id) &&
    (cartLocked ? fitOk && !fitChecking : !!time);

  const addToCart = () => {
    if (!canAddToCart || !selectedPrestation) return;
    if (!cartLocked) {
      setCartDate(dateISO);
      setCartTime(time);
    }
    setCartItems([...cartItems, selectedPrestation]);
    setCartPins({ ...cartPins, [selectedPrestation.id]: selectedCollaborateurId });
    setSelectedProgramId(null);
    setTime('');
  };

  /** Removing the last item unlocks the visit date/time again. */
  const removeFromCart = (id: number) => {
    const next = cartItems.filter((p) => p.id !== id);
    setCartItems(next);
    setCartPins(({ [id]: _removed, ...rest }) => rest);
    if (next.length === 0) {
      setDateISO(cartDate || dateISO);
      setTime(cartTime);
      setCartDate('');
      setCartTime('');
    }
  };

  const editCartItem = (p: Prestation) => {
    const pin = cartPins[p.id] ?? null;
    removeFromCart(p.id);
    setSelectedProgramId(String(p.id));
    // after the reset done when the selection changes
    setTimeout(() => setSelectedCollaborateurId(pin), 0);
    setShowCart(false);
  };

  const confirmCart = async () => {
    if (!onConfirmCart || cartItems.length === 0 || !cartDate || !cartTime) return;
    const cid = await ensureClient();
    if (!cid) return;
    setIsSaving(true);
    try {
      const pins: Record<number, number> = {};
      for (const p of cartItems) {
        const pin = cartPins[p.id];
        if (pin != null) pins[p.id] = pin;
      }
      const outcome = await onConfirmCart(cartItems, cartDate, cartTime, cid, pins);
      if (outcome === 'SLOT_TAKEN') {
        // The visit time is gone: unlock it and reselect the first item so new times load.
        const first = cartItems[0];
        setCartItems([]);
        setCartPins({});
        setDateISO(cartDate);
        setCartDate('');
        setCartTime('');
        setTime('');
        setSelectedProgramId(String(first.id));
        setSlotsReloadKey((k) => k + 1);
      }
      setShowCart(false);
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------- render ---------------- */
  const showDateTime = ((!isRestaurant && selectedProgramId) || isRestaurant) && !cartLocked;
  const dateLabel = (() => {
    const today = dayjs().format('YYYY-MM-DD');
    const base = isoToFrDisplay(dateISO);
    return dateISO === today ? t('booking.today', { date: base }) : base;
  })();
  const chevron = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

  const renderSlot = (slot: string, keyPrefix: string) => {
    const enabled = isChipEnabled(slot);
    const active = enabled && slot === time;
    return (
      <TouchableOpacity
        key={`${keyPrefix}-${slot}`}
        onPress={() => onSelectTime(slot)}
        activeOpacity={enabled ? 0.85 : 1}
        style={[styles.slot, active && styles.slotActive, !enabled && styles.slotDisabled]}
      >
        <Text style={[styles.slotText, active && styles.slotTextActive, !enabled && styles.slotTextDisabled]}>
          {slot}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('booking.title')}</Text>
        {cartMode && (
          <TouchableOpacity
            onPress={() => setShowCart(true)}
            accessibilityLabel={t('booking.viewCart')}
            style={styles.cartPill}
            activeOpacity={0.8}
          >
            <AppIcon name="bag-handle-outline" size={16} color={INK} />
            <Text style={styles.cartPillText}>{t('booking.cart')}</Text>
            {cartItems.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Restaurant flow: party size */}
      {isRestaurant && (
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <AppIcon name="people-outline" size={20} color={BRAND} />
          </View>
          <Text style={[styles.rowValue, { flex: 1 }]}>{t('booking.people')}</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => setPeopleAndEmit((people ?? 1) - 1)}
              style={[styles.stepButton, (people ?? 1) <= 1 && styles.stepButtonDisabled]}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <AppIcon name="remove" size={18} color={(people ?? 1) <= 1 ? '#BDB7B0' : INK} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>{people ?? 1}</Text>
            <TouchableOpacity
              onPress={() => setPeopleAndEmit((people ?? 1) + 1)}
              style={[styles.stepButton, styles.stepButtonPlus]}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <AppIcon name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Non-restaurant flow: categories / services */}
      {!isRestaurant && (
        <View style={{ gap: 10 }}>
          {loadingCat && <ActivityIndicator size="small" color={BRAND} />}

          {!loadingCat && categories.length === 0 && (
            <Text style={styles.muted}>{t('booking.noCategories')}</Text>
          )}

          {categories.map((cat) => {
            const open = expandedCategoryId === cat.id;
            return (
              <View key={cat.id} style={[styles.category, open && styles.categoryOpen]}>
                <TouchableOpacity
                  onPress={() => handleExpandCategory(cat.id)}
                  activeOpacity={0.8}
                  style={styles.categoryHeader}
                >
                  <Text style={styles.categoryTitle}>{cat.nom}</Text>
                  <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={open ? BRAND : MUTED} />
                </TouchableOpacity>

                {open && (
                  <View style={styles.services}>
                    {loadingPrestations === cat.id ? (
                      <ActivityIndicator size="small" color={BRAND} />
                    ) : (prestationsByCat[cat.id] ?? []).length === 0 ? (
                      <Text style={styles.muted}>{t('booking.noPrestations')}</Text>
                    ) : (
                      (prestationsByCat[cat.id] ?? []).map((p) => {
                        const selected = selectedProgramId === String(p.id);
                        // "Affichée mais non réservable": shown greyed, cannot be chosen
                        const bookable = isBookable(p);
                        return (
                          <TouchableOpacity
                            key={p.id}
                            activeOpacity={bookable ? 0.85 : 1}
                            disabled={!bookable}
                            onPress={() => setSelectedProgramId(selected ? null : String(p.id))}
                            accessibilityRole="radio"
                            accessibilityState={{ selected, disabled: !bookable }}
                            style={[styles.service, selected && styles.serviceSelected, !bookable && styles.serviceDisabled]}
                          >
                            <View style={[styles.radio, (selected || isInCart(p.id)) && styles.radioOn]}>
                              {selected && <View style={styles.radioDot} />}
                              {!selected && cartMode && isInCart(p.id) && (
                                <AppIcon name="checkmark" size={12} color={BRAND} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.serviceTop}>
                                <Text style={styles.serviceName}>{p.nom}</Text>
                                {!bookable && (
                                  <Text style={styles.notBookable}>{t('booking.notBookableOnline')}</Text>
                                )}
                                {cartMode && isInCart(p.id) && (
                                  <View style={styles.inCart}>
                                    <AppIcon name="checkmark" size={12} color={BRAND} />
                                    <Text style={styles.inCartText}>{t('booking.inCart')}</Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.serviceMeta}>
                                {!!p.durationMinutes && (
                                  <View style={styles.serviceMetaItem}>
                                    <AppIcon name="time-outline" size={14} color={MUTED} />
                                    <Text style={styles.serviceMetaText}>{formatDuration(p.durationMinutes)}</Text>
                                  </View>
                                )}
                                <Text style={styles.servicePrice}>
                                  {p.prixFixe !== null
                                    ? formatMoney(p.prixFixe)
                                    : p.prixMin !== null && p.prixMax !== null
                                    ? t('booking.priceRange', { min: formatMoney(p.prixMin), max: formatMoney(p.prixMax) })
                                    : t('booking.onQuote')}
                                </Text>
                              </View>

                              {selected && !!p.description && (
                                <Text style={styles.serviceDescription}>{p.description}</Text>
                              )}

                              {/* the client may ask for someone, or leave it to the establishment */}
                              {selected && (p.collaborateurOptions ?? []).length > 0 && (
                                <View style={styles.practitioners}>
                                  <Text style={styles.rowLabel}>{t('booking.practitioner')}</Text>
                                  <View style={styles.practitionerChips}>
                                    {[
                                      { id: null as number | null, label: t('booking.anyPractitioner') },
                                      ...(p.collaborateurOptions ?? []),
                                    ].map((c) => {
                                      const on = selectedCollaborateurId === c.id;
                                      return (
                                        <TouchableOpacity
                                          key={c.id ?? 'any'}
                                          onPress={() => {
                                            setSelectedCollaborateurId(c.id);
                                            setTime('');
                                          }}
                                          activeOpacity={0.85}
                                          accessibilityRole="radio"
                                          accessibilityState={{ selected: on }}
                                          style={[styles.practitionerChip, on && styles.practitionerChipOn]}
                                        >
                                          <Text style={[styles.practitionerText, on && styles.practitionerTextOn]}>
                                            {c.label}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Visit time locked by the first cart item */}
      {cartLocked && (
        <View style={styles.locked}>
          <AppIcon name="lock-closed-outline" size={16} color={BRAND} />
          <Text style={styles.lockedText}>
            {t('booking.visitAt', { date: formatDate(cartDate), time: cartTime })}
          </Text>
        </View>
      )}

      {/* Date */}
      {showDateTime && (
        <TouchableOpacity onPress={() => setShowCal(true)} activeOpacity={0.85} style={styles.row}>
          <View style={styles.rowIcon}>
            <AppIcon name="calendar-outline" size={20} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{t('booking.forDate')}</Text>
            <Text style={styles.rowValue}>{dateLabel}</Text>
          </View>
          <AppIcon name={chevron} size={18} color={MUTED} />
        </TouchableOpacity>
      )}

      {/* Time */}
      {showDateTime && (
        <TouchableOpacity onPress={() => setShowTimeModal(true)} activeOpacity={0.85} style={styles.row}>
          <View style={styles.rowIcon}>
            <AppIcon name="time-outline" size={20} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>
              {t('booking.time')}
              {availLoading && !isRestaurant ? `  ·  ${t('booking.checking')}` : ''}
            </Text>
            <Text style={[styles.rowValue, !time && styles.rowPlaceholder]}>
              {time || t('booking.pickTime')}
            </Text>
          </View>
          <AppIcon name={chevron} size={18} color={MUTED} />
        </TouchableOpacity>
      )}

      {/* Confirm (or, for SPA, add to cart — the cart is confirmed from its sheet) */}
      <View style={{ marginTop: 6 }}>
        {cartMode ? (
          <AuthButton
            label={t('booking.addToCart')}
            onPress={addToCart}
            disabled={!canAddToCart}
            loading={fitChecking}
          />
        ) : (
          <AuthButton
            label={t('booking.confirm')}
            onPress={onConfirmPress}
            disabled={!canSubmit}
            loading={isSaving}
          />
        )}
      </View>

      {/* Cart sheet */}
      <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => setShowCart(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCart(false)} />
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('booking.cart')}</Text>
              <TouchableOpacity onPress={() => setShowCart(false)} hitSlop={10} accessibilityLabel={t('common.close')}>
                <AppIcon name="close" size={24} color={INK} />
              </TouchableOpacity>
            </View>

            {cartItems.length === 0 ? (
              <View style={styles.cartEmpty}>
                <AppIcon name="bag-handle-outline" size={28} color={MUTED} />
                <Text style={[styles.muted, { textAlign: 'center' }]}>{t('booking.cartEmpty')}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.locked, { marginBottom: 12 }]}>
                  <AppIcon name="time-outline" size={16} color={BRAND} />
                  <Text style={styles.lockedText}>
                    {t('booking.visitAt', { date: formatDate(cartDate), time: cartTime })}
                  </Text>
                </View>
                <ScrollView style={{ marginBottom: 12 }}>
                  {cartItems.map((p) => (
                    <View key={p.id} style={styles.cartItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{p.nom}</Text>
                        <View style={[styles.serviceMetaItem, { marginTop: 4 }]}>
                          <AppIcon name="time-outline" size={13} color={MUTED} />
                          <Text style={styles.serviceMetaText}>
                            {formatDuration(p.durationMinutes)}
                            {p.prixFixe != null
                              ? ` • ${formatMoney(p.prixFixe)}`
                              : p.prixMin != null && p.prixMax != null
                              ? ` • ${t('booking.priceRange', { min: formatMoney(p.prixMin), max: formatMoney(p.prixMax) })}`
                              : ` • ${t('booking.onQuote')}`}
                          </Text>
                        </View>
                        {!!practitionerName(p, cartPins[p.id]) && (
                          <Text style={[styles.serviceMetaText, { marginTop: 2 }]}>
                            {t('booking.withPractitioner', { name: practitionerName(p, cartPins[p.id]) })}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => editCartItem(p)}
                          accessibilityLabel={t('booking.editItem', { name: p.nom })}
                          style={styles.iconButton}
                        >
                          <AppIcon name="create-outline" size={18} color={BRAND} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeFromCart(p.id)}
                          accessibilityLabel={t('booking.removeItem', { name: p.nom })}
                          style={styles.iconButton}
                        >
                          <AppIcon name="trash-outline" size={18} color={MUTED} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>
                    {t('booking.totalDuration', { n: formatDuration(cartTotalMinutes) })}
                  </Text>
                  <Text style={[styles.totalText, { marginTop: 4 }]}>
                    {t(cartTotalIsFrom ? 'booking.cartTotalFrom' : 'booking.cartTotal', {
                      amount: formatMoney(cartTotalPrice),
                    })}
                  </Text>
                </View>
                <AuthButton label={t('booking.confirmCart')} onPress={confirmCart} loading={isSaving} />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Calendar modal */}
      <CustomCalendarModal
        visible={showCal}
        onClose={() => setShowCal(false)}
        onSelectDate={(iso) => {
          setDateISO(iso);
          setTime('');
          setServerSlots([]); // reset slots when date changes
        }}
        selectedDate={dateISO}
        disabledDates={[]}
      />

      {/* Time selection modal */}
      <Modal
        visible={showTimeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTimeModal(false)} />
          <View style={[styles.sheet, { maxHeight: '78%' }]}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{t('booking.pickSlot')}</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {isoToFrDisplay(dateISO)}
                  {selectedProgram ? ` • ${selectedProgram.nom}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimeModal(false)} hitSlop={10} accessibilityLabel={t('common.close')}>
                <AppIcon name="close" size={24} color={INK} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 12 }}>
              {/* Morning / Afternoon sections or single list */}
              {showTwoSections ? (
                <>
                  <View style={styles.slotSection}>
                    <AppIcon name="sunny-outline" size={16} color={MUTED} />
                    <Text style={styles.slotSectionTitle}>{t('booking.morning')}</Text>
                  </View>
                  <View style={styles.slots}>
                    {rangeStep(mo!, mc!, STEP_MIN)
                      .filter((s) => finalTimeList.includes(s))
                      .map((s) => renderSlot(s, 'm'))}
                    {rangeStep(mo!, mc!, STEP_MIN).filter((s) => finalTimeList.includes(s)).length === 0 && (
                      <Text style={styles.muted}>{t('booking.noMorning')}</Text>
                    )}
                  </View>

                  <View style={styles.slotSection}>
                    <AppIcon name="moon-outline" size={16} color={MUTED} />
                    <Text style={styles.slotSectionTitle}>{t('booking.afternoon')}</Text>
                  </View>
                  <View style={styles.slots}>
                    {rangeStep(eo!, ec!, STEP_MIN)
                      .filter((s) => finalTimeList.includes(s))
                      .map((s) => renderSlot(s, 's'))}
                    {rangeStep(eo!, ec!, STEP_MIN).filter((s) => finalTimeList.includes(s)).length === 0 && (
                      <Text style={styles.muted}>{t('booking.noAfternoon')}</Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.slotSection}>
                    <Text style={styles.slotSectionTitle}>{t('booking.availableSlots')}</Text>
                  </View>
                  <View style={styles.slots}>
                    {finalTimeList.map((s) => renderSlot(s, 'one'))}
                    {finalTimeList.length === 0 && (
                      <Text style={styles.muted}>{t('booking.noSlots')}</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <AuthButton
              label={t('booking.validate')}
              onPress={() => setShowTimeModal(false)}
              disabled={!time}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const BRAND = '#C53334';
const INK = '#16120F';
const MUTED = '#8A8580';
const SURFACE = '#F5F3F0';
const BRAND_TINT = 'rgba(197,51,52,0.08)';

const styles = StyleSheet.create({
  container: {
    padding: 18,
    gap: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: INK, letterSpacing: -0.3, flexShrink: 1 },
  cartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E0DB',
  },
  cartPillText: { fontSize: 14, fontWeight: '600', color: INK },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: SURFACE,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 2 },
  rowValue: { fontSize: 16, fontWeight: '700', color: INK },
  rowPlaceholder: { color: MUTED, fontWeight: '600' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D6D1CB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { borderColor: '#E9E5E0' },
  stepButtonPlus: { backgroundColor: BRAND, borderColor: BRAND },
  stepValue: { minWidth: 24, textAlign: 'center', fontSize: 20, fontWeight: '800', color: INK },

  category: { borderRadius: 18, backgroundColor: SURFACE, overflow: 'hidden' },
  categoryOpen: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8E3' },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  categoryTitle: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: INK },
  services: { paddingHorizontal: 10, paddingBottom: 10, gap: 8 },
  service: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ECE8E3',
    backgroundColor: '#FFFFFF',
  },
  serviceSelected: { borderColor: BRAND, backgroundColor: BRAND_TINT },
  serviceDisabled: { opacity: 0.5 },
  notBookable: { fontSize: 11, fontWeight: '700', color: MUTED },
  practitioners: { marginTop: 10 },
  practitionerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  practitionerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E0DB',
    backgroundColor: '#FFFFFF',
  },
  practitionerChipOn: { borderColor: BRAND, backgroundColor: BRAND },
  practitionerText: { fontSize: 13, fontWeight: '600', color: INK },
  practitionerTextOn: { color: '#FFFFFF' },
  radio: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C9C4BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: BRAND },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND },
  serviceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  serviceName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: INK },
  inCart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  inCartText: { fontSize: 11, fontWeight: '700', color: BRAND },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  serviceMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceMetaText: { fontSize: 13, color: MUTED },
  servicePrice: { fontSize: 14, fontWeight: '700', color: INK },
  serviceDescription: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#5A5550' },

  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: BRAND_TINT,
  },
  lockedText: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: INK, textAlign: 'center' },

  muted: { fontSize: 14, color: MUTED },

  backdrop: { flex: 1, backgroundColor: 'rgba(12,8,6,0.45)', justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#DDD8D2', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: INK },
  sheetSubtitle: { marginTop: 2, fontSize: 13, color: MUTED },

  slotSection: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
  slotSectionTitle: { fontSize: 14, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  slot: {
    width: '23%',
    flexGrow: 0,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E0DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  slotActive: { backgroundColor: BRAND, borderColor: BRAND },
  slotDisabled: { backgroundColor: SURFACE, borderColor: SURFACE },
  slotText: { fontSize: 15, fontWeight: '700', color: INK },
  slotTextActive: { color: '#FFFFFF' },
  slotTextDisabled: { color: '#BDB7B0', textDecorationLine: 'line-through' },

  cartEmpty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: SURFACE,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: { paddingVertical: 4, marginBottom: 14 },
  totalText: { fontSize: 15, fontWeight: '700', color: INK },
});

export default EditReservationForm;
