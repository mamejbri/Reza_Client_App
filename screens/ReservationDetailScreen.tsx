import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Linking, Alert } from 'react-native';
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
import { updateReservation, cancelReservation, addReservation } from '../services/reservations';
import RNCalendarEvents from 'react-native-calendar-events';
import dayjs from 'dayjs';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ReservationDetailScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const { reservation, startInEditMode } = route.params;

    const [tab, setTab] = useState(startInEditMode ? 'edit' : 'view');
    const [activeEditTab, setActiveEditTab] = useState('rendezvous');
    const [people, setPeople] = useState(reservation.people);
    const [dateISO, setDateISO] = useState(reservation.date);
    const [time, setTime] = useState(reservation.time);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const moment = Number(time.split(':')[0]) < 18 ? 'Midi' : 'Soir';

    const handleCancel = () => setShowCancelModal(true);

    const onConfirmCancel = async () => {
        const success = await cancelReservation(
            reservation.id,
            reservation.place.id,
            reservation.date,
            reservation.time,
            reservation.program_id
        );
        if (success) {
            setShowCancelModal(false);
            navigation.navigate('Appointments');
        }
    };

    const addToCalendar = async () => {
        try {
            // Request permission to access calendar
            const permission = await RNCalendarEvents.requestPermissions();
            if (permission !== 'authorized') {
                Alert.alert(
                    'Permission refusée',
                    "L'accès au calendrier est nécessaire pour ajouter l'événement."
                );
                return;
            }

            // Build start and end date in ISO format
            const startDate = dayjs(`${dateISO}T${time}`).toISOString();
            const endDate = reservation.program?.duration_minutes
                ? dayjs(startDate).add(reservation.program.duration_minutes, 'minutes').toISOString()
                : dayjs(startDate).add(40, 'minutes').toISOString();

            // Attempt to save the event to the default calendar
            const eventId = await RNCalendarEvents.saveEvent(
                `Réservation chez ${reservation.place.name}`,
                {
                    startDate,
                    endDate,
                    location: reservation.place.address,
                    notes: reservation.program
                        ? `Programme : ${reservation.program.title}`
                        : `Pour ${people} personne(s)`,
                    calendar: ['default'],
                }
            );

            if (eventId) {
                Alert.alert('Ajouté au calendrier', "Votre réservation a été ajoutée avec succès.");
            } else {
                Alert.alert('Erreur', "L'événement n'a pas pu être ajouté.");
            }
        } catch (error) {
            console.error('Erreur lors de l’ajout au calendrier:', error);
            Alert.alert('Erreur', "Une erreur s'est produite lors de l'ajout à votre calendrier.");
        }
    };


    const openInMaps = () => {
        const coords = `${reservation.place.location.lat},${reservation.place.location.lng}`;
        const label = encodeURIComponent(reservation.place.name);
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const url =
            Platform.OS === 'ios'
                ? `${scheme}//?q=${label}&ll=${coords}`
                : `${scheme}0,0?q=${coords}(${label})`;
        Linking.openURL(url);
    };

    return (
        <ScrollView className="bg-white flex-1 px-4">
            {/* Header */}
            <View className="rounded-2xl overflow-hidden bg-gray-100 shadow mt-5">
                <Image
                    source={{ uri: reservation.place.images[0] }}
                    className="w-full h-[200]"
                    resizeMode="cover"
                />
                <View className="py-4 px-2.5 gap-3">
                    <Text className="text-lg font-bold">{reservation.place.name}</Text>
                    <View className="flex-row items-center gap-2">
                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                        <Text className="text-base font-medium">
                            {reservation.place.address}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <IcoMoonIcon name="star-solid" size={24} color="#C53334" />
                        <Text className="text-base font-medium">
                            {reservation.place.rating} ({reservation.place.reviews.length} avis) $$$
                        </Text>
                    </View>
                </View>
            </View>

            <View key={tab}>
                {tab === 'view' ? (
                    <>
                        {/* Action Buttons */}
                        <ScrollView horizontal className="my-6 flex-row">
                            <TouchableOpacity onPress={addToCalendar} className="btn-small-icon mr-2">
                                <IcoMoonIcon name="calendar" size={20} color="#fff" />
                                <Text className="btn-small-icon-text">Ajouter à mon agenda</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="btn-small-icon mr-2">
                                <IcoMoonIcon name="notifcations" size={20} color="#fff" />
                                <Text className="btn-small-icon-text">Me notifier 1 jour avant</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={openInMaps} className="btn-small-icon">
                                <IcoMoonIcon name="calendar" size={20} color="#fff" />
                                <Text className="btn-small-icon-text">Itinéraire</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <ReservationSummary
                            people={reservation.program ? undefined : people}
                            program={reservation.program}
                            date={isoToFrDisplay(dateISO)}
                            time={time}
                            moment={moment}
                        />

                        <View className="flex-column mt-6 gap-3 mb-4">
                            {reservation.status !== 'confirmed' && (
                                <TouchableOpacity onPress={() => setTab('edit')} className="btn-primary">
                                    <Text className="btn-primary-text">Déplacer ma Réza</Text>
                                </TouchableOpacity>
                            )}
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
                                    <IcoMoonIcon
                                        name={
                                            t === 'rendezvous'
                                                ? 'time'
                                                : t === 'menu'
                                                    ? 'book'
                                                    : t === 'avis'
                                                        ? 'star-solid'
                                                        : 'info'
                                        }
                                        size={20}
                                        color={activeEditTab === t ? '#fff' : '#C53334'}
                                    />
                                    <Text className={activeEditTab === t ? 'btn-small-icon-text' : 'btn-light-icon-text'}>
                                        {t === 'rendezvous'
                                            ? 'Rendez-vous'
                                            : t === 'menu'
                                                ? 'Menu'
                                                : t === 'avis'
                                                    ? 'Avis'
                                                    : 'À propos'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Rendez-vous Tab */}
                        {activeEditTab === 'rendezvous' && (
                            <EditReservationForm
                                key={`${people}-${dateISO}-${time}-${reservation.program_id || ''}`}
                                initialPeople={people}
                                initialDateISO={dateISO}
                                initialTime={time}
                                availableSlots={reservation.place.available_slots}
                                programs={reservation.place.programs}
                                initialProgramId={reservation.program_id}
                                onConfirm={async (p, dISO, t, programId) => {
                                    let success = false;

                                    if (reservation.id === 'new') {
                                        const newRes = await addReservation(
                                            reservation.place.id,
                                            dISO,
                                            t,
                                            p,
                                            programId
                                        );
                                        success = !!newRes;

                                        if (newRes) {
                                            reservation.id = newRes.id;
                                            reservation.date = newRes.date;
                                            reservation.time = newRes.time;
                                            reservation.people = newRes.people;
                                            reservation.status = newRes.status;
                                            reservation.program_id = newRes.program_id;
                                            reservation.program = programId
                                                ? reservation.place.programs.find(pr => pr.id === programId)
                                                : undefined;
                                        }
                                    } else {
                                        success = await updateReservation(
                                            reservation.id,
                                            reservation.place.id,
                                            dateISO,
                                            time,
                                            dISO,
                                            t,
                                            p,
                                            programId
                                        );

                                        if (success) {
                                            reservation.date = dISO;
                                            reservation.time = t;
                                            reservation.people = p;
                                            reservation.program_id = programId ?? reservation.program_id;
                                            reservation.program = programId
                                                ? reservation.place.programs.find(pr => pr.id === programId)
                                                : undefined;
                                        }
                                    }

                                    if (success) {
                                        setPeople(p ?? people);
                                        setDateISO(dISO);
                                        setTime(t);
                                        setTab('view');
                                    } else {
                                        console.warn('Failed to save reservation');
                                    }
                                }}
                            />
                        )}
                        {/* Menu Tab */}
                        {activeEditTab === 'menu' && (
                            <View>
                                {reservation.place.menu.map((img: string) => (
                                    <Image
                                        key={img}
                                        source={{ uri: img }}
                                        className="w-full h-[500] rounded-xl mb-3"
                                        resizeMode="cover"
                                    />
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
                                description={reservation.place.description}
                            />
                        )}
                    </>
                )}
            </View>
        </ScrollView>
    );
};

export default ReservationDetailScreen;
