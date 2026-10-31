import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Pressable,
  Image, ScrollView, Modal, TextInput, StyleSheet, ActivityIndicator
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../icons/AppIcon";

import {
  fetchSearchEtablissements,
  EtablissementDTO
} from "../../services/etablissements";

import {
  fetchFilterGroups,
  FilterOption
} from "../../services/filters";

import { fetchReviewSummary } from "../../services/avis";

import type { RootStackParamList } from "../../types/navigation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { ESTABLISHMENT_LABELS } from "../../types/establishment";

import { API } from "../config/env";
import { useI18n } from "../i18n/LocaleProvider";
import { useResponsive, MAX_CONTENT_WIDTH, SCROLL_DECELERATION } from "../utils/responsive";
import { Coords, getCurrentCoords, requestLocationPermission } from "../utils/location";
import { Alert } from "../ui/AppAlert";

const BRAND = "#C53334";
const INK = "#16120F";
const MUTED = "#8A8580";
const SURFACE = "#F5F3F0";

const ABS = /^https?:\/\//i;
const resolveImg = (p?: string) => {
  if (!p) return "";
  if (ABS.test(p)) return p;
  return API.BASE_URL.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");
};

/** Shown when the establishment has no profile picture (or it fails to load). */
const defaultImg = require("../../assets/images/default_image.jpg");

type Nav = NativeStackNavigationProp<RootStackParamList, "SearchResults">;
type Route = RouteProp<RootStackParamList, "SearchResults">;
type Summary = { average: number; count: number };

/** Filter group code -> key of the search payload. */
const GROUP_FIELD: Record<string, string> = {
  CUISINE: "cuisine",
  REGIME_ALIMENTAIRE: "regime",
  CADRE_AMBIANCE: "ambiance",
  PRESTATION: "prestation",
  POUR_QUI: "pourQui",
  GAMME_PRODUIT: "gammeProduit",
  ACTIVITE: "activite",
  ENVIRONNEMENT: "environnement",
};

/** Centre of Morocco, shown when nothing on the map has coordinates. */
const FALLBACK_REGION = { latitude: 31.8, longitude: -7.1, latitudeDelta: 8, longitudeDelta: 8 };
const MAP_PADDING = { top: 60, right: 40, bottom: 60, left: 40 };

const hasCoords = (e: EtablissementDTO) => e.latitude != null && e.longitude != null;

const getFinalImage = (item: EtablissementDTO) => {
  if (item.imageUrl) return resolveImg(item.imageUrl);

  if (item.photoPaths?.length) return resolveImg(item.photoPaths[1] ?? item.photoPaths[0]);

  const photosArray: any[] = (item as any).photos ?? [];
  if (photosArray?.length && photosArray[0]?.url) {
    return resolveImg(photosArray[0].url);
  }

  if (item.menuPhotoPaths?.length)
    return resolveImg(item.menuPhotoPaths[0]);

  return "";
};

/******************************************************
 * CARD
 ******************************************************/
const Card = ({ item, summary, onPress }: { item: EtablissementDTO; summary?: Summary; onPress: () => void }) => {
  const { t } = useI18n();
  const { contentWidth } = useResponsive();
  const finalImage = getFinalImage(item);
  const [imgFailed, setImgFailed] = useState(false);

  const average = summary?.average ?? item.averageRating ?? item.rating ?? null;
  const count = summary?.count ?? item.reviewCount ?? item.reviewsCount ?? 0;
  const hasRating = count > 0 && average != null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <View>
        <Image
          source={finalImage && !imgFailed ? { uri: finalImage } : defaultImg}
          style={[styles.cardImage, { height: Math.round(Math.min(contentWidth, MAX_CONTENT_WIDTH) * 0.52) }]}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
        {hasRating && (
          <View style={[styles.pill, styles.ratingPill]}>
            <AppIcon name="star" size={13} color={BRAND} />
            <Text style={styles.pillText}>{average!.toFixed(1)}</Text>
          </View>
        )}
        {!!item.priceRange && (
          <View style={[styles.pill, styles.pricePill]}>
            <Text style={styles.pillText}>{item.priceRange}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.nom}</Text>

        {!!item.address && (
          <View style={styles.cardRow}>
            <AppIcon name="location" size={15} color={MUTED} />
            <Text style={styles.cardMeta} numberOfLines={1}>{item.address}</Text>
          </View>
        )}

        {item.distanceKm != null && (
          <Text style={styles.cardDistance}>{t("results.distance", { km: item.distanceKm.toFixed(1) })}</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardReviews}>
            {hasRating ? t("common.reviews", { count }) : t("common.noReviews")}
          </Text>
          <View style={styles.cardArrow}>
            <AppIcon name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SkeletonCard = () => {
  const { contentWidth } = useResponsive();
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={{ height: Math.round(Math.min(contentWidth, MAX_CONTENT_WIDTH) * 0.52), backgroundColor: "#ECE9E5" }} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: "60%", height: 16 }]} />
        <View style={[styles.skeletonLine, { width: "85%" }]} />
        <View style={[styles.skeletonLine, { width: "35%" }]} />
      </View>
    </View>
  );
};

/******************************************************
 * MAIN SCREEN
 ******************************************************/
export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { type } = params;

  const [etabs, setEtabs] = useState<EtablissementDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<Record<number, Summary>>({});

  const [filterGroups, setFilterGroups] = useState<any[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<number>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<number>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // The text typed on the previous screen is the starting query.
  const [searchText, setSearchText] = useState(params.query ?? "");
  const [query, setQuery] = useState((params.query ?? "").trim());
  const requestId = useRef(0);

  // Client position while "near me" is on: results are then limited to the area and sorted nearest first.
  const [origin, setOrigin] = useState<Coords | null>(params.coords ?? null);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<MapView>(null);

  const clean = (v: string) => v.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  /** Known filter groups get a translated label; unknown ones fall back to the cleaned code. */
  const groupLabel = (group: string) => {
    const key = `results.groups.${group}`;
    const label = t(key);
    return label === key ? clean(group) : label;
  };

  const selectedIn = (group: any, set: Set<number>) =>
    group.options.filter((o: FilterOption) => set.has(o.id)).length;

  /******************************************************
   * DATA
   ******************************************************/
  // Debounce typing so we don't fire one request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchText.trim()), 350);
    return () => clearTimeout(id);
  }, [searchText]);

  useEffect(() => {
    fetchFilterGroups(type)
      .then(setFilterGroups)
      .catch(() => { /* filters unavailable — proceed without them */ });
  }, [type]);

  useEffect(() => {
    const payload: any = { text: query || undefined, type, lat: origin?.lat, lng: origin?.lng };
    Object.values(GROUP_FIELD).forEach((field) => { payload[field] = []; });
    selectedFilters.forEach((id) => {
      const g = filterGroups.find((g) => g.options.some((o: FilterOption) => o.id === id));
      const field = g && GROUP_FIELD[g.group];
      if (field) payload[field].push(String(id));
    });

    // Only the latest request may update the list (responses can arrive out of order).
    const id = ++requestId.current;
    setLoading(true);
    fetchSearchEtablissements(payload)
      .then((page) => {
        if (id !== requestId.current) return;
        const content = page.content ?? [];
        setEtabs(content);
        setTotal(page.totalElements ?? content.length);
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setEtabs([]);
        setTotal(0);
      })
      .finally(() => { if (id === requestId.current) setLoading(false); });
    // filterGroups is only read to map ids -> groups; ids can only be selected once groups are loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedFilters, type, origin]);

  useEffect(() => {
    if (!etabs.length) return;
    let cancelled = false;
    Promise.allSettled(etabs.map((e) => fetchReviewSummary(e.id))).then((results) => {
      if (cancelled) return;
      const map: Record<number, Summary> = {};
      // failed entries stay absent so the card falls back to the DTO values / "no reviews"
      results.forEach((r, i) => { if (r.status === "fulfilled" && r.value) map[etabs[i].id] = r.value as Summary; });
      setSummaries(map);
    });
    return () => { cancelled = true; };
  }, [etabs]);

  /******************************************************
   * LOCATION & MAP
   ******************************************************/
  const toggleNearMe = async () => {
    if (origin) {
      setOrigin(null);
      return;
    }
    if (!(await requestLocationPermission())) return;
    setLocating(true);
    getCurrentCoords()
      .then(setOrigin)
      .catch(() => Alert.alert(t("search.location"), t("search.locationError")))
      .finally(() => setLocating(false));
  };

  const mappable = useMemo(() => etabs.filter(hasCoords), [etabs]);

  const fitMap = useCallback(() => {
    const points = mappable.map((e) => ({ latitude: e.latitude!, longitude: e.longitude! }));
    if (origin) points.push({ latitude: origin.lat, longitude: origin.lng });
    if (points.length === 1) {
      mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.03, longitudeDelta: 0.03 });
    } else if (points.length > 1) {
      mapRef.current?.fitToCoordinates(points, { edgePadding: MAP_PADDING, animated: true });
    }
  }, [mappable, origin]);

  useEffect(() => {
    if (showMap) fitMap();
  }, [showMap, fitMap]);

  const openEstablishment = (item: EtablissementDTO) =>
    navigation.navigate("EstablishmentBooking", {
      establishment: item,
      initialPeople: 2,
      initialDateISO: new Date().toISOString().slice(0, 10),
      initialTime: "",
      availableSlots: {},
    });

  /******************************************************
   * FILTER ACTIONS
   ******************************************************/
  const openGroup = (group: string) => {
    setTempSelected(new Set(selectedFilters));
    setActiveGroup(group);
  };
  const closeModal = () => setActiveGroup(null);

  const toggleOption = (id: number) => {
    const next = new Set(tempSelected);
    next.has(id) ? next.delete(id) : next.add(id);
    setTempSelected(next);
  };

  const confirmFilters = () => {
    setSelectedFilters(new Set(tempSelected));
    closeModal();
  };

  const resetGroup = () => {
    const next = new Set(tempSelected);
    filterGroups.find((g) => g.group === activeGroup)?.options.forEach((o: FilterOption) => next.delete(o.id));
    setTempSelected(next);
  };

  const clearAll = () => {
    setSelectedFilters(new Set());
    setSearchText("");
  };

  const activeGroupData = useMemo(
    () => filterGroups.find((g) => g.group === activeGroup),
    [filterGroups, activeGroup]
  );
  const hasCriteria = selectedFilters.size > 0 || searchText.length > 0;

  /******************************************************
   * UI
   ******************************************************/
  const header = (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t(ESTABLISHMENT_LABELS[type])}</Text>
          {!loading && (
            <Text style={styles.count}>
              {total === 1 ? t("results.countOne") : t("results.count", { count: total })}
            </Text>
          )}
        </View>

        <View style={styles.search}>
          <AppIcon name="search" size={20} color={MUTED} />
          <TextInput
            placeholder={t("results.searchPlaceholder")}
            placeholderTextColor={MUTED}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")} hitSlop={10} accessibilityRole="button">
              <AppIcon name="close-circle" size={20} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
          <TouchableOpacity
            onPress={toggleNearMe}
            disabled={locating}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: !!origin, busy: locating }}
            style={[styles.chip, !!origin && styles.chipActive]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={INK} />
            ) : (
              <AppIcon name="navigate" size={14} color={origin ? "#FFFFFF" : BRAND} />
            )}
            <Text style={[styles.chipText, !!origin && styles.chipTextActive]}>{t("search.nearby")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowMap((v) => !v)}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={[styles.chip, showMap && styles.chipActive]}
          >
            <AppIcon name={showMap ? "list" : "map"} size={14} color={showMap ? "#FFFFFF" : BRAND} />
            <Text style={[styles.chipText, showMap && styles.chipTextActive]}>
              {showMap ? t("results.list") : t("results.map")}
            </Text>
          </TouchableOpacity>

          {filterGroups.map((g) => {
            const n = selectedIn(g, selectedFilters);
            return (
              <TouchableOpacity
                key={g.group}
                onPress={() => openGroup(g.group)}
                activeOpacity={0.8}
                style={[styles.chip, n > 0 && styles.chipActive]}
              >
                <Text style={[styles.chipText, n > 0 && styles.chipTextActive]}>{groupLabel(g.group)}</Text>
                {n > 0 ? (
                  <View style={styles.chipBadge}><Text style={styles.chipBadgeText}>{n}</Text></View>
                ) : (
                  <AppIcon name="chevron-down" size={14} color={INK} />
                )}
              </TouchableOpacity>
            );
          })}
          {selectedFilters.size > 0 && (
            <TouchableOpacity onPress={() => setSelectedFilters(new Set())} style={styles.chipClear}>
              <AppIcon name="close" size={14} color={BRAND} />
              <Text style={styles.chipClearText}>{t("results.clearAll")}</Text>
            </TouchableOpacity>
          )}
      </ScrollView>
    </View>
  );

  const empty = loading ? (
    <View>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</View>
  ) : (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon name="search" size={30} color={BRAND} />
      </View>
      <Text style={styles.emptyTitle}>{t("results.emptyTitle")}</Text>
      <Text style={styles.emptyText}>{t("results.emptyText")}</Text>
      {hasCriteria && (
        <TouchableOpacity onPress={clearAll} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>{t("results.clearAll")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Header lives outside the list so the search field never unmounts while results reload. */}
      {header}

      {showMap ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={
              origin
                ? { latitude: origin.lat, longitude: origin.lng, latitudeDelta: 0.1, longitudeDelta: 0.1 }
                : FALLBACK_REGION
            }
            showsUserLocation={!!origin}
            onMapReady={fitMap}
          >
            {mappable.map((e) => (
              <Marker
                key={e.id}
                coordinate={{ latitude: e.latitude!, longitude: e.longitude! }}
                title={e.nom}
                description={
                  e.distanceKm != null
                    ? `${e.address ?? ""} · ${t("results.distance", { km: e.distanceKm.toFixed(1) })}`
                    : e.address ?? undefined
                }
                pinColor={BRAND}
                onCalloutPress={() => openEstablishment(e)}
              />
            ))}
          </MapView>
          {loading ? (
            <View style={styles.mapBanner}><ActivityIndicator size="small" color={BRAND} /></View>
          ) : etabs.length === 0 ? (
            <View style={styles.mapBanner}><Text style={styles.mapBannerText}>{t("results.emptyTitle")}</Text></View>
          ) : mappable.length === 0 ? (
            <View style={styles.mapBanner}><Text style={styles.mapBannerText}>{t("results.noLocations")}</Text></View>
          ) : null}
        </View>
      ) : (
      <FlatList
        data={loading ? [] : etabs}
        keyExtractor={(i) => String(i.id)}
        decelerationRate={SCROLL_DECELERATION}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom + 16, 32), flexGrow: 1 }}
        renderItem={({ item }) => (
          <Card
            item={item}
            summary={summaries[item.id]}
            onPress={() => openEstablishment(item)}
          />
        )}
        ListEmptyComponent={empty}
      />
      )}

      {/* FILTER SHEET */}
      <Modal visible={!!activeGroup} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={closeModal} hitSlop={10} accessibilityRole="button">
                <AppIcon name="close" size={24} color={INK} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {activeGroup ? groupLabel(activeGroup) : ""}
              </Text>
              <TouchableOpacity onPress={resetGroup} hitSlop={10}>
                <Text style={styles.sheetReset}>{t("results.reset")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.options}>
              {activeGroupData?.options.map((opt: FilterOption) => {
                const active = tempSelected.has(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => toggleOption(opt.id)}
                    activeOpacity={0.8}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    {active && <AppIcon name="checkmark" size={16} color="#fff" />}
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {clean(opt.libelle)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity onPress={confirmFilters} activeOpacity={0.85} style={styles.apply}>
              <Text style={styles.applyText}>
                {t("results.apply")}
                {activeGroupData && selectedIn(activeGroupData, tempSelected) > 0
                  ? ` (${selectedIn(activeGroupData, tempSelected)})`
                  : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF9F7" },

  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  headerInner: { paddingHorizontal: 16, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.4, flexShrink: 1 },
  count: { fontSize: 14, color: MUTED, fontWeight: "500", marginStart: 12 },

  search: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: SURFACE,
  },
  searchInput: { flex: 1, height: "100%", fontSize: 16, color: INK, paddingVertical: 0 },

  chips: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  chip: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E4E0DB",
    backgroundColor: "#FFFFFF",
  },
  chipActive: { backgroundColor: INK, borderColor: INK },
  chipText: { fontSize: 14, fontWeight: "600", color: INK },
  chipTextActive: { color: "#FFFFFF" },
  chipBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  chipBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  chipClear: { height: 38, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10 },
  chipClearText: { color: BRAND, fontSize: 14, fontWeight: "700" },

  card: {
    width: "92%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardImage: { width: "100%" },
  pill: {
    position: "absolute",
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  ratingPill: { end: 12 },
  pricePill: { start: 12 },
  pillText: { fontSize: 13, fontWeight: "700", color: INK },
  cardBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: INK },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMeta: { flex: 1, fontSize: 14, color: MUTED },
  cardDistance: { fontSize: 14, fontWeight: "700", color: BRAND },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  cardReviews: { fontSize: 14, color: "#4A4540", fontWeight: "500" },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },

  mapWrap: { flex: 1 },
  mapBanner: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    maxWidth: "90%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mapBannerText: { fontSize: 14, fontWeight: "600", color: INK, textAlign: "center" },

  skeleton: { shadowOpacity: 0, elevation: 0 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: "#ECE9E5", marginTop: 4 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingVertical: 48 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(197,51,52,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: INK, textAlign: "center" },
  emptyText: { fontSize: 15, lineHeight: 21, color: MUTED, textAlign: "center", marginTop: 6 },
  emptyButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: BRAND },
  emptyButtonText: { color: BRAND, fontSize: 15, fontWeight: "700" },

  backdrop: { flex: 1, backgroundColor: "rgba(12,8,6,0.45)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "#DDD8D2", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  sheetTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: INK },
  sheetReset: { color: BRAND, fontSize: 15, fontWeight: "600" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E4E0DB",
    backgroundColor: "#FFFFFF",
  },
  optionActive: { backgroundColor: BRAND, borderColor: BRAND },
  optionText: { fontSize: 15, fontWeight: "600", color: INK },
  optionTextActive: { color: "#FFFFFF" },
  apply: {
    height: 56,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  applyText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
