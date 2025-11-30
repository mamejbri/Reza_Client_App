// src/screens/EstablishmentBookingScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";

import {
  useRoute,
  useNavigation,
  CommonActions,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types/navigation";

import IcoMoonIcon from "../icons/IcoMoonIcon";
import EditReservationForm from "../../components/EditReservationForm";
import ReviewSection from "../../components/ReviewSection";
import AboutSection from "../../components/AboutSection";

import { createReservation } from "../../services/reservations";
import { getStoredClientId } from "../../src/api/auth";
import { EstablishmentType } from "../../types/establishment";

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

// -----------------------------------------------------
// IMAGE RESOLVER
// -----------------------------------------------------
const resolveImg = (url?: string | null): string => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  return `${API.BASE_URL}/${url.replace(/^\/+/, "")}`;
};

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
  // LOAD CLIENT ID
  // -----------------------------------------------------
  useEffect(() => {
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
  }, []);

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
  const onConfirm = async (
    people: number | undefined,
    dateISO: string,
    time: string,
    programId?: string
  ) => {
    try {
      if (!clientId) throw new Error("Client non identifié.");
      if (!establishment) throw new Error("Établissement introuvable.");

      await createReservation(
        establishment.id,
        dateISO,
        time,
        people,
        programId,
        clientId
      );

      Alert.alert(
        "Réservation confirmée",
        "Votre réservation est enregistrée."
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Appointments" }],
        })
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer la réservation.");
    }
  };

  // -----------------------------------------------------
  // LOADING
  // -----------------------------------------------------
  if (loadingEtab) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C53334" />
      </View>
    );
  }

  if (!establishment) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base text-center">
          Impossible de charger les informations de l’établissement.
        </Text>
      </View>
    );
  }

  // -----------------------------------------------------
  // UI RENDER
  // -----------------------------------------------------

  return (
    <>
      {/* ZOOM MODAL */}
      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setZoomVisible(false)}
        >
          {zoomSrc && (
            <Image
              source={{ uri: zoomSrc }}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </Pressable>
      </Modal>

      <ScrollView className="flex-1 bg-white px-4 pt-4 pb-8">
        {/* HEADER CARD */}
        <View className="mb-4 rounded-2xl overflow-hidden bg-gray-100 w-full">
          {!!headerImg && (
            <Image
              source={{ uri: headerImg }}
              resizeMode="cover"
              style={{ width: "100%", height: 200 }}
            />
          )}

          <View className="p-4 gap-3 w-full">
            <Text className="text-xl font-bold">{establishment.nom}</Text>

            <View className="flex-row items-center gap-2 w-full">
              <IcoMoonIcon name="location" size={20} color="#C53334" />
              <Text
                className="text-base font-medium"
                style={{ flex: 1, flexWrap: "wrap" }}
              >
                {establishment.address ?? "Adresse indisponible"}
              </Text>
            </View>

            {/* Rating */}
            <View className="flex-row items-center gap-2">
              {summary ? (
                <>
                  <IcoMoonIcon name="star" size={20} color="#C53334" />
                  <Text className="text-base font-semibold">
                    {summary.average.toFixed(1)}
                  </Text>
                  <Text className="text-base text-gray-600">
                    • {summary.count} avis
                  </Text>
                </>
              ) : (
                <Text className="text-base text-gray-600">Nouveau</Text>
              )}

              {!!establishment.priceRange && (
                <Text className="text-base text-gray-600">
                  • {establishment.priceRange}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 4 }}
        >
          <View className="flex-row gap-3">
            {(
              [
                "rendezvous",
                ...(establishment.businessType === EstablishmentType.RESTAURANT
                  ? (["menu"] as const)
                  : []),
                "avis",
                "apropos",
              ] as const
            ).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTab(t)}
                className={
                  activeTab === t ? "btn-small-icon" : "btn-light-icon"
                }
              >
                <IcoMoonIcon
                  name={
                    t === "rendezvous"
                      ? "time"
                      : t === "menu"
                      ? "book"
                      : t === "avis"
                      ? "star-solid"
                      : "info"
                  }
                  size={20}
                  color={activeTab === t ? "#fff" : "#C53334"}
                />
                <Text
                  className={
                    activeTab === t ? "btn-small-icon-text" : "btn-light-icon-text"
                  }
                >
                  {t === "rendezvous"
                    ? "Rendez-vous"
                    : t === "menu"
                    ? "Menu"
                    : t === "avis"
                    ? "Avis"
                    : "À propos"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* CONTENT */}
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
          />
        )}

        {/* MENU TAB */}
        {activeTab === "menu" &&
          establishment.businessType === EstablishmentType.RESTAURANT && (
            <View className="w-full">
              {menuImages.map((src, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.9}
                  onPress={() => {
                    setZoomSrc(src);
                    setZoomVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: src }}
                    style={{
                      width: "100%",
                      height: 260,
                      borderRadius: 12,
                      backgroundColor: "#eee",
                      marginBottom: 12,
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}

              {menuImages.length === 0 && (
                <Text className="text-sm text-gray-500">
                  Menu indisponible.
                </Text>
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
      </ScrollView>
    </>
  );
};

export default EstablishmentBookingScreen;
