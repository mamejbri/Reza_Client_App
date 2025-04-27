import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { toISO, isoToFrDisplay } from '../utils/date';
import CustomCalendarModal from './CustomCalendarModal';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

interface Program {
    id: string;
    title: string;
    description: string;
    price: number;
    duration_minutes: number;
}

interface Props {
    initialPeople?: number;
    initialDateISO: string;
    initialTime: string;
    availableSlots: Record<string, { time: string; reserved_by: string | null }[]>;
    programs?: Program[];
    initialProgramId?: string;
    onConfirm: (
        people: number | undefined,
        dateISO: string,
        time: string,
        programId?: string
    ) => Promise<void>;
}

const EditReservationForm: React.FC<Props> = ({
    initialPeople,
    initialDateISO,
    initialTime,
    availableSlots,
    programs = [],
    initialProgramId,
    onConfirm,
}) => {
    const [people, setPeople] = useState(initialPeople || 1);
    const [dateISO, setDateISO] = useState(initialDateISO);
    const [time, setTime] = useState(initialTime);
    const [showCal, setShowCal] = useState(false);
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
        initialProgramId ?? programs?.[0]?.id ?? null
    );
    const [isSaving, setIsSaving] = useState(false);

    const isProgramBased = programs.length > 0;

    const freeSlots = useMemo(() => {
        const slots = availableSlots?.[dateISO] ?? [];
        return slots.filter(s => !s.reserved_by).map(s => s.time);
    }, [availableSlots, dateISO]);

    const fullSlotList = useMemo(() => {
        const list = freeSlots.slice();
        if (initialTime && !list.includes(initialTime)) list.push(initialTime);

        const now = dayjs();
        const isToday = dayjs(dateISO).isSame(now, 'day');

        if (isToday) {
            const currentHour = now.hour();
            const currentMinute = now.minute();
            return list.filter((slot) => {
                const [slotHour, slotMinute] = slot.split(':').map(Number);
                if (slotHour > currentHour) return true;
                if (slotHour === currentHour && slotMinute > currentMinute) return true;
                return false;
            });
        }

        return list;
    }, [freeSlots, initialTime, dateISO]);

    const disabledDates = useMemo(() => {
        const RANGE = 365;
        const today = dayjs().startOf('day');
        const now = dayjs();
        const out: string[] = [];

        for (let i = 0; i < RANGE; i++) {
            const d = today.add(i, 'day');
            const key = d.format('YYYY-MM-DD');
            const slotsArr = availableSlots?.[key] ?? [];

            const hasFreeUpcomingSlot = slotsArr.some(({ time, reserved_by }) => {
                if (reserved_by !== null) return false;
                if (!d.isSame(today, 'day')) return true;
                const [h, m] = time.split(':').map(Number);
                return h > now.hour() || (h === now.hour() && m > now.minute());
            });

            if (!hasFreeUpcomingSlot) out.push(key);
        }

        return out;
    }, [availableSlots]);




    const formattedDate = isoToFrDisplay(dateISO);

    return (
        <View>
            {/* Either Program Picker or People Counter */}
            {isProgramBased ? (
                <View className="flex-column mb-3">
                    <Text className="text-lg font-semibold pl-3">Choisir un programme</Text>
                    {programs.map((prog) => {
                        const isExpanded = expandedProgramId === prog.id;
                        const isSelected = selectedProgramId === prog.id;

                        return (
                            <View
                                key={prog.id}
                                className={`rounded-2xl overflow-hidden bg-gray-100 shadow min-h-[60px] mb-3 flex-column justify-center ${isSelected ? 'border-2 border-danger' : 'border border-transparent'
                                    }`}
                            >
                                {/* Header */}
                                <TouchableOpacity
                                    onPress={() => setExpandedProgramId(prev => (prev === prog.id ? null : prog.id))}
                                    className="p-2.5"
                                >
                                    <Text className="text-lg font-bold">{prog.title}</Text>
                                </TouchableOpacity>

                                {/* Body */}
                                {isExpanded && (
                                    <View className="px-3 pb-4 gap-4">
                                        <Text className="text-lg font-medium">{prog.description}</Text>
                                        <Text className="text-lg">
                                            {prog.price} dh · {prog.duration_minutes} min
                                        </Text>

                                        {!isSelected && (
                                            <TouchableOpacity
                                                accessibilityRole="button"
                                                onPress={() => {
                                                    setSelectedProgramId(prog.id);
                                                    setExpandedProgramId(prog.id);
                                                }}
                                                className="btn-small-icon self-start"
                                            >
                                                <Text className="btn-small-icon-text">Choisir</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View className="flex-column mb-3">
                    <Text className="text-lg font-semibold pl-3">Je réserve ma place</Text>
                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-3 gap-3">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-base font-bold">Nombre de personnes :</Text>
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
            )}

            {/* Date Picker */}
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

            {/* Time Selection */}
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

            {/* Confirm Button */}
            <TouchableOpacity
                onPress={async () => {
                    setIsSaving(true);
                    await onConfirm(isProgramBased ? undefined : people, dateISO, time, selectedProgramId ?? undefined);
                    setIsSaving(false);
                }}
                disabled={isSaving || !time || (isProgramBased && !selectedProgramId)}
                className={`btn-primary mt-6 mb-4 ${isSaving || !time || (isProgramBased && !selectedProgramId) ? 'opacity-50' : ''}`} >
                <Text className="btn-primary-text">{isSaving ? 'Chargement...' : 'Je confirme ma REZA'}</Text>
            </TouchableOpacity>

            {/* Calendar Modal */}
            <CustomCalendarModal
                visible={showCal}
                onClose={() => setShowCal(false)}
                onSelectDate={(frString) => {
                    const iso = toISO(frString);
                    if (!iso) return;
                    setDateISO(iso);
                    setTime('');
                }}
                selectedDate={dateISO}
                disabledDates={disabledDates}
            />
        </View>
    );
};

export default EditReservationForm;
