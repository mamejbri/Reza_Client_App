// src/screens/EstablishmentBookingScreen.tsx
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert } from "../ui/AppAlert";

import {
  useRoute,
  useNavigation,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types/navigation";

import AppIcon from "../icons/AppIcon";
import EditReservationForm from "../../components/EditReservationForm";
import ReviewSection from "../../components/ReviewSection";
import AboutSection from "../../components/AboutSection";

import { createReservation, createReservationCart } from "../../services/reservations";
import type { Prestation } from "../../services/prestations";
import { getStoredClientId } from "../../src/api/auth";
import { EstablishmentType, ESTABLISHMENT_LABELS } from "../../types/establishment";

import {
  fetchEtablissementAvis,
  fetchReviewSummary,
  type Avis as ReviewItem,
} from "../../services/avis";

import {
  fetchEtablissementById,
  EtablissementDTO,
} from "../../services/etablissements";

import { API } from "../config/env";
import { useI18n } from "../i18n/LocaleProvider";
import { isSlotUnavailable } from "../api/errors";
import { useResponsive, MAX_CONTENT_WIDTH, SCROLL_DECELERATION } from "../utils/responsive";

// -----------------------------------------------------
// IMAGE RESOLVER
// -----------------------------------------------------
const resolveImg = (url?: string | null): string => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  return `${API.BASE_URL}/${url.replace(/^\/+/, "")}`;
};

/** Shown when the establishment has no profile picture (or it fails to load). */
const defaultImg = require("../../assets/images/default_image.jpg");

// Main cover picker
const pickImage = (est: EtablissementDTO | null): string => {
  if (!est) return "";

  if (est.imageUrl) return resolveImg(est.imageUrl);

  const photos = (est as any).photos ?? [];

  const primary = photos.find((p: any) => p.primary && p.url);
  if (primary?.url) return resolveImg(primary.url);

  const first = photos.find((p: any) => p.url);
  if (first?.url) return resolveImg(first.url);

  if (est.photoPaths?.length) return resolveImg(est.photoPaths[0]);

  return "";
};

// -----------------------------------------------------

type R = RouteProp<RootStackParamList, "EstablishmentBooking">;
type Nav = NativeStackNavigationProp<
  RootStackParamList,
  "EstablishmentBooking"
>;

const EstablishmentBookingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t } = useI18n();
  const { contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();

  const {
    establishment: initialEstablishment,
    initialPeople,
    initialDateISO,
    initialTime,
    availableSlots,
    initialProgramId,
    clientId: passedClientId,
    user,
  } = (params as any) ?? {};

  // ---------------------
  // ZOOM STATES
  // ---------------------
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  // ---------------------
  // DATA STATES
  // ---------------------
  const [clientId, setClientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] =
    useState<"rendezvous" | "menu" | "avis" | "apropos">("rendezvous");

  const [establishment, setEstablishment] = useState<EtablissementDTO | null>(
    initialEstablishment ?? null
  );
  const [loadingEtab, setLoadingEtab] = useState(true);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [summary, setSummary] =
    useState<{ average: number; count: number } | null>(null);

  // -----------------------------------------------------
  // LOAD CLIENT ID (again on focus: the user may come back from the login screen)
  // -----------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const fromParams =
          typeof passedClientId === "number"
            ? passedClientId
            : typeof user?.id === "number"
            ? user.id
            : null;

        if (fromParams != null) {
          setClientId(fromParams);
        } else {
          const stored = await getStoredClientId();
          setClientId(stored ?? null);
        }
      })();
    }, [passedClientId, user?.id])
  );

  // -----------------------------------------------------
  // LOAD ESTABLISHMENT DETAILS
  // -----------------------------------------------------
useEffect(() => {
  let mounted = true;

  const id = initialEstablishment?.id;
  if (!id) {
    setLoadingEtab(false);
    return;
  }

  (async () => {
    try {
      setLoadingEtab(true);
      const dto = await fetchEtablissementById(id);
      if (mounted) setEstablishment(dto);
    } catch {
      if (mounted) setEstablishment(initialEstablishment ?? null);
    } finally {
      if (mounted) setLoadingEtab(false);
    }
  })();

  return () => {
    mounted = false;   // ✔ cleanup OK
  };
}, [initialEstablishment]);


  // -----------------------------------------------------
  // REVIEWS
  // -----------------------------------------------------
useEffect(() => {
  if (!establishment?.id) return;

  let mounted = true;

  (async () => {
    try {
      setReviewsLoading(true);

      const [list, sum] = await Promise.all([
        fetchEtablissementAvis(establishment.id),
        fetchReviewSummary(establishment.id),
      ]);

      if (!mounted) return;

      setReviews(Array.isArray(list) ? list : []);
      setSummary(sum ? { average: sum.average ?? 0, count: sum.count ?? 0 } : null);
    } catch {
      if (mounted) {
        setReviews([]);
        setSummary(null);
      }
    } finally {
      if (mounted) setReviewsLoading(false);
    }
  })();

  return () => {
    mounted = false;   // ✔ cleanup OK
  };
}, [establishment?.id]);


  // -----------------------------------------------------
  // MENU IMAGES
  // -----------------------------------------------------
  const menuImages = useMemo(() => {
    return (establishment?.menuPhotoPaths ?? []).map((p) => resolveImg(p));
  }, [establishment]);

  // -----------------------------------------------------
  // HEADER IMAGE
  // -----------------------------------------------------
  const headerImg = useMemo(
    () => pickImage(establishment),
    [establishment]
  );
  const [headerImgFailed, setHeaderImgFailed] = useState(false);
  useEffect(() => setHeaderImgFailed(false), [headerImg]);

  // -----------------------------------------------------
  // ABOUT IMAGES
  // -----------------------------------------------------
  const aboutImages = useMemo(() => {
    if (!establishment) return [];

    const urls: string[] = [];
    const seen = new Set<string>();
    const menuSet = new Set(menuImages);

    const photos = (establishment as any).photos ?? [];

    const add = (u: string | null) => {
      if (!u) return;
      if (u === headerImg) return;
      if (menuSet.has(u)) return;
      if (seen.has(u)) return;
      seen.add(u);
      urls.push(u);
    };

    photos.forEach((p: any) => {
      const img = resolveImg(p?.url);
      if (img) add(img);
    });

    return urls;
  }, [establishment, headerImg, menuImages]);

  // -----------------------------------------------------
  // CREATE RESERVATION
  // -----------------------------------------------------
  /** Shared success/error handling for single bookings and SPA carts. */
  const submitBooking = async (
    book: (etabId: number) => Promise<unknown>
  ): Promise<void | "SLOT_TAKEN"> => {
    try {
      if (!establishment) throw new Error(t("establishment.notFound"));

      await book(establishment.id);

      Alert.alert(
        t("establishment.confirmedTitle"),
        t("establishment.confirmedMessage")
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Appointments" }],
        })
      );
    } catch (e: any) {
      if (isSlotUnavailable(e)) {
        // Someone else got the slot first: the form clears the time and reloads slots.
        Alert.alert(t("establishment.slotTakenTitle"), t("establishment.slotTaken"));
        return "SLOT_TAKEN";
      }
      Alert.alert(
        t("common.error"),
        e?.response?.data?.message ?? e?.message ?? t("establishment.createError")
      );
    }
  };

  const onConfirm = async (
    people: number | undefined,
    dateISO: string,
    time: string,
    programId?: string,
    clientIdFromForm?: number,
    collaborateurId?: number | null
  ): Promise<void | "SLOT_TAKEN"> => {
    const cid = clientIdFromForm ?? clientId;
    if (!cid) {
      Alert.alert(t("common.error"), t("establishment.clientUnknown"));
      return;
    }
    return submitBooking((etabId) =>
      createReservation(etabId, dateISO, time, people, programId, cid, collaborateurId)
    );
  };

  /**
   * Books the whole cart as one reservation, in the order chosen: the server gives each
   * prestation (each step of a pack) to someone qualified and checks they are all free.
   */
  const onConfirmCart = (
    prestations: Prestation[],
    dateISO: string,
    startTime: string,
    cid: number,
    collaborateurByPrestation: Record<number, number>
  ): Promise<void | "SLOT_TAKEN"> =>
    submitBooking((etabId) =>
      createReservationCart(
        etabId,
        dateISO,
        startTime,
        prestations.map((p) => p.id),
        cid,
        collaborateurByPrestation
      )
    );

  // -----------------------------------------------------
  // LOADING
  // -----------------------------------------------------
  if (loadingEtab) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (!establishment) {
    return (
      <View style={[styles.center, { paddingHorizontal: 32 }]}>
        <View style={styles.errorIcon}>
          <AppIcon name="alert-circle-outline" size={30} color={BRAND} />
        </View>
        <Text style={styles.errorText}>{t("establishment.loadError")}</Text>
      </View>
    );
  }

  // -----------------------------------------------------
  // UI RENDER
  // -----------------------------------------------------
  const tabs = [
    "rendezvous",
    ...(establishment.businessType === EstablishmentType.RESTAURANT ? (["menu"] as const) : []),
    "avis",
    "apropos",
  ] as const;
  const tabIcon = (tab: string) =>
    tab === "rendezvous" ? "time" : tab === "menu" ? "book-open" : tab === "avis" ? "star-solid" : "info";
  const heroHeight = Math.round(Math.min(contentWidth, MAX_CONTENT_WIDTH) * 0.78) + insets.top;

  return (
    <>
      {/* ZOOM MODAL */}
      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomVisible(false)}>
          {zoomSrc && (
            <Image
              source={{ uri: zoomSrc }}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          )}
          <TouchableOpacity
            onPress={() => setZoomVisible(false)}
            style={[styles.zoomClose, { top: insets.top + 12 }]}
            accessibilityRole="button"
          >
            <AppIcon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.screen}
        decelerationRate={SCROLL_DECELERATION}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
      >
        {/* HERO (full-bleed photo under the transparent navbar) */}
        <View style={{ height: heroHeight, backgroundColor: "#1A1512" }}>
          <Image
            source={headerImg && !headerImgFailed ? { uri: headerImg } : defaultImg}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            onError={() => setHeaderImgFailed(true)}
          />
          {/* top shade keeps the navbar buttons readable on bright photos */}
          <View style={[styles.topShade, { height: insets.top + 90 }]} pointerEvents="none">
            {SHADE_BANDS.map((o, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${o})` }} />
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {/* INFO CARD */}
          <View style={styles.infoCard}>
            <Text style={styles.kicker}>{t(ESTABLISHMENT_LABELS[establishment.businessType])}</Text>
            <Text style={styles.name}>{establishment.nom}</Text>

            <View style={styles.addressRow}>
              <AppIcon name="location" size={17} color={MUTED} />
              <Text style={styles.address}>
                {establishment.address ?? t("common.addressUnavailable")}
              </Text>
            </View>

            <View style={styles.pills}>
              {summary && summary.count > 0 ? (
                <View style={[styles.pill, styles.pillBrand]}>
                  <AppIcon name="star" size={14} color="#fff" />
                  <Text style={styles.pillBrandText}>{summary.average.toFixed(1)}</Text>
                </View>
              ) : (
                <View style={[styles.pill, styles.pillBrand]}>
                  <AppIcon name="sparkles-outline" size={14} color="#fff" />
                  <Text style={styles.pillBrandText}>{t("establishment.new")}</Text>
                </View>
              )}
              {!!summary?.count && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{t("common.reviews", { count: summary.count })}</Text>
                </View>
              )}
              {!!establishment.priceRange && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{establishment.priceRange}</Text>
                </View>
              )}
            </View>
          </View>

          {/* TABS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
            style={styles.tabsBar}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.tabLabel}>
                    <AppIcon name={tabIcon(tab)} size={17} color={active ? BRAND : MUTED} />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {t(`establishment.tabs.${tab}`)}
                    </Text>
                  </View>
                  <View style={[styles.tabBar, active && styles.tabBarActive]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* CONTENT */}
          <View style={styles.content}>
            {activeTab === "rendezvous" && (
              <EditReservationForm
                establishmentType={establishment.businessType}
                etablissementId={establishment.id}
                clientId={clientId ?? 0}
                initialPeople={initialPeople}
                initialDateISO={initialDateISO}
                initialTime={initialTime}
                availableSlots={availableSlots}
                initialProgramId={initialProgramId}
                openingHours={establishment.openingHours ?? []}
                onConfirm={onConfirm}
                enableCart={establishment.businessType === EstablishmentType.SPA}
                onConfirmCart={onConfirmCart}
              />
            )}

            {/* MENU TAB */}
            {activeTab === "menu" &&
              establishment.businessType === EstablishmentType.RESTAURANT && (
                <View style={{ width: "100%" }}>
                  {menuImages.map((src, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.9}
                      onPress={() => {
                        setZoomSrc(src);
                        setZoomVisible(true);
                      }}
                      style={styles.menuItem}
                    >
                      <Image
                        source={{ uri: src }}
                        style={{ width: "100%", height: Math.round(Math.min(contentWidth, MAX_CONTENT_WIDTH) * 0.7) }}
                        resizeMode="cover"
                      />
                      <View style={styles.zoomHint}>
                        <AppIcon name="expand-outline" size={16} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}

                  {menuImages.length === 0 && (
                    <View style={styles.emptyBox}>
                      <AppIcon name="book-outline" size={26} color={MUTED} />
                      <Text style={styles.emptyText}>{t("establishment.menuUnavailable")}</Text>
                    </View>
                  )}
                </View>
              )}

            {activeTab === "avis" && (
              <ReviewSection
                loading={reviewsLoading}
                average={summary?.average}
                count={summary?.count}
                reviews={reviews}
              />
            )}

            {activeTab === "apropos" && (
              <AboutSection
                images={aboutImages}
                description={establishment.description ?? ""}
                openingHours={establishment.openingHours ?? []}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const BRAND = "#C53334";
const INK = "#16120F";
const MUTED = "#8A8580";
const SURFACE = "#F5F3F0";

// Gradient-like top shade without a gradient library: stacked bands fading out.
const SHADE_BANDS = Array.from({ length: 10 }, (_, i) => 0.5 * (1 - i / 10) ** 2);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF9F7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAF9F7" },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(197,51,52,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorText: { fontSize: 16, lineHeight: 22, color: INK, textAlign: "center" },

  topShade: { position: "absolute", top: 0, left: 0, right: 0 },

  body: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: 16 },
  infoCard: {
    marginTop: -48,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  kicker: { fontSize: 12, fontWeight: "800", color: BRAND, letterSpacing: 1.2, textTransform: "uppercase" },
  name: { fontSize: 26, lineHeight: 31, fontWeight: "800", color: INK, letterSpacing: -0.4 },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 2 },
  address: { flex: 1, fontSize: 15, lineHeight: 21, color: MUTED },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: SURFACE,
  },
  pillText: { fontSize: 14, fontWeight: "600", color: INK },
  pillBrand: { backgroundColor: BRAND },
  pillBrandText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  tabsBar: { marginTop: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.12)" },
  tabs: { gap: 22, paddingHorizontal: 4 },
  tab: { paddingTop: 4 },
  tabLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 15, fontWeight: "600", color: MUTED },
  tabTextActive: { color: INK, fontWeight: "800" },
  tabBar: { height: 3, borderRadius: 2, marginTop: 10, backgroundColor: "transparent" },
  tabBarActive: { backgroundColor: BRAND },

  content: { paddingTop: 18 },

  menuItem: { borderRadius: 18, overflow: "hidden", marginBottom: 14, backgroundColor: "#ECE9E5" },
  zoomHint: {
    position: "absolute",
    bottom: 12,
    end: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: { alignItems: "center", gap: 10, paddingVertical: 36, borderRadius: 18, backgroundColor: SURFACE },
  emptyText: { fontSize: 15, color: MUTED, textAlign: "center" },

  zoomBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  zoomClose: {
    position: "absolute",
    end: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default EstablishmentBookingScreen;
