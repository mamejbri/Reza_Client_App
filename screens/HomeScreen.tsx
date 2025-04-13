import React from 'react';
import {
    Text,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const categories = [
    {
        id: '1',
        name: 'Restaurant',
        image: require('../assets/images/restaurant-bg.png'),
    },
    {
        id: '2',
        name: 'Soins et beauté',
        image: require('../assets/images/coiffeur-bg.png'),
    },
    {
        id: '3',
        name: 'Activité',
        image: require('../assets/images/activites-bg.png'),
    },
];

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    return (
        <ScrollView className="flex-1 bg-white pt-8 px-4 pb-4">
            <Text className="text-lg font-bold text-center mb-8">On réserve quoi ?</Text>
            {categories.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    className="rounded-xl h-48 mb-4 overflow-hidden"
                    onPress={() => navigation.navigate('Booking', { background: item.image, category: item.name })}>
                    <ImageBackground
                        source={item.image}
                        resizeMode="cover"
                        className="flex-1 justify-center items-center">
                        <Text className="text-white text-2xl font-black italic">
                            {item.name}
                        </Text>
                    </ImageBackground>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

export default HomeScreen;