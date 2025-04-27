import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, ScrollView, Text, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { fetchUserReservations } from '../services/reservations';
import Profile from '../components/Profile';

const AppointmentsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'appointments' | 'info'>('appointments');
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    useFocusEffect(
        useCallback(() => {
            const loadReservations = async () => {
                setLoading(true);
                const result = await fetchUserReservations();
                setReservations(result);
                setLoading(false);
            };
            loadReservations();
        }, [])
    );

    const hasReservations = reservations.length > 0;

    return (
        <View className="flex-1 bg-white">
            {activeTab === 'appointments' ? (
                loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#C53334" />
                    </View>
                ) : (
                    <FlatList
                        data={hasReservations ? reservations : []}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={
                            <View>
                                <View className="flex-row px-4 pt-4 gap-2">
                                    <TouchableOpacity className={`flex-1 ${activeTab === 'appointments' ? 'btn-small-icon' : 'btn-light-icon'}`} onPress={() => setActiveTab('appointments')}>
                                        <IcoMoonIcon name="time" size={20} color={`${activeTab === 'appointments' ? '#fff' : '#C53334'}`} />
                                        <Text className={`${activeTab === 'appointments' ? 'btn-small-icon-text' : 'btn-light-icon-text'}`}>Mes rendez-vous</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className={`flex-1 ${activeTab === 'info' ? 'btn-small-icon' : 'btn-light-icon'}`} onPress={() => setActiveTab('info')}>
                                        <IcoMoonIcon name="info" size={20} color={`${activeTab === 'info' ? '#fff' : '#C53334'}`} />
                                        <Text className={`${activeTab === 'info' ? 'btn-small-icon-text' : 'btn-light-icon-text'}`}>Mes informations</Text>
                                    </TouchableOpacity>
                                </View>

                                <View className="pt-5 px-4 pb-4">
                                    <Text className="text-lg font-semibold mb-5 mx-3">Mes rendez-vous à venir</Text>
                                </View>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity className="mx-4 mb-4 rounded-2xl overflow-hidden bg-gray-100 shadow" onPress={() => navigation.navigate('ReservationDetail', { reservation: item })}>
                                <Image source={item.image} className="w-full h-40" resizeMode="cover" />
                                <View className="py-4 px-2.5 gap-3">
                                    <Text className="text-lg font-bold">{item.name}</Text>
                                    <View className="flex-row items-center gap-2">
                                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                                        <Text className="text-base font-medium">
                                            {item.address}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center gap-5">
                                        <View className="flex-row items-center bg-white p-4 gap-2 rounded-xl">
                                            <IcoMoonIcon name="date" size={24} color="#C53334" />
                                            <Text className="text-base font-medium">
                                                {item.date}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center bg-white p-4 gap-2 rounded-xl">
                                            <IcoMoonIcon name="clock" size={24} color="#C53334" />
                                            <Text className="text-base font-medium">
                                                {item.time}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View className="px-4">
                                <View className="bg-gray-100 py-8 px-4 rounded-2xl">
                                    <Text className="text-lg mb-5">Vous n’avez pas encore de Réza</Text>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('Home')}
                                        className="btn-small self-start"
                                    >
                                        <Text className="btn-small-text">Book ta réza</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                    />
                )
            ) : (
                <ScrollView className="px-4 pt-4">
                    <View className="flex-row gap-2 mb-4">
                        {/* Tabs */}
                        <TouchableOpacity className={`flex-1 ${activeTab === 'appointments' ? 'btn-small-icon' : 'btn-light-icon'}`} onPress={() => setActiveTab('appointments')}>
                            <IcoMoonIcon name="time" size={20} color={`${activeTab === 'appointments' ? '#fff' : '#C53334'}`} />
                            <Text className={`${activeTab === 'appointments' ? 'btn-small-icon-text' : 'btn-light-icon-text'}`}>Mes rendez-vous</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className={`flex-1 ${activeTab === 'info' ? 'btn-small-icon' : 'btn-light-icon'}`} onPress={() => setActiveTab('info')}>
                            <IcoMoonIcon name="info" size={20} color={`${activeTab === 'info' ? '#fff' : '#C53334'}`} />
                            <Text className={`${activeTab === 'info' ? 'btn-small-icon-text' : 'btn-light-icon-text'}`}>Mes informations</Text>
                        </TouchableOpacity>
                    </View>
                    <Profile />
                </ScrollView>
            )}
        </View>
    );
};

export default AppointmentsScreen;
