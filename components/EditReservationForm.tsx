// src/components/EditReservationForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import CustomCalendarModal from './CustomCalendarModal';
import { isoToFrDisplay } from '../utils/date';
import { getCurrentUser } from '../services/user';
import { EstablishmentType } from '../types/establishment';
import {
  fetchCategories,
  fetchPrestationsByCategory,
  PrestationCategorie,
  Prestation,
} from '../services/prestations';
import { fetchPrestationAvailability } from '../services/availability';
import { red } from 'react-native-reanimated/lib/typescript/Colors';

dayjs.locale('fr');

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
  onConfirm: (
    people: number | undefined,
    dateISO: string,
    time: string,
    programId?: string,
    clientId?: number
  ) => Promise<void>;
  onPartySizeChange?: (people: number) => void;
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
}) => {
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

  // modal to pick time
  const [showTimeModal, setShowTimeModal] = useState(false);

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
      try {
        setAvailLoading(true);
        const resp = await fetchPrestationAvailability(
          etablissementId,
          Number(selectedProgramId),
          dateISO,
          STEP_MIN
        );
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
  }, [isOther, selectedProgramId, etablissementId, dateISO]);

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

  const onConfirmPress = async () => {
    if (!time) return;
    if (!isRestaurant && !selectedProgramId) return;
    if (!finalClientId) {
      Alert.alert('Session requise', 'Veuillez vous reconnecter.');
      return;
    }
    setIsSaving(true);
    try {
      await onConfirm(
        isRestaurant ? people : undefined,
        dateISO,
        time,
        selectedProgramId ?? undefined,
        finalClientId
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = !!finalClientId && !!time && (isRestaurant || !!selectedProgramId);

  /* ---------------- render ---------------- */
  return (
    <ScrollView className="mt-6 bg-[#F3F3F3] rounded-2xl" keyboardShouldPersistTaps="handled" 
    style={{padding:12}}
    >
              <Text className="text-base font-semibold mb-3">Je réserve ma place</Text>
      <View className="rounded-2xl p-4 mb-4">

        {/* Restaurant flow */}
        {isRestaurant && (
          <View className=" rounded-2xl p-3 mb-3">
            <View className="flex-row items-center justify-between px-2 py-2 bg-[#F3F3F3] rounded-2xl">

  {/* Texte à gauche */}
  <Text className="text-base font-semibold flex-1">
    Nombre de personnes :
  </Text>

  {/* Bouton - */}
  <TouchableOpacity
    onPress={() => setPeopleAndEmit((people ?? 1) - 1)}
    className="w-10 h-10 rounded-full items-center justify-center"
    style={{ backgroundColor: '#C53334' }}
    activeOpacity={0.8}
  >
    <Text className="text-xl font-extrabold text-white">−</Text>
  </TouchableOpacity>

  {/* Nombre (fond blanc, pas arrondi) */}
  <View className="px-4 py-1 bg-white mx-2">
    <Text className="text-xl font-extrabold text-black">
      {people ?? 1}
    </Text>
  </View>

  {/* Bouton + */}
  <TouchableOpacity
    onPress={() => setPeopleAndEmit((people ?? 1) + 1)}
    className="w-10 h-10 rounded-full items-center justify-center"
    style={{ backgroundColor: '#C53334' }}
    activeOpacity={0.8}
  >
    <Text className="text-xl font-extrabold text-white">+</Text>
  </TouchableOpacity>
</View>

          </View>
        )}

        {/* Non-restaurant flow */}
        {!isRestaurant && (
          <View className="bg-white rounded-2xl p-3 mb-3">
            {loadingCat && <ActivityIndicator size="small" color="#C53334" />}

            {!loadingCat && categories.length === 0 && (
              <Text className="text-sm text-gray-600 italic">
                Cet établissement n’a pas encore créé de catégories.
              </Text>
            )}

            {categories.map((cat) => (
              <View key={cat.id} className="mb-3">
                <TouchableOpacity
                  onPress={() => handleExpandCategory(cat.id)}
                  className="bg-[#F3F3F3] rounded-xl p-3"
                >
                  <Text className="text-base font-semibold">{cat.nom}</Text>
                </TouchableOpacity>

                {expandedCategoryId === cat.id && (
                  <View className="mt-2 pl-4">
                    {loadingPrestations === cat.id ? (
                      <ActivityIndicator size="small" color="#C53334" />
                    ) : (prestationsByCat[cat.id] ?? []).length === 0 ? (
                      <Text className="text-sm text-gray-600 italic">
                        Cette catégorie n’a encore aucune prestation.
                      </Text>
                    ) : (
                      (prestationsByCat[cat.id] ?? []).map((p) => (
                        <View key={p.id} className="bg-[#F3F3F3] rounded-xl  p-3 mb-2 shadow-sm">
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedProgramId(
                                selectedProgramId === String(p.id) ? null : String(p.id)
                              )
                            }
                          >
                            <Text className="font-medium text-base">{p.nom}</Text>
                          </TouchableOpacity>
                          {selectedProgramId === String(p.id) && (
                            <View className="mt-2">
                              <Text className="text-sm text-gray-600">{p.description}</Text>
                              <Text className="text-sm font-medium mt-1">
                                {p.prixFixe ?? p.prixMin ?? 0} MAD • {p.durationMinutes} min
                              </Text>
                            </View>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Date */}
        {((!isRestaurant && selectedProgramId) || isRestaurant) && (
  <View className="bg-white rounded-2xl p-3 mb-3">
    <Text className="text-base font-semibold mb-2">Pour le</Text>

    <TouchableOpacity
      onPress={() => setShowCal(true)}
      className="bg-[#F3F3F3] rounded-2xl px-4 py-3 items-center justify-center"
      activeOpacity={0.9}
    >
      <Text className="text-[15px] font-semibold text-center">
        {(() => {
          const today = dayjs().format('YYYY-MM-DD');
          const isToday = dateISO === today;
          const base = isoToFrDisplay(dateISO);
          return isToday ? `Aujourd’hui. ${base}` : base;
        })()}
      </Text>
    </TouchableOpacity>
  </View>
)}


        {/* Time picker button */}
        {((!isRestaurant && selectedProgramId) || isRestaurant) && (
          <View className="bg-[#F3F3F3] rounded-2xl p-3">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-medium">Heure</Text>
              {availLoading && !isRestaurant && (
                <Text className="text-xs text-gray-500">Vérification des disponibilités…</Text>
              )}
            </View>

            {/* Current selection */}
            {time ? (
              <View className="mb-3 bg-[#F3F3F3] rounded-2xl px-4 py-3">
                <Text className="text-[15px] font-medium">Heure sélectionnée : {time}</Text>
              </View>
            ) : (
              <Text className="text-sm text-gray-500 mb-3">Aucune heure sélectionnée.</Text>
            )}

            <TouchableOpacity
              onPress={() => setShowTimeModal(true)}
              className="rounded-2xl bg-[#C53334] py-3 items-center"
              activeOpacity={0.9}
            >
              <Text className="text-white text-base font-semibold">
                {time ? 'Modifier le temps' : 'Sélectionner le temps'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Confirm */}
      <TouchableOpacity
        onPress={onConfirmPress}
        disabled={isSaving || !canSubmit}
        className={`rounded-2xl bg-[#C53334] py-4 items-center mb-6 ${
          isSaving || !canSubmit ? 'opacity-60' : ''
        }`}
      >
        <Text className="text-white text-base font-semibold">Je confirme ma REZA</Text>
      </TouchableOpacity>

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
        <View className="flex-1 bg-black/40 justify-end"
        
        >
<View
  className="bg-white rounded-t-2xl p-4"
  style={{
    maxHeight: '75%',
    width: '100%',
    padding: 20,
    flexShrink: 1,
    flexGrow: 0,
  }}
>
            <View className="items-center mb-2">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            <Text className="text-lg font-semibold mb-2">Sélectionnez un horaire</Text>
            <Text className="text-xs text-gray-500 mb-3">
              {isoToFrDisplay(dateISO)}
              {selectedProgram ? ` • ${selectedProgram.nom}` : ''}
            </Text>

            <ScrollView className="mb-3"
            
            >
              {/* Morning / Afternoon sections or single list */}
              {showTwoSections ? (
                <>
                  <Text className="font-semibold mb-2">Matin</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4"
                  >
                    {rangeStep(mo!, mc!, STEP_MIN)
                      .filter((t) => finalTimeList.includes(t))
                      .map((t) => {
                        const enabled = isChipEnabled(t);
                        const active = enabled && t === time;
                        return (
                          <TouchableOpacity
                            key={`m-${t}`}
                            onPress={() => onSelectTime(t)}
                            activeOpacity={enabled ? 0.85 : 1}
                            className={`px-4 py-2 rounded-full border ${
                              active
                                ? 'bg-[#C53334] border-[#C53334]'
                                : enabled
                                ? 'bg-white border-gray-300'
                                : 'bg-gray-100 border-gray-200'
                            }`}
                            style={!enabled ? { opacity: 0.5 } : undefined}
                          >
                            <Text className={active ? 'text-white font-medium' : 'text-black font-medium'}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    {rangeStep(mo!, mc!, STEP_MIN).filter((t) => finalTimeList.includes(t)).length === 0 && (
                      <Text className="text-sm text-gray-500 italic">Pas de créneau le matin.</Text>
                    )}
                  </View>

                  <Text className="font-semibold mb-2">Après-midi</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {rangeStep(eo!, ec!, STEP_MIN)
                      .filter((t) => finalTimeList.includes(t))
                      .map((t) => {
                        const enabled = isChipEnabled(t);
                        const active = enabled && t === time;
                        return (
                          <TouchableOpacity
                            key={`s-${t}`}
                            onPress={() => onSelectTime(t)}
                            activeOpacity={enabled ? 0.85 : 1}
                            className={`px-4 py-2 rounded-full border ${
                              active
                                ? 'bg-[#C53334] border-[#C53334]'
                                : enabled
                                ? 'bg-white border-gray-300'
                                : 'bg-gray-100 border-gray-200'
                            }`}
                            style={!enabled ? { opacity: 0.5 } : undefined}
                          >
                            <Text className={active ? 'text-white font-medium' : 'text-black font-medium'}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    {rangeStep(eo!, ec!, STEP_MIN).filter((t) => finalTimeList.includes(t)).length === 0 && (
                      <Text className="text-sm text-gray-500 italic">
                        Pas de créneau l’après-midi.
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text className="font-semibold mb-2">Créneaux disponibles</Text>
<View
  className="flex-row flex-wrap gap-2"
  style={{
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  }}>                    
  {finalTimeList.map((t) => {
                      const enabled = isChipEnabled(t);
                      const active = enabled && t === time;
                      return (
                        <TouchableOpacity
                          key={`one-${t}`}
                          onPress={() => onSelectTime(t)}
                          activeOpacity={enabled ? 0.85 : 1}
                          className={`px-4 py-2 rounded-full border ${
                            active
                              ? 'bg-[#C53334] border-[#C53334]'
                              : enabled
                              ? 'bg-white border-gray-300'
                              : 'bg-gray-100 border-gray-200'
                          }`}
                          style={!enabled ? { opacity: 0.5 } : undefined}
                        >
                          <Text className={active ? 'text-white font-medium' : 'text-black font-medium'}>
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {finalTimeList.length === 0 && (
                      <Text className="text-sm text-gray-500 italic">Aucun créneau disponible.</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowTimeModal(false)}
                className="flex-1 rounded-2xl bg-gray-200 py-3 items-center"
              >
                <Text className="text-black text-base font-semibold">Fermer</Text>
              </TouchableOpacity>
              {time ? (
                <TouchableOpacity
                  onPress={() => setShowTimeModal(false)}
                  className="flex-1 rounded-2xl bg-[#C53334] py-3 items-center"
                >
                  <Text className="text-white text-base font-semibold">Valider</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default EditReservationForm;
