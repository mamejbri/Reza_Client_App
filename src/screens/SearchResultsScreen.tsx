import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, Image, ScrollView,
  Modal, TextInput
} from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import IcoMoonIcon from "../icons/IcoMoonIcon";

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

import { API } from "../config/env";

const ABS = /^https?:\/\//i;
const resolveImg = (p?: string) => {
  if (!p) return "";
  if (ABS.test(p)) return p;
  return API.BASE_URL.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");
};

type Nav = NativeStackNavigationProp<RootStackParamList, "SearchResults">;
type Route = RouteProp<RootStackParamList, "SearchResults">;

/******************************************************
 * IMAGE RESOLVER (FIXED)
 ******************************************************/
const getFinalImage = (item: EtablissementDTO) => {
  if (item.imageUrl) return resolveImg(item.imageUrl);

  if (item.photoPaths?.length) return resolveImg(item.photoPaths[1]);

  const photosArray: any[] = (item as any).photos ?? [];
  if (photosArray?.length && photosArray[0]?.url) {
    return resolveImg(photosArray[0].url);
  }

  if (item.menuPhotoPaths?.length)
    return resolveImg(item.menuPhotoPaths[0]);

  return "";
};

/******************************************************
 * CARD (unchanged design)
 ******************************************************/
const Card = ({ item, summary, onPress }: any) => {
  const finalImage = getFinalImage(item);
   console.log("📸 Reservatioooon image:", item.imageUrl);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl bg-gray-100 mb-4 overflow-hidden"
      style={{ width: "92%", alignSelf: "center" }}
    >
      {!!finalImage && (
        <Image
          source={{ uri: finalImage }}
          style={{ width: "100%", height: 150 }}
          resizeMode="cover"
        />
      )}

      <View className="px-3 py-3">
        <Text className="text-lg font-bold">{item.nom}</Text>

        {item.address && (
          <View className="flex-row items-center mt-1">
            <IcoMoonIcon name="location" size={18} color="#C53334" />
            <Text className="text-base ml-2" numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}

        <View className="flex-row items-center mt-2">
          {summary && summary.count > 0 ? (
            <>
              <IcoMoonIcon name="star" size={18} color="#C53334" />
              <Text className="ml-2 font-semibold">{summary.average.toFixed(1)}</Text>
              <Text className="ml-1 text-gray-700">• {summary.count} avis</Text>
            </>
          ) : (
            <Text className="text-gray-600">Aucun avis</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/******************************************************
 * MAIN SCREEN
 ******************************************************/
export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { type } = params;

  const [etabs, setEtabs] = useState<EtablissementDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterGroups, setFilterGroups] = useState<any[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<number>>(new Set());
  const [tempSelected, setTempSelected] = useState<Set<number>>(new Set());

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [summaries, setSummaries] = useState<any>({});

  const clean = (v: string) => v.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  /******************************************************
   * BUILD POST BODY
   ******************************************************/
  const buildPayload = () => {
    const payload: any = {
      text: searchText || undefined,
      type,
      cuisine: [],
      regime: [],
      ambiance: [],
      prestation: [],
      pourQui: [],
      gammeProduit: [],
      activite: [],
      environnement: []
    };

    tempSelected.forEach((id) => {
      const g = filterGroups.find((g) =>
        g.options.some((o: FilterOption) => o.id === id)
      );
      if (!g) return;

      switch (g.group) {
        case "CUISINE": payload.cuisine.push(String(id)); break;
        case "REGIME_ALIMENTAIRE": payload.regime.push(String(id)); break;
        case "CADRE_AMBIANCE": payload.ambiance.push(String(id)); break;

        case "PRESTATION": payload.prestation.push(String(id)); break;
        case "POUR_QUI": payload.pourQui.push(String(id)); break;
        case "GAMME_PRODUIT": payload.gammeProduit.push(String(id)); break;

        case "ACTIVITE": payload.activite.push(String(id)); break;
        case "ENVIRONNEMENT": payload.environnement.push(String(id)); break;
      }
    });

    return payload;
  };

  /******************************************************
   * LOAD RESULTS
   ******************************************************/
  const loadSearch = async () => {
    try {
      setLoading(true);
      const payload = buildPayload();
      const page = await fetchSearchEtablissements(payload);
      setEtabs(page.content ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSearch();
  }, [searchText]);

  useEffect(() => {
    (async () => {
      const groups = await fetchFilterGroups(type);
      setFilterGroups(groups);
      loadSearch();
    })();
  }, []);

  useEffect(() => {
    const run = async () => {
      const map: any = {};
      for (const e of etabs) {
        const s = await fetchReviewSummary(e.id);
        map[e.id] = s;
      }
      setSummaries(map);
    };
    if (etabs.length) run();
  }, [etabs]);

  const confirmFilters = () => {
    setSelectedFilters(new Set(tempSelected));
    loadSearch();
    setModalVisible(false);
  };

  const resetGroup = () => {
    const next = new Set(tempSelected);
    const target = filterGroups.find((g) => g.group === activeGroup);
    if (target) {
      target.options.forEach((o: FilterOption) => next.delete(o.id));
    }
    setTempSelected(next);
  };

  const resetAll = () => {
    setSelectedFilters(new Set());
    setTempSelected(new Set());
    loadSearch();
  };

  /******************************************************
   * HEADER UI
   ******************************************************/
  const Header = (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mt-3 mb-3"
        contentContainerStyle={{ paddingRight: 24 }}
      >
        {/* SEARCH BAR (prettier + black placeholder) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#ffffff",
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginRight: 10,
            width: 240,
            borderWidth: 1,
            borderColor: "#ddd"
          }}
        >
          <IcoMoonIcon name="search" size={18} color="#C53334" />
          <TextInput
            placeholder="Rechercher..."
            placeholderTextColor="#000"
            value={searchText}
            onChangeText={setSearchText}
            style={{ marginLeft: 8, fontSize: 15, flex: 1, color: "#000" }}
          />
        </View>


        {/* FILTER GROUPS */}
        {filterGroups.map((g) => (
          <TouchableOpacity
            key={g.group}
            onPress={() => {
              setActiveGroup(g.group);
              setTempSelected(new Set(selectedFilters));
              setModalVisible(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#f3f4f6",
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginRight: 10,
            }}
          >
            <IcoMoonIcon name="search" size={18} color="#C53334" />
            <Text style={{ marginLeft: 8, fontWeight: "500" }}>
              {clean(g.group)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  /******************************************************
   * UI
   ******************************************************/
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#C53334" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={etabs}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <Card
            item={item}
            summary={summaries[item.id]}
            onPress={() =>
              navigation.navigate("EstablishmentBooking", {
                establishment: item,
                initialPeople: 2,
                initialDateISO: new Date().toISOString().slice(0, 10),
                initialTime: "",
                availableSlots: {},
              })
            }
          />
        )}
        ListHeaderComponent={Header}
      />

      {/* FILTER MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-2xl p-4" style={{ maxHeight: "80%" }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xl font-bold">{clean(activeGroup || "")}</Text>

              {/* RESET GROUP */}
              <TouchableOpacity onPress={resetGroup}>
                <Text className="text-red-500 font-semibold">Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {filterGroups
                .filter((g) => g.group === activeGroup)
                .flatMap((g) =>
                  g.options.map((opt: FilterOption) => {
                    const active = tempSelected.has(opt.id);
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => {
                          const next = new Set(tempSelected);
                          next.has(opt.id)
                            ? next.delete(opt.id)
                            : next.add(opt.id);
                          setTempSelected(next);
                        }}
                        className={`px-3 py-4 rounded-xl mb-3 ${
                          active ? "bg-[#C53334]" : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={active ? "text-white" : "text-black"}
                          style={{ fontSize: 16, fontWeight: "600" }}
                        >
                          {clean(opt.libelle)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
            </ScrollView>

            <TouchableOpacity
              onPress={confirmFilters}
              className="bg-[#C53334] rounded-xl py-3 mt-3"
            >
              <Text className="text-center text-white font-semibold text-lg">
                Appliquer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
