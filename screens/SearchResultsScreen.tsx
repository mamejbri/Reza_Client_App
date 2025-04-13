import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { getPlacesByCity } from '../services/searchService'; // You’ll implement this
import type { RootStackParamList } from '../types/navigation';
import type { RouteProp } from '@react-navigation/native';
import { getDistanceFromLatLng } from '../utils/distance';

type SearchResultsRoute = RouteProp<RootStackParamList, 'SearchResults'>;

const SearchResultsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { params } = useRoute<SearchResultsRoute>();
    const { city, category, coords } = params;

    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            let data = [];

            if (coords) {
                // Nearby search logic
                const allPlaces = await getPlacesByCity(null, category); // get all of same category
                data = allPlaces.filter((place) => {
                    const dist = getDistanceFromLatLng(
                        coords.lat,
                        coords.lng,
                        place.location.lat,
                        place.location.lng
                    );
                    return dist <= 10; // Show places within 10 km radius
                });
            } else {
                // Normal city-based search
                data = await getPlacesByCity(city, category);
            }

            setResults(data);
            setLoading(false);
        };

        fetchData();
    }, [city, category, coords]);


    return (
        <View className="flex-1 bg-white">
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#C53334" />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <>
                            {/* Search Info Card */}
                            <View className="px-4 pt-5">
                                <View className="bg-gray-100 rounded-2xl p-4 mb-4">
                                    <Text className="text-lg font-semibold mb-1">{category}</Text>
                                    <Text className="text-base text-gray-700 mb-1">{city || 'Autour de moi'}</Text>
                                    <Text className="text-sm text-gray-500 italic">À tout moment</Text>
                                </View>

                                {/* Filters */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                                    {['Disponibilité', 'Mieux noté', 'Filtres'].map((label) => (
                                        <TouchableOpacity
                                            key={label}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-xl mr-3"
                                        >
                                            <Text className="text-sm font-medium text-black">{label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Special Tags (static for now) */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                                    {['Ambiance', 'Terrasse', 'Romantique'].map((tag) => (
                                        <TouchableOpacity
                                            key={tag}
                                            className="px-4 py-2 bg-red-100 rounded-xl mr-3"
                                        >
                                            <Text className="text-sm font-medium text-red-600">{tag}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="mx-4 mb-4 rounded-2xl overflow-hidden bg-gray-100 shadow"
                            onPress={() =>
                                navigation.navigate('ReservationDetail', {
                                    reservation: {
                                        id: 'new',
                                        date: '',
                                        time: '',
                                        people: 2,
                                        status: 'draft',
                                        place: item,
                                    },
                                    startInEditMode: true,
                                })
                            }
                        >
                            <Image source={{ uri: item.images[0] }} className="w-full h-40" resizeMode="cover" />
                            <View className="py-4 px-2.5 gap-3">
                                <Text className="text-lg font-bold">{item.name}</Text>
                                <View className="flex-row items-center gap-2">
                                    <IcoMoonIcon name="location" size={24} color="#C53334" />
                                    <Text className="text-base font-medium">{item.address}</Text>
                                </View>
                                <View className="flex-row items-center gap-5">
                                    <View className="flex-row items-center bg-white p-4 gap-2 rounded-xl">
                                        <IcoMoonIcon name="star-solid" size={24} color="#C53334" />
                                        <Text className="text-base font-medium">{item.rating.toFixed(1)}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="px-4">
                            <View className="bg-gray-100 py-8 px-4 rounded-2xl">
                                <Text className="text-lg mb-5">Aucun résultat trouvé</Text>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    className="btn-small self-start"
                                >
                                    <Text className="btn-small-text">Retour</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                />
            )}
        </View>
    );
};

export default SearchResultsScreen;
