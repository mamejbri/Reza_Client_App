import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import CancelReservationModal from '../components/CancelReservationModal';
import ReservationSummary from '../components/ReservationSummary';
import EditReservationForm from '../components/EditReservationForm';
import ReviewSection from '../components/ReviewSection';
import AboutSection from '../components/AboutSection';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';
import { isoToFrDisplay } from '../utils/date';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ReservationDetailScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const { reservation } = route.params;

    const [tab, setTab] = useState('view');
    const [activeEditTab, setActiveEditTab] = useState('rendezvous');
    const [people, setPeople] = useState(reservation.people);
    const [dateISO, setDateISO] = useState(reservation.date);
    const [time, setTime] = useState(reservation.time);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const moment = Number(time.split(':')[0]) < 18 ? 'Midi' : 'Soir';

    const handleCancel = () => {
        setShowCancelModal(true);
    };

    const onConfirmCancel = () => {
        setShowCancelModal(false);
        navigation.navigate('Appointments');
    };

    return (
        <ScrollView className="bg-white flex-1 px-4">
            {/* Header */}
            <View className="rounded-2xl overflow-hidden bg-gray-100 shadow mt-5">
                <Image source={{ uri: reservation.place.images[0] }} className="w-full h-[200]" resizeMode="cover" />
                <View className="py-4 px-2.5 gap-3">
                    <Text className="text-lg font-bold">{reservation.place.name}</Text>
                    <View className="flex-row items-center gap-2">
                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                        <Text className="text-base font-medium">
                            {reservation.place.address}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                        <Text className="text-base font-medium">
                            {reservation.place.rating} ({reservation.place.reviews.length} avis) $$$
                        </Text>
                    </View>
                </View>
            </View>

            <View key={tab}>
                {tab === 'view' ? (
                    <>
                        {/* Action buttons */}
                        <ScrollView horizontal className="my-6 flex-row">
                            <TouchableOpacity className="btn-small-icon mr-2">
                                <IcoMoonIcon name="calendar" size={20} color="#fff" />
                                <Text className="btn-small-icon-text">Ajouter à mon agenda</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="btn-small-icon mr-2">
                                <IcoMoonIcon name="notifcations" size={20} color="#fff" />
                                <Text className="btn-small-icon-text">Me notifier 1 jour avant</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="btn-small-icon">
                                <IcoMoonIcon name="calendar" size={20} color="#fff" />
                                <Text className="btn-small-icon-text">Itinéraire</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <ReservationSummary
                            people={people}
                            date={isoToFrDisplay(dateISO)}
                            time={time}
                            moment={moment}
                        />

                        <View className="flex-column mt-6 gap-3 mb-4">
                            <TouchableOpacity onPress={() => setTab('edit')} className="btn-primary">
                                <Text className="btn-primary-text">Déplacer ma Réza</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancel} className="btn-black">
                                <Text className="btn-black-text">Annuler ma Réza</Text>
                            </TouchableOpacity>

                            <CancelReservationModal
                                isVisible={showCancelModal}
                                onKeep={() => setShowCancelModal(false)}
                                onCancel={onConfirmCancel}
                            />
                        </View>
                    </>
                ) : (
                    <>
                        {/* Tab Buttons */}
                        <ScrollView horizontal className="flex-row my-6">
                            {['rendezvous', 'menu', 'avis', 'apropos'].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    className={`mr-2 ${activeEditTab === t ? 'btn-small-icon' : 'btn-light-icon'}`}
                                    onPress={() => setActiveEditTab(t)}
                                >
                                    <IcoMoonIcon name={t === 'rendezvous' ? 'time' : t === 'menu' ? 'book' : t === 'avis' ? 'star-solid' : 'info'} size={20} color={`${activeEditTab === t ? '#fff' : '#C53334'}`} />
                                    <Text className={activeEditTab === t ? 'btn-small-icon-text' : 'btn-light-icon-text'}>
                                        {t === 'rendezvous' ? 'Rendez-vous' : t === 'menu' ? 'Menu' : t === 'avis' ? 'Avis' : 'À propos'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Rendez-vous Tab */}
                        {activeEditTab === 'rendezvous' && (
                            <EditReservationForm
                                key={`${people}-${dateISO}-${time}`}
                                initialPeople={people}
                                initialDateISO={dateISO}
                                initialTime={time}
                                availableSlots={reservation.place.available_slots}
                                onConfirm={(p, dISO, t) => {
                                    setPeople(p);
                                    setDateISO(dISO);
                                    setTime(t);
                                    setTab('view');
                                }}
                            />
                        )}
                        {/* Menu Tab */}
                        {activeEditTab === 'menu' && (
                            <View>
                                {reservation.place.menu.map((img: string) => (
                                    <Image key={img} source={{ uri: img }} className="w-full h-[500] rounded-xl mb-3" resizeMode="cover" />
                                ))}
                            </View>
                        )}

                        {/* Avis Tab */}
                        {activeEditTab === 'avis' && (
                            <ReviewSection reviews={reservation.place.reviews} />
                        )}

                        {/* À propos Tab */}
                        {activeEditTab === 'apropos' && (
                            <AboutSection
                                images={reservation.place.images}
                                description={reservation.place.description} />
                        )}
                    </>
                )}
            </View>
        </ScrollView>

    );
};

export default ReservationDetailScreen;
