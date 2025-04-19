import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { getPlacesByQuery } from '../services/searchService';
import type { RootStackParamList } from '../types/navigation';
import type { RouteProp } from '@react-navigation/native';
import { getDistanceFromLatLng } from '../utils/distance';

type SearchResultsRoute = RouteProp<RootStackParamList, 'SearchResults'>;

const logo = require('../assets/images/logo.png');

const SearchResultsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { params } = useRoute<SearchResultsRoute>();
    const { query, category, coords } = params;

    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            let data = [];

            if (coords) {
                // Nearby search logic
                const allPlaces = await getPlacesByQuery(null, category); // get all of same category
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
                // Normal query-based search
                data = await getPlacesByQuery(query, category);
            }

            setResults(data);
            setLoading(false);
        };

        fetchData();
    }, [query, category, coords]);


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
                                <View className="bg-neutral rounded-2xl p-4 mb-3 flex-row items-center gap-3">
                                    <IcoMoonIcon name="search" size={30} color="#C53334" />
                                    <View className="flex-column flex-grow">
                                        <Text className="text-base font-bold mb-1">{category} - {query?.trim() ? query : 'Autour de moi'}</Text>
                                        <Text className="text-base">À tout moment</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => navigation.goBack()}>
                                        <IcoMoonIcon name="pen" size={30} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                {/* Filters */}
                                <ScrollView horizontal className="flex-row mb-3">
                                    {['disponibilite', 'mieux-note', 'filtres'].map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            className="mr-2 btn-light-icon"
                                        >
                                            <IcoMoonIcon name={t === 'disponibilite' ? 'time' : t === 'mieux-note' ? 'star' : 'setting'} size={20} color="#C53334" />
                                            <Text className="btn-light-icon-text">
                                                {t === 'disponibilite' ? 'Disponibilité' : t === 'mieux-note' ? 'Mieux notés' : 'Filtres'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Special Tags (static for now) */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                                    {['Ambiance', 'Terrasse', 'Romantique'].map((tag) => (
                                        <TouchableOpacity
                                            key={tag}
                                            className="flex-column items-center mr-2">
                                            <Image
                                                source={logo}
                                                style={{ width: 55, height: 53, resizeMode: 'contain' }}
                                                className="bg-neutral rounded-full mb-1"
                                            />
                                            <Text className="text-sm font-semibold">{tag}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Only show this text when there are results */}
                                {results.length > 0 && (
                                    <Text className="text-lg font-bold mb-6 text-center">Sélectionnez votre restaurant</Text>
                                )}
                            </View>
                        </>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="mx-4 mb-6 rounded-2xl overflow-hidden bg-gray-100"
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
                            <Image source={{ uri: item.images[0] }} className="w-full h-[200]" resizeMode="cover" />
                            <View className="py-4 px-2.5 gap-3">
                                <Text className="text-lg font-bold">{item.name}</Text>
                                <View className="flex-row items-center gap-2">
                                    <IcoMoonIcon name="location" size={24} color="#C53334" />
                                    <Text className="text-base font-medium">
                                        {item.address}
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <IcoMoonIcon name="star-solid" size={24} color="#C53334" />
                                    <Text className="text-base font-medium">

                                        {item.rating.toFixed(1)} ({item.reviews.length} avis) $$$
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="px-4">
                            <View className="bg-neutral py-8 px-4 rounded-2xl">
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
