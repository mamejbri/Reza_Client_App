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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';

import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { getSuggestions } from '../services/suggestionService';
import type { RootStackParamList } from '../types/navigation';

type BookingScreenRouteProp = RouteProp<RootStackParamList, 'Booking'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BookingScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);

    const route = useRoute<BookingScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { background, category } = route.params;

    const suggestions = getSuggestions(query);

    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Permission de localisation',
                    message: 'Cette app a besoin de votre position pour trouver des endroits proches.',
                    buttonPositive: 'OK',
                    buttonNegative: 'Annuler',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const handleSelect = async (item: string) => {
        const isNearby = item.trim().toLowerCase() === 'autour de moi';
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
                        coords: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        },
                        query: null,
                        category,
                    });
                },
                (err) => {
                    setLoadingLocation(false);
                    alert("Erreur lors de la récupération de votre position.");
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000,
                }
            );
        } else {
            navigation.navigate('SearchResults', {
                query: item,
                coords: null,
                category,
            });
        }
    };

    const isSearchable = query.trim().length > 0;

    return (
        <ImageBackground source={background} resizeMode="cover" className="flex-1">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1 justify-center items-center p-4 relative">
                    <Text className="text-2xl text-white font-bold text-center mb-3.5">Book ta réza</Text>

                    <View className="flex-row items-center justify-between mb-3.5">
                        {['Simple', 'Immédiat', '24h/24'].map((label, index) => (
                            <React.Fragment key={label}>
                                <Text className="text-white font-light italic">{label}</Text>
                                {index < 2 && (
                                    <View className="w-[6px] h-[6px] rounded-full bg-white mx-[22px]" />
                                )}
                            </React.Fragment>
                        ))}
                    </View>

                    {/* Search Field */}
                    <View className="w-full">
                        <View className="flex-row items-center w-full h-[78px] bg-white/70 rounded-xl px-[20px] py-[16px] mb-2">
                            <TextInput
                                placeholder="Nom du restaurant, Type ..."
                                placeholderTextColor="#000"
                                className="text-base flex-1 italic"
                                value={query}
                                onFocus={() => setShowSuggestions(true)}
                                onChangeText={(text) => {
                                    setQuery(text);
                                    setShowSuggestions(true);
                                }}
                                onSubmitEditing={() => {
                                    if (query.trim()) handleSelect(query.trim());
                                }}
                                returnKeyType="search"
                            />
                            {loadingLocation ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <TouchableOpacity
                                    onPress={() => isSearchable && handleSelect(query.trim())}
                                    disabled={!isSearchable}
                                    style={{ opacity: isSearchable ? 1 : 0.3 }}
                                >
                                    <IcoMoonIcon name="search" size={38} color="#000" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && (
                            <View className="absolute left-0 right-0 top-[86px] bg-white/70 rounded-2xl px-4 py-6 z-50 gap-4 max-h-[300px] overflow-y-auto">
                                {suggestions.map((item, index) => {
                                    const isNearby = item.toLowerCase() === 'autour de moi';
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            className="flex-row items-center gap-2.5"
                                            onPress={() => handleSelect(item)}
                                        >
                                            <IcoMoonIcon
                                                name={isNearby ? 'location' : 'search'}
                                                size={24}
                                                color="#000"
                                            />
                                            <Text
                                                className={`text-base ${isNearby ? 'font-normal' : 'font-semibold'} text-black`}
                                            >
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </ImageBackground>
    );
};

export default BookingScreen;
