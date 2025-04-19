import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { getPlacesByQuery } from '../services/searchService';
import { fetchUserReservations } from '../services/reservations';
import { getDistanceFromLatLng } from '../utils/distance';
import { toISO } from '../utils/date';
import DatePickerModal from '../components/DatePickerModal';
import type { RootStackParamList } from '../types/navigation';
import type { RouteProp } from '@react-navigation/native';

type SearchResultsRoute = RouteProp<RootStackParamList, 'SearchResults'>;

const logo = require('../assets/images/logo.png');

const SearchResultsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { params } = useRoute<SearchResultsRoute>();
    const { query, category, coords } = params;

    const todayISO = toISO(new Date());

    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);
    const [originalResults, setOriginalResults] = useState<any[]>([]);
    const [userReservations, setUserReservations] = useState<any[]>([]);

    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(todayISO);
    const [showDateModal, setShowDateModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const reservations = await fetchUserReservations();
            setUserReservations(reservations);

            let data = [];

            if (coords) {
                const allPlaces = await getPlacesByQuery(null, category);
                data = allPlaces.filter((place) => {
                    const dist = getDistanceFromLatLng(
                        coords.lat,
                        coords.lng,
                        place.location.lat,
                        place.location.lng
                    );
                    return dist <= 10;
                });
            } else {
                data = await getPlacesByQuery(query, category);
            }

            setOriginalResults(data);
            setResults(data);
            setLoading(false);
        };

        fetchData();
    }, [query, category, coords]);

    useEffect(() => {
        let filteredResults = [...originalResults];

        if (selectedDate) {
            filteredResults = filteredResults.filter((place) => {
                const slots = place.available_slots?.[selectedDate];
                return slots?.some((slot: any) => slot.reserved_by === null);
            });
        }

        if (selectedFilter === 'mieux-note') {
            filteredResults.sort((a, b) => b.rating - a.rating);
        }

        setResults(filteredResults);
    }, [selectedDate, selectedFilter, originalResults]);

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
                            <View className="px-4 pt-5">
                                <View className="bg-neutral rounded-2xl p-4 mb-3 flex-row items-center gap-3">
                                    <IcoMoonIcon name="search" size={30} color="#C53334" />
                                    <View className="flex-column flex-grow">
                                        <Text className="text-base font-bold mb-1">{category} - {query?.trim() || 'Autour de moi'}</Text>
                                        <Text className="text-base">À tout moment</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => navigation.goBack()}>
                                        <IcoMoonIcon name="pen" size={30} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView horizontal className="flex-row mb-3">
                                    {['disponibilite', 'mieux-note', 'filtres'].map((t) => {
                                        const isDisponibiliteActive = t === 'disponibilite' && selectedDate && selectedDate !== todayISO;
                                        const isMieuxNoteActive = t === 'mieux-note' && selectedFilter === 'mieux-note';

                                        return (
                                            <TouchableOpacity
                                                key={t}
                                                className={`mr-2 ${isDisponibiliteActive || isMieuxNoteActive
                                                    ? 'btn-small-icon'
                                                    : 'btn-light-icon'
                                                    }`}
                                                onPress={() => {
                                                    if (t === 'disponibilite') {
                                                        setShowDateModal(true);
                                                    } else {
                                                        setSelectedFilter(selectedFilter === t ? null : t);
                                                    }
                                                }}
                                            >
                                                <IcoMoonIcon
                                                    name={t === 'disponibilite' ? 'time' : t === 'mieux-note' ? 'star' : 'setting'}
                                                    size={20}
                                                    color={(isDisponibiliteActive || isMieuxNoteActive) ? '#fff' : '#C53334'}
                                                />
                                                <Text className={(isDisponibiliteActive || isMieuxNoteActive) ? 'btn-small-icon-text' : 'btn-light-icon-text'}>
                                                    {t === 'disponibilite' ? 'Disponibilité' : t === 'mieux-note' ? 'Mieux notés' : 'Filtres'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                                    {['Ambiance', 'Terrasse', 'Romantique'].map((tag) => (
                                        <TouchableOpacity key={tag} className="flex-column items-center mr-2">
                                            <Image
                                                source={logo}
                                                style={{ width: 55, height: 53, resizeMode: 'contain' }}
                                                className="bg-neutral rounded-full mb-1"
                                            />
                                            <Text className="text-sm font-semibold">{tag}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {results.length > 0 && (
                                    <Text className="text-lg font-bold mb-6 text-center">Sélectionnez votre restaurant</Text>
                                )}
                            </View>
                        </>
                    }
                    renderItem={({ item }) => {
                        const existingReservation = userReservations.find(
                            (res) => res.place.id === item.id
                        );

                        return (
                            <TouchableOpacity
                                className="mx-4 mb-6 rounded-2xl overflow-hidden bg-gray-100"
                                onPress={() => {
                                    if (existingReservation) {
                                        navigation.navigate('ReservationDetail', {
                                            reservation: existingReservation,
                                            startInEditMode: false,
                                        });
                                    } else {
                                        navigation.navigate('ReservationDetail', {
                                            reservation: {
                                                id: 'new',
                                                date: selectedDate,
                                                time: '',
                                                people: 2,
                                                status: 'draft',
                                                place: item,
                                            },
                                            startInEditMode: true,
                                        });
                                    }
                                }}
                            >
                                <Image source={{ uri: item.images[0] }} className="w-full h-[200]" resizeMode="cover" />
                                <View className="py-4 px-2.5 gap-3">
                                    <Text className="text-lg font-bold">{item.name}</Text>
                                    <View className="flex-row items-center gap-2">
                                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                                        <Text className="text-base font-medium">{item.address}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        <IcoMoonIcon name="star-solid" size={24} color="#C53334" />
                                        <Text className="text-base font-medium">
                                            {item.rating.toFixed(1)} ({item.reviews.length} avis) $$$
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="px-4">
                            <View className="bg-neutral py-8 px-4 rounded-2xl">
                                <Text className="text-lg mb-5">
                                    {selectedDate
                                        ? "Aucun restaurant disponible à cette date"
                                        : "Aucun résultat trouvé"}
                                </Text>
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

            <DatePickerModal
                isVisible={showDateModal}
                onClose={() => setShowDateModal(false)}
                selectedDate={selectedDate}
                onSelectDate={(dateISO) => {
                    console.log('Selected from modal:', dateISO);
                    console.log('Today:', todayISO);
                    setSelectedDate(dateISO);
                    setShowDateModal(false);
                }}
            />
        </View>
    );
};

export default SearchResultsScreen;