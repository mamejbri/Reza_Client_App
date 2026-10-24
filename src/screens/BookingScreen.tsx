// src/screens/BookingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Keyboard,
  TouchableWithoutFeedback,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Alert } from '../ui/AppAlert';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';

import AppIcon from '../icons/AppIcon';
import { getSuggestions } from '../../services/suggestionService';
import type { RootStackParamList } from '../../types/navigation';
import { EstablishmentType, ESTABLISHMENT_LABELS } from '../../types/establishment';
import { useI18n } from '../i18n/LocaleProvider';
import { useResponsive } from '../utils/responsive';

type BookingScreenRouteProp = RouteProp<RootStackParamList, 'Booking'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BookingScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const route = useRoute<BookingScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const { scale } = useResponsive();
  const { background, type } = route.params; // 🔴 use enum
  const typeLabel = t(ESTABLISHMENT_LABELS[type]);

  const suggestions = getSuggestions(query);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: t('search.locationTitle'),
          message: t('search.locationMessage'),
          buttonPositive: t('common.ok'),
          buttonNegative: t('common.cancel'),
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleSelect = async (item: string) => {
    const isNearby = item.trim().toLowerCase() === t('search.nearby').toLowerCase();
    setQuery(item);
    setShowSuggestions(false);

    if (isNearby) {
      const permission = await requestLocationPermission();
      if (!permission) return;

      setLoadingLocation(true);
      Geolocation.getCurrentPosition(
        (position) => {
          setLoadingLocation(false);
          navigation.navigate('SearchResults', {
            coords: { lat: position.coords.latitude, lng: position.coords.longitude },
            query: null,
            type, // 🔴 pass enum forward
          });
        },
        () => {
          setLoadingLocation(false);
          Alert.alert(t('search.location'), t('search.locationError'));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      navigation.navigate('SearchResults', {
        query: item,
        coords: null,
        type, // 🔴 pass enum forward
      });
    }
  };

  const isSearchable = query.trim().length > 0;

  return (
    <ImageBackground source={background} resizeMode="cover" className="flex-1">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-center items-center p-4 relative">
          {/* Type badge */}
        

          <Text className="text-2xl text-white font-bold text-center mb-3.5"
          style={{ fontSize: scale(32) }}
          >{t('search.title')}</Text>

          <View
            className="flex-row items-center mb-3.5"
            style={{ gap: 10 }}
          >
            {[t('search.simple'), t('search.instant'), t('search.allDay')].map((label, index, arr) => (
              <React.Fragment key={label}>
                <Text
                  className="text-white font-light italic"
                  style={{ fontSize: scale(16) }}
                >
                  {label}
                </Text>

                {/* bullet between items: after Simple and after Immédiat */}
                {index < arr.length - 1 && (
                  <View className="w-[6px] h-[6px] rounded-full bg-white mx-[22px]" />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Search Field */}
          <View className="w-full">
            <View className="flex-row items-center w-full h-[78px] bg-white rounded-xl px-[20px] py-[16px] mb-2"
            style={{ height:60, padding:10,opacity: 0.7 }}
            
            >
              <TextInput
                placeholder={t('search.placeholder')}
                placeholderTextColor="#555555ff"
                className="text-base flex-1 italic text-black"
                value={query}
                onFocus={() => setShowSuggestions(true)}
                onChangeText={(text) => { setQuery(text); setShowSuggestions(true); }}
                onSubmitEditing={() => { if (query.trim()) handleSelect(query.trim()); }}
                returnKeyType="search"
              />
              {loadingLocation ? (
                <ActivityIndicator size="small" />
              ) : (
                <TouchableOpacity
                  onPress={() => isSearchable && handleSelect(query.trim())}
                  disabled={!isSearchable}
                  style={{ opacity: isSearchable ? 1 : 0.3 }}
                >
                  <AppIcon name="search" size={38} />
                </TouchableOpacity>
              )}
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              
              <View
                className="absolute left-0 right-0 top-[86px] z-50 bg-white rounded-2xl px-4 py-3"
                style={{
                  shadowColor: '#000',
                  opacity:0.7,
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                  maxHeight: 300,
                }}
              >
                <ScrollView keyboardShouldPersistTaps="handled"
                style={{ shadowOpacity: 0.9 }}

                >
                  {suggestions.map((item, index) => {
                    const isNearby = item.toLowerCase() === t('search.nearby').toLowerCase();
                    return (
                      <TouchableOpacity
                        key={`${item}-${index}`}
                        className="flex-row items-center gap-2.5 py-3"
                        onPress={() => handleSelect(item)}
                      >
                        <AppIcon name={isNearby ? 'location' : 'search'} size={22} color="#111" />
                        <Text className={`text-base ${isNearby ? 'font-normal' : 'font-semibold'} text-black`}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
};

export default BookingScreen;
