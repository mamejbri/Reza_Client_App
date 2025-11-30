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
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IcoMoonIcon from '../icons/IcoMoonIcon';
import Profile from '../../components/Profile';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

import {
  fetchUserReservations,
  fetchUserPastReservations,
} from '../../services/reservations';
import { API } from '../config/env';

dayjs.locale('fr');

const SCREEN_WIDTH = Dimensions.get('window').width;



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

function frPrettyDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  const day = d.format('dddd');
  const dnum = d.format('D');
  const mon = d.format('MMM');
  const yr = d.format('YYYY');
  const monCompact = mon.replace('févr.', 'févr.');
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${dnum} ${monCompact}${monCompact.endsWith('.') ? '' : '.'}${yr}`;
}

function hhmm(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
}

const fallbackImg = require('../../assets/images/food.png');

const AppointmentsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'info'>('appointments');
  const [rezSection, setRezSection] = useState<'upcoming' | 'past'>('upcoming');

  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  const [pastReservations, setPastReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<Nav>();

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
  const isInfo = activeTab === 'info';
  const isUpcoming = rezSection === 'upcoming';
  const isPast = rezSection === 'past';

  // ================================
  // HEADER TABS
  // ================================
  const HeaderTabs = (
    <View className="flex-row px-4 pt-4 gap-2">
      <TouchableOpacity
        className={`flex-1 ${isAppointments ? 'btn-small-icon' : 'btn-light-icon'}`}
        onPress={() => setActiveTab('appointments')}
      >
        <IcoMoonIcon name="time" size={20} color={isAppointments ? '#fff' : '#C53334'} />
        <Text className={isAppointments ? 'btn-small-icon-text' : 'btn-light-icon-text'}>
          Mes rendez-vous
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-1 ${isInfo ? 'btn-small-icon' : 'btn-light-icon'}`}
        onPress={() => setActiveTab('info')}
      >
        <IcoMoonIcon name="info" size={20} color={isInfo ? '#fff' : '#C53334'} />
        <Text className={isInfo ? 'btn-small-icon-text' : 'btn-light-icon-text'}>
          Mes informations
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ================================
  // UPCOMING / PAST toggle
  // ================================
  const SectionToggle = (
    <View className="px-4">
      <View className="flex-row gap-2 mt-2 mb-3">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setRezSection('upcoming')}
          className={`flex-1 rounded-xl py-2 items-center ${
            isUpcoming ? 'bg-[#C53334]' : 'bg-white border border-[#C53334]'
          }`}
        >
          <Text className={`text-[14px] font-semibold ${isUpcoming ? 'text-white' : 'text-[#C53334]'}`}>À venir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setRezSection('past');
            loadPastReservations();
          }}
          className={`flex-1 rounded-xl py-2 items-center ${
            isPast ? 'bg-[#C53334]' : 'bg-white border border-[#C53334]'
          }`}
        >
          <Text className={`text-[14px] font-semibold ${isPast ? 'text-white' : 'text-[#C53334]'}`}>Passés</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const sectionTitle = isUpcoming ? 'Mes rendez-vous à venir' : 'Mes rendez-vous passés';

  // ================================
  // CARD COMPONENT (real photo)
  // ================================
 const Card = ({ item }: { item: any }) => {
const finalImage = getFinalImage(item);
const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() =>
        navigation.navigate("ReservationDetail", {
          reservation: item,
          isPast,
        })
      }
      style={{
        width: SCREEN_WIDTH - 32,
        alignSelf: "center",
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "white",
        marginBottom: 20,
      }}
    >
      {/* IMAGE CONTAINER */}
      <View
        style={{
          width: "100%",
          height: SCREEN_WIDTH * 0.45,
          backgroundColor: "#eee", // <-- Prevents white flash
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Placeholder until image loads */}
        {!imgLoaded && (
          <Image
            source={fallbackImg}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
            }}
            resizeMode="cover"
            blurRadius={5} // nice blurred effect
          />
        )}

        {/* Real photo */}
       <Image
  source={finalImage ? { uri: finalImage } : fallbackImg}
  style={{ width: "100%", height: "100%", opacity: imgLoaded ? 1 : 0 }}
  resizeMode="cover"
  onLoad={() => setImgLoaded(true)}
/>
      </View>

      {/* INFO */}
      <View style={{ padding: 20, backgroundColor: "#f7f7f7" }}>
        <Text className="text-[20px] font-bold mb-2 text-[#111]">{item.name}</Text>

        <View className="flex-row items-center mb-3">
          <IcoMoonIcon name="location" size={18} color="#C53334" />
          <Text className="ml-2 text-[14px] text-[#444]">{item.address}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center bg-white px-3 py-2 rounded-xl">
            <IcoMoonIcon name="date" size={20} color="#C53334" />
            <Text className="ml-2 text-[15px] font-medium">
              {frPrettyDate(item.date)}
            </Text>
          </View>

          <View className="flex-row items-center bg-white px-3 py-2 rounded-xl">
            <IcoMoonIcon name="clock" size={20} color="#C53334" />
            <Text className="ml-2 text-[15px] font-medium">
              {hhmm(item.heureDebut)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};


  const data = isUpcoming ? upcomingReservations : pastReservations;

  // ================================
  // RENDER
  // ================================
  return (
    <View className="flex-1 bg-white">
      {isAppointments ? (
        loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#C53334" />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id ?? Math.random())}
            ListHeaderComponent={
              <View>
                {HeaderTabs}
                {SectionToggle}
                <View className="pt-5 px-4 pb-2">
                  <Text className="text-lg font-semibold mb-2">{sectionTitle}</Text>
                </View>
              </View>
            }
            renderItem={({ item }) => <Card item={item} />}
            ListEmptyComponent={
              <View className="px-4">
                <View className="bg-gray-100 py-8 px-4 rounded-2xl">
                  <Text className="text-lg mb-5">
                    {isUpcoming ? 'Vous n’avez pas encore de Réza' : 'Aucune réza passée'}
                  </Text>

                  {isUpcoming && (
                    <TouchableOpacity
                      className="btn-small self-start"
                      onPress={() =>
                        navigation.dispatch(
                          CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
                          })
                        )
                      }
                    >
                      <Text className="btn-small-text">Book ta réza</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )
      ) : (
        <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
          {HeaderTabs}
          <Profile />
        </ScrollView>
      )}
    </View>
  );
};

export default AppointmentsScreen;
