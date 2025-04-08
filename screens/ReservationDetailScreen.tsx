import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import CustomCalendarModal from '../components/CustomCalendarModal';
import CancelReservationModal from '../components/CancelReservationModal';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ReservationDetailScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const { reservation } = route.params;
    const [tab, setTab] = useState('view'); // 'view' or 'edit'
    const [activeEditTab, setActiveEditTab] = useState('rendezvous');

    const [people, setPeople] = useState(2);
    const [date, setDate] = useState('Lundi. 7 fev 2025');
    const [time, setTime] = useState('13:30');
    const [moment, setMoment] = useState('Midi');
    const [showCalendar, setShowCalendar] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const [userRating, setUserRating] = useState(4);
    const [editingComment, setEditingComment] = useState(false);
    const [userComment, setUserComment] = useState('');

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
                <Image source={reservation.image} className="w-full h-[200]" resizeMode="cover" />
                <View className="py-4 px-2.5 gap-3">
                    <Text className="text-lg font-bold">{reservation.name}</Text>
                    <View className="flex-row items-center gap-2">
                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                        <Text className="text-base font-medium">
                            {reservation.address}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <IcoMoonIcon name="location" size={24} color="#C53334" />
                        <Text className="text-base font-medium">
                            4.6 (2 766 avis) $$$
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

                        <View className="flex-column mb-3">
                            <Text className="text-lg font-semibold pl-3">J'ai réservé pour</Text>
                            <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                                <View className="py-5 px-3 gap-3">
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-base font-bold flex-grow">Nombre de personnes :</Text>
                                        <View className="bg-white w-[40] h-[40] p-2 flex-row align-center justify-center">
                                            <Text className="text-xl font-bold">{people}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View className="flex-column mb-3">
                            <Text className="text-lg font-semibold pl-3">Pour le</Text>
                            <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                                <View className="py-5 px-3 gap-3">
                                    <View className="flex-row items-center justify-center gap-2">
                                        <Text className="text-base font-bold">{date}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View className="flex-column">
                            <Text className="text-lg font-semibold pl-3">À</Text>
                            <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                                <View className="py-5 px-3 gap-3">
                                    <View className="flex-row items-center gap-4">
                                        <View className="bg-danger rounded-2xl py-2 px-3">
                                            <Text className="text-base font-semibold text-white">{moment}</Text>
                                        </View>
                                        <View className="bg-white rounded-2xl py-2 px-3 flex-grow flex-row items-center justify-center">
                                            <Text className="text-base font-semibold">{time}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

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
                            <View>
                                <View className="flex-column mb-3">
                                    <Text className="text-lg font-semibold pl-3">Je réserve ma place</Text>
                                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                                        <View className="py-5 px-3 gap-3">
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-base font-bold flex-grow">Nombre de personnes :</Text>
                                                <View className="flex-row items-center gap-2">
                                                    <TouchableOpacity className="btn-smallest-icon" onPress={() => setPeople(p => Math.max(1, p - 1))}>
                                                        <Text className="text-white text-xl">-</Text>
                                                    </TouchableOpacity>
                                                    <View className="bg-white w-[40] h-[40] p-2 flex-row align-center justify-center">
                                                        <Text className="text-xl font-bold">{people}</Text>
                                                    </View>
                                                    <TouchableOpacity className="btn-smallest-icon" onPress={() => setPeople(p => p + 1)}>
                                                        <Text className="text-white text-xl">+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View className="flex-column mb-3">
                                    <Text className="text-lg font-semibold pl-3">Pour le</Text>
                                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                                        <View className="py-5 px-3 gap-3">
                                            <View className="flex-row items-center justify-center gap-2">
                                                <TouchableOpacity onPress={() => setShowCalendar(true)}>
                                                    <Text className="text-base font-bold">{date}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View className="flex-column">
                                    <Text className="text-lg font-semibold pl-3">À</Text>
                                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                                        <View className="py-5 px-3 gap-3">
                                            <View className="flex-row items-center gap-4 mb-4">
                                                <View className="rounded-2xl py-2 px-3 bg-danger">
                                                    <Text className="text-base font-semibold text-white">Midi</Text>
                                                </View>
                                                <ScrollView horizontal className="flex-row">
                                                    {['12:00', '12:30', '13:30', '13:40'].map(h => (
                                                        <TouchableOpacity
                                                            key={h}
                                                            onPress={() => { setTime(h); setMoment('Midi'); }}
                                                            className={`rounded-2xl py-2 px-3 flex-grow flex-row items-center justify-center mr-2 ${time === h && moment === 'Midi' ? 'bg-danger' : 'bg-white'}`}
                                                        >
                                                            <Text className={`text-base font-semibold ${time === h && moment === 'Midi' ? 'text-white' : 'text-black'}`}>{h}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>

                                            {/* Soir Time Slots */}
                                            <View className="flex-row items-center gap-4">
                                                <View className="rounded-2xl py-2 px-3 bg-danger">
                                                    <Text className="text-base font-semibold text-white">Soir</Text>
                                                </View>
                                                <ScrollView horizontal className="flex-row">
                                                    {['19:30', '20:30', '21:30', '22:15'].map(h => (
                                                        <TouchableOpacity
                                                            key={h}
                                                            onPress={() => { setTime(h); setMoment('Soir'); }}
                                                            className={`rounded-2xl py-2 px-3 flex-grow flex-row items-center justify-center mr-2 ${time === h && moment === 'Soir' ? 'bg-danger' : 'bg-white'}`}
                                                        >
                                                            <Text className={`text-base font-semibold ${time === h && moment === 'Soir' ? 'text-white' : 'text-black'}`}>{h}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity onPress={() => setTab('view')} className="btn-primary mt-6">
                                    <Text className="btn-primary-text">Je confirme ma REZA</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Menu Tab */}
                        {activeEditTab === 'menu' && (
                            <View>
                                <Image source={require('../assets/images/menu.png')} className="w-full rounded-xl" />
                            </View>
                        )}

                        {/* Avis Tab */}
                        {activeEditTab === 'avis' && (
                            <View className="mt-2 mb-6">
                                {/* User Review Section */}
                                <View className="bg-gray-100 rounded-2xl p-2.5 mb-9">
                                    <View className="py-4">
                                        <View className="flex-row items-center mb-4">
                                            <Image source={require('../assets/images/avatar.png')} className="w-[54] h-[54] rounded-full" />
                                            <View className="flex-1 ml-5">
                                                <Text className="font-medium text-base mb-2">Alicia</Text>
                                                <View className="flex-row gap-1">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <TouchableOpacity key={i} onPress={() => setUserRating(i)}>
                                                            <IcoMoonIcon
                                                                name="star-solid"
                                                                size={20}
                                                                color={i <= userRating ? '#e11d48' : '#d1d5db'}
                                                            />
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                        {editingComment ? (
                                            <TextInput
                                                multiline
                                                value={userComment}
                                                onChangeText={setUserComment}
                                                className="border border-gray-300 rounded-lg p-2 h-24 text-gray-800"
                                                placeholder="Je rédige mon avis"
                                            />
                                        ) : (
                                            <TouchableOpacity className="flex-row items-center px-4" onPress={() => setEditingComment(true)}>
                                                <Text className="flex-grow">Je rédige mon avis</Text>
                                                <IcoMoonIcon name="pen" size={20} color="#000" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {/* Reviews Count */}
                                <View className="flex-row align-center gap-2 mb-5">
                                    <IcoMoonIcon
                                        name="star-solid"
                                        size={20}
                                        color="#e11d48"
                                    />
                                    <Text className="font-semibold text-lg">146 avis</Text>
                                </View>

                                {/* Previous Reviews */}
                                {[
                                    {
                                        id: '1',
                                        name: 'Alicia',
                                        comment: '“Une expérience culinaire inoubliable !\nNous avons découvert [Nom du restaurant] par hasard, et quelle belle surprise !\nL’accueil chaleureux, le cadre soigné et surtout les plats délicieux nous ont conquis.”',
                                        rating: 4
                                    },
                                    {
                                        id: '2',
                                        name: 'Alicia',
                                        comment: '“Une expérience culinaire inoubliable !\nNous avons découvert [Nom du restaurant] par hasard, et quelle belle surprise !\nL’accueil chaleureux, le cadre soigné et surtout les plats délicieux nous ont conquis.”',
                                        rating: 4
                                    }
                                ].map(item => (
                                    <View key={item.id} className="bg-gray-100 rounded-2xl p-2.5 mb-4">
                                        <View className="py-4">
                                            <View className="flex-row items-center mb-2.5">
                                                <Image source={require('../assets/images/avatar.png')} className="w-[54] h-[54] rounded-full" />
                                                <View className="ml-5">
                                                    <Text className="font-medium text-base mb-2">{item.name}</Text>
                                                    <View className="flex-row gap-1">
                                                        {[1, 2, 3, 4].map(i => (
                                                            <IcoMoonIcon
                                                                key={i}
                                                                name="star-solid"
                                                                size={20}
                                                                color={i <= item.rating ? '#e11d48' : '#d1d5db'}
                                                            />
                                                        ))}
                                                    </View>
                                                </View>
                                            </View>
                                            <Text className="italic font-light">{item.comment}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* À propos Tab */}
                        {activeEditTab === 'apropos' && (
                            <View className="pb-4">
                                <ScrollView horizontal className="flex-row mb-9">
                                    <Image source={require('../assets/images/info1.png')} className="w-[335] h-[195] rounded-xl mr-4" />
                                    <Image source={require('../assets/images/info2.png')} className="w-[335] h-[195] rounded-xl mr-4" />
                                </ScrollView>
                                <Text className="text-lg font-semibold pl-3 mb-6">À propos de nous</Text>
                                <Text className="text-base font-bold mb-4">
                                    Bienvenue chez [Nom du restaurant], là où la passion pour la cuisine rencontre l’art de recevoir.
                                </Text>
                                <Text className="text-base mb-4">
                                    Situé au cœur de [nom de la ville/quartier], notre établissement vous invite à découvrir une expérience culinaire authentique dans un cadre chaleureux et raffiné. Chez nous, chaque plat raconte une histoire, un mélange de tradition et de modernité, préparé avec des produits frais et de saison, soigneusement sélectionnés auprès de producteurs locaux.
                                </Text>
                                <Text className="text-base mb-4">
                                    Que vous soyez amateur de [type de cuisine : cuisine française, méditerranéenne, gastronomique, etc.] ou curieux de nouvelles saveurs, notre carte variée saura éveiller vos papilles. Laissez-vous tenter par nos spécialités, comme [nom d’un plat signature], ou encore par nos desserts maison, une véritable douceur en fin de repas.
                                </Text>
                                <Text className="text-base mb-4">
                                    Notre équipe, attentive et souriante, est là pour faire de votre visite un moment unique. Que ce soit pour un dîner romantique, un déjeuner en famille ou une soirée entre amis, [Nom du restaurant] est l’endroit idéal pour se retrouver et partager un repas mémorable.
                                </Text>
                                <Text className="text-base">
                                    Réservez dès maintenant et venez vivre une aventure gustative qui éveillera tous vos sens. À très bientôt chez [Nom du restaurant] !
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            <CustomCalendarModal
                visible={showCalendar}
                onClose={() => setShowCalendar(false)}
                onSelectDate={(newDate) => setDate(newDate)}
                selectedDate="2025-04-02" // format: YYYY-MM-DD
                disabledDates={['2025-04-08', '2025-04-15']} // fully booked dates
            />

        </ScrollView>

    );
};

export default ReservationDetailScreen;
