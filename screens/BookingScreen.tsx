import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { mockSuggestions, getPreviousSearches } from '../services/suggestionService';

const BookingScreen: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

    const filtered = [
        'Autour de moi',
        ...getPreviousSearches().filter((s) =>
            s.toLowerCase().includes(query.toLowerCase())
        ),
    ];

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold text-center mb-4">Book ta réza</Text>
            <TextInput
                placeholder="Nom du restaurant, Type ..."
                value={query}
                onChangeText={(text) => {
                    setQuery(text);
                    setShowSuggestions(true);
                }}
                className="bg-gray-100 p-3 rounded-xl mb-2"
            />
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
    );
};

export default BookingScreen;
