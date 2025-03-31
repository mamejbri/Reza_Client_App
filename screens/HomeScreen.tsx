import React from 'react';
import { Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const categories = ['Restaurant', 'Soins et beauté', 'Activité'];

    return (
        <ScrollView className="flex-1 bg-white p-4">
            <Text className="text-xl font-bold text-center mb-6">On réserve quoi ?</Text>
            {categories.map((item) => (
                <TouchableOpacity
                    key={item}
                    className="rounded-xl bg-gray-200 h-32 mb-4 justify-center items-center"
                    onPress={() => navigation.navigate('Booking')}
                >
                    <Text className="text-white text-xl font-bold italic drop-shadow-md">{item}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

export default HomeScreen;
