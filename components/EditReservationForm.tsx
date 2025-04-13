import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import 'dayjs/locale/fr';
import { toISO, isoToFrDisplay } from '../utils/date';
import CustomCalendarModal from './CustomCalendarModal';

interface Props {
    initialPeople: number;
    initialDateISO: string;
    initialTime: string;
    availableSlots: Record<string, { time: string; reserved_by: string | null }[]>;
    onConfirm: (people: number, dateISO: string, time: string) => void;
}

const EditReservationForm: React.FC<Props> = ({
    initialPeople,
    initialDateISO,
    initialTime,
    availableSlots,
    onConfirm,
}) => {
    const [people, setPeople] = useState(initialPeople);
    const [dateISO, setDateISO] = useState(initialDateISO);
    const [time, setTime] = useState(initialTime);
    const [showCal, setShowCal] = useState(false);

    const freeSlots = useMemo(() => {
        const slots = availableSlots[dateISO] || [];
        return slots.filter(s => !s.reserved_by).map(s => s.time);
    }, [availableSlots, dateISO]);

    const fullSlotList = useMemo(() => {
        const list = freeSlots.slice();
        if (initialTime && !list.includes(initialTime)) list.push(initialTime);
        return list;
    }, [freeSlots, initialTime]);

    const formattedDate = isoToFrDisplay(dateISO);

    return (
        <View>
            {/* People */}
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

            {/* Date */}
            <View className="flex-column mb-3">
                <Text className="text-lg font-semibold pl-3">Pour le</Text>
                <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                    <View className="py-5 px-3 gap-3">
                        <TouchableOpacity onPress={() => setShowCal(true)}>
                            <Text className="text-base font-bold text-center">{formattedDate}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Time */}
            <View className="flex-column">
                <Text className="text-lg font-semibold pl-3">À</Text>
                <View className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-3 gap-4">
                    {(['Midi', 'Soir'] as const).map((momentKey) => {
                        const slotsForMoment = fullSlotList.filter(s =>
                            momentKey === 'Midi'
                                ? Number(s.split(':')[0]) < 18
                                : Number(s.split(':')[0]) >= 18
                        );

                        if (slotsForMoment.length === 0) return null;

                        return (
                            <View key={momentKey} className="flex-row items-center gap-4">
                                <View className="rounded-2xl py-2 px-3 bg-danger">
                                    <Text className="text-base font-semibold text-white">{momentKey}</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {slotsForMoment.map((slot) => (
                                        <TouchableOpacity
                                            key={slot}
                                            onPress={() => setTime(slot)}
                                            className={`rounded-2xl py-2 px-3 mr-2 ${time === slot ? 'bg-danger' : 'bg-white'}`}
                                        >
                                            <Text className={`text-base font-semibold ${time === slot ? 'text-white' : 'text-black'}`}>
                                                {slot}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Confirm */}
            <TouchableOpacity
                onPress={() => onConfirm(people, dateISO, time)}
                className="btn-primary mt-6 mb-4"
                disabled={!time} >
                <Text className="btn-primary-text">Je confirme ma REZA</Text>
            </TouchableOpacity>

            {/* Calendar Modal */}
            <CustomCalendarModal
                visible={showCal}
                onClose={() => setShowCal(false)}
                onSelectDate={(frString) => {
                    const iso = toISO(frString);
                    if (!iso) return;
                    setDateISO(iso);
                }}

                selectedDate={dateISO}
                disabledDates={Object.entries(availableSlots)
                    .filter(([, slots]) => slots.every(s => s.reserved_by))
                    .map(([d]) => d)}
            />
        </View>
    );
};

export default EditReservationForm;
