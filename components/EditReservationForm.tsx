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
    available_slots?: Record<string, { time: string; reserved_by: string | null }[]>;
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
    const [people] = useState(initialPeople || 1); // hide people picker if program-based
    const [dateISO, setDateISO] = useState(initialDateISO);
    const [time, setTime] = useState(initialTime);
    const [showCal, setShowCal] = useState(false);
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
        initialProgramId ?? programs?.[0]?.id ?? null
    );
    const [isSaving, setIsSaving] = useState(false);

    const selectedProgram = programs.find(p => p.id === selectedProgramId);

    const currentSlots = selectedProgram?.available_slots ?? {};

    const freeSlots = useMemo(() => {
        const slots = currentSlots?.[dateISO] ?? [];
        return slots.filter(s => !s.reserved_by).map(s => s.time);
    }, [currentSlots, dateISO]);

    const fullSlotList = useMemo(() => {
        const list = [...freeSlots];
        if (initialTime && !list.includes(initialTime)) list.push(initialTime);

        const now = dayjs();
        const isToday = dayjs(dateISO).isSame(now, 'day');

        if (isToday) {
            const currentHour = now.hour();
            const currentMinute = now.minute();
            return list.filter((slot) => {
                const [slotHour, slotMinute] = slot.split(':').map(Number);
                return slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
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
            const slotsArr = currentSlots?.[key] ?? [];

            const hasFreeUpcomingSlot = slotsArr.some(({ time, reserved_by }) => {
                if (reserved_by !== null) return false;
                if (!d.isSame(today, 'day')) return true;
                const [h, m] = time.split(':').map(Number);
                return h > now.hour() || (h === now.hour() && m > now.minute());
            });

            if (!hasFreeUpcomingSlot) out.push(key);
        }

        return out;
    }, [currentSlots]);

    const formattedDate = isoToFrDisplay(dateISO);

    return (
        <View>
            {/* STEP 1: Choose a program */}
            {!selectedProgramId && (
                <View className="flex-column mb-3">
                    {programs.map((prog) => {
                        const isExpanded = expandedProgramId === prog.id;

                        return (
                            <View
                                key={prog.id}
                                className="rounded-2xl overflow-hidden bg-gray-100 shadow min-h-[60px] mb-3 flex-column justify-center"
                            >
                                <TouchableOpacity
                                    onPress={() => setExpandedProgramId(prev => (prev === prog.id ? null : prog.id))}
                                    className="p-2.5"
                                >
                                    <Text className="text-lg font-bold">{prog.title}</Text>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View className="px-3 pb-4 gap-4">
                                        <Text className="text-lg font-medium">{prog.description}</Text>
                                        <Text className="text-lg">
                                            {prog.price} dh · {prog.duration_minutes} min
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setSelectedProgramId(prog.id)}
                                            className="btn-small-icon self-start"
                                        >
                                            <Text className="btn-small-icon-text">Choisir</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* STEP 2: Show selected program and date/time selector */}
            {selectedProgramId && selectedProgram && (
                <>
                    <Text className="text-lg font-semibold pl-3">Je réserve</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedProgramId(null);
                            setExpandedProgramId(programs?.[0]?.id ?? null);
                            setDateISO(initialDateISO);
                            setTime('');
                        }}
                        className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-4 gap-4 mb-2"
                    >
                        <Text className="text-lg font-bold">{selectedProgram.title}</Text>
                        <Text className="text-lg font-medium">{selectedProgram.description}</Text>
                        <Text className="text-lg">{selectedProgram.price} dh · {selectedProgram.duration_minutes} min</Text>
                    </TouchableOpacity>

                    {/* Date Picker */}
                    <View className="flex-column mb-3">
                        <Text className="text-lg font-semibold pl-3">Pour le</Text>
                        <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                            <TouchableOpacity onPress={() => setShowCal(true)} className="py-5 px-3">
                                <Text className="text-base font-bold text-center">{formattedDate}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Time Picker */}
                    <View className="flex-column">
                        <Text className="text-lg font-semibold pl-3">À</Text>
                        <View className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-3 gap-4">
                            {(['Midi', 'Soir'] as const).map((momentKey) => {
                                const slots = fullSlotList.filter(s =>
                                    momentKey === 'Midi'
                                        ? Number(s.split(':')[0]) < 18
                                        : Number(s.split(':')[0]) >= 18
                                );
                                if (slots.length === 0) return null;

                                return (
                                    <View key={momentKey} className="flex-row items-center gap-4">
                                        <View className="rounded-2xl py-2 px-3 bg-danger">
                                            <Text className="text-base font-semibold text-white">{momentKey}</Text>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {slots.map((slot) => (
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
                            await onConfirm(undefined, dateISO, time, selectedProgram.id);
                            setIsSaving(false);
                        }}
                        disabled={isSaving || !time}
                        className={`btn-primary mt-6 mb-4 ${isSaving || !time ? 'opacity-50' : ''}`}
                    >
                        <Text className="btn-primary-text">{isSaving ? 'Chargement...' : 'Je confirme ma REZA'}</Text>
                    </TouchableOpacity>
                </>
            )}

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
