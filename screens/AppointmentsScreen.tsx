import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList } from 'react-native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { useNavigation } from '@react-navigation/native';

// Mocked past reservations
const reservations = [
    {
        id: '1',
        name: "L'mida Marrakech",
        address: 'Av. Echouhada, Marrakech 40000',
        date: 'Lundi 7 fev.2025',
        time: '13:30',
        image: require('../assets/images/food.png'),
    },
    {
        id: '2',
        name: "L'mida Marrakech",
        address: 'Av. Echouhada, Marrakech 40000',
        date: 'Lundi 7 fev.2025',
        time: '13:30',
        image: require('../assets/images/food.png'),
    },
];

const AppointmentsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'appointments' | 'info'>('appointments');
    const navigation = useNavigation();

    const hasReservations = reservations.length > 0;

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row px-4 pt-4 space-x-2">
                <TouchableOpacity className={`${activeTab === 'appointments' ? 'btn-small-icon' : 'btn-light-icon'}`} onPress={() => setActiveTab('appointments')}>
                    <IcoMoonIcon name="time" size={20} color={`${activeTab === 'appointments' ? '#fff' : '#C53334'}`} />
                    <Text className={`${activeTab === 'appointments' ? 'btn-small-icon-text' : 'btn-light-icon-text'}`}>Mes rendez-vous</Text>
                </TouchableOpacity>
                <TouchableOpacity className={`${activeTab === 'info' ? 'btn-small-icon' : 'btn-light-icon'}`} onPress={() => setActiveTab('info')}>
                    <IcoMoonIcon name="info" size={20} color={`${activeTab === 'info' ? '#fff' : '#C53334'}`} />
                    <Text className={`${activeTab === 'info' ? 'btn-small-icon-text' : 'btn-light-icon-text'}`}>Mes informations</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'appointments' ? (
                <View className="px-4 mt-4">
                    <Text className="text-lg font-semibold mb-4">Mes rendez-vous à venir</Text>

                    {hasReservations ? (
                        <FlatList
                            data={reservations}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View className="mb-4 rounded-2xl overflow-hidden bg-gray-100 shadow">
                                    <Image source={item.image} className="w-full h-40" resizeMode="cover" />
                                    <View className="p-4">
                                        <Text className="text-lg font-bold mb-1">{item.name}</Text>
                                        <View className="flex-row items-center">
                                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                                            <Text className="text-sm">
                                                {item.address}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center bg-white px-3 py-1 rounded-xl">
                                                <IcoMoonIcon name="date" size={24} color="#C53334" />
                                                <Text className="text-sm">
                                                    {item.date}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center bg-white px-3 py-1 rounded-xl">
                                                <IcoMoonIcon name="clock" size={24} color="#C53334" />
                                                <Text className="text-sm">
                                                    {item.time}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
                        />
                    ) : (
                        <View className="bg-gray-100 p-6 rounded-2xl">
                            <Text className="mb-4">Vous n’avez pas encore de Réza</Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Booking')}
                                className="bg-red-600 py-3 px-6 rounded-full self-start"
                            >
                                <Text className="text-white font-semibold">Book ta réza</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                <View className="p-6">
                    <Text className="text-gray-400 italic">(vide pour le moment)</Text>
                </View>
            )}
        </View>
    );
};

export default AppointmentsScreen;
