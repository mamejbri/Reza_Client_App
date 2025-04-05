import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground } from 'react-native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { mockSuggestions, getPreviousSearches } from '../services/suggestionService';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

type BookingScreenRouteProp = RouteProp<RootStackParamList, 'Booking'>;

const BookingScreen: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

    const route = useRoute<BookingScreenRouteProp>();
    const { background } = route.params;

    const filtered = [
        'Autour de moi',
        ...getPreviousSearches().filter((s) =>
            s.toLowerCase().includes(query.toLowerCase())
        ),
    ];

    return (
        <ImageBackground
            source={background}
            resizeMode="cover"
            className="flex-1">
            <View className="flex-1 justify-center items-center p-4">
                <Text className="text-2xl text-white font-bold text-center mb-3.5">Book ta réza</Text>
                <View className="flex-row items-center justify-between mb-3.5">
                    <Text className="text-white font-light italic">Simple</Text>
                    <View className="w-[6px] h-[6px] rounded-full bg-white mx-[22px]" />
                    <Text className="text-white font-light italic">Immédiat</Text>
                    <View className="w-[6px] h-[6px] rounded-full bg-white mx-[22px]" />
                    <Text className="text-white font-light italic">24h/24</Text>
                </View>
                <View className="flex-row items-center w-full h-[78px] bg-white/70 rounded-xl px-[20px] py-[16px] mb-2">
                    <TextInput
                        placeholder="Nom du restaurant, Type ..."
                        placeholderTextColor="#000"
                        className="text-base flex-1 italic"
                        value={query}
                        onChangeText={(text) => {
                            setQuery(text);
                            setShowSuggestions(true);
                        }}
                    />
                    <IcoMoonIcon name="search" size={38} color="#000" />
                </View>
                {showSuggestions && (
                    <View className="bg-white border border-gray-200 rounded-lg">
                        {filtered.map((item, index) => (
                            <TouchableOpacity key={index} className="p-3 border-b border-gray-100">
                                <Text>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </ImageBackground>
    );
};

export default BookingScreen;
