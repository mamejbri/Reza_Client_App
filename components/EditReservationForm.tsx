import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
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

interface Moyen {
    moyen_id?: string;
    id?: string;
    programs: Program[];
}

interface Props {
    initialPeople?: number;
    initialDateISO: string;
    initialTime: string;
    availableSlots: Record<string, { time: string; reserved_by: string | null }[]>;
    programs?: Program[];
    moyens?: Moyen[];
    globalMoyens?: { id: string; name: string; image: string }[];
    initialProgramId?: string;
    initialMoyenId?: string | null;
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
    moyens = [],
    globalMoyens = [],
    initialProgramId,
    initialMoyenId = null,
    onConfirm,
}) => {
    const [people, setPeople] = useState(initialPeople || 2);
    const [dateISO, setDateISO] = useState(initialDateISO);
    const [time, setTime] = useState(initialTime);
    const [showCal, setShowCal] = useState(false);
    const [selectedMoyenId, setSelectedMoyenId] = useState<string | null>(
        initialMoyenId
    );
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(initialProgramId ?? null);

    const [isSaving, setIsSaving] = useState(false);

    const isRestaurant = moyens.length === 0 && programs.length === 0;
    const isBeauté = moyens.length === 0 && programs.length > 0;
    const isActivite = moyens.length > 0;

    const displayMoyens = useMemo(() => {
        if (!isActivite) return [];
        return moyens.map((m) => {
            const key = m.moyen_id ?? m.id ?? '';
            const match = globalMoyens.find((g) => g.id === key);
            return { id: key, name: match?.name ?? key, image: match?.image, programs: m.programs };
        });
    }, [moyens, globalMoyens, isActivite]);

    const allPrograms = useMemo(() => {
        if (isBeauté) return programs;
        if (isActivite && selectedMoyenId) {
            return displayMoyens.find((m) => m.id === selectedMoyenId)?.programs ?? [];
        }
        return [];
    }, [isBeauté, isActivite, selectedMoyenId, programs, displayMoyens]);

    const selectedProgram = isRestaurant
        ? null
        : allPrograms.find((p) => p.id === selectedProgramId) ?? null;

    const currentSlots =
        (isRestaurant ? availableSlots : selectedProgram?.available_slots) ?? {};

    const freeSlots = useMemo(() => {
        const slots = currentSlots?.[dateISO] ?? [];
        return slots.filter((s) => !s.reserved_by).map((s) => s.time);
    }, [currentSlots, dateISO]);

    const fullSlotList = useMemo(() => {
        const list = [...freeSlots];
        if (initialTime && !list.includes(initialTime)) list.push(initialTime);
        const now = dayjs();
        if (dayjs(dateISO).isSame(now, 'day')) {
            const h = now.hour();
            const m = now.minute();
            return list.filter((slot) => {
                const [sh, sm] = slot.split(':').map(Number);
                return sh > h || (sh === h && sm > m);
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
            const arr = currentSlots?.[key] ?? [];
            const ok = arr.some(({ time, reserved_by }) => {
                if (reserved_by !== null) return false;
                if (!d.isSame(today, 'day')) return true;
                const [h, m] = time.split(':').map(Number);
                return h > now.hour() || (h === now.hour() && m > now.minute());
            });
            if (!ok) out.push(key);
        }
        return out;
    }, [currentSlots]);

    const formattedDate = isoToFrDisplay(dateISO);

    const handleConfirmClick = async () => {
        setIsSaving(true);
        try {
            await onConfirm(
                isRestaurant || isActivite ? people : undefined,
                dateISO,
                time,
                selectedProgramId ?? undefined
            );

            if (isActivite) {
                setTimeout(() => {
                    setSelectedProgramId(null);
                    setExpandedProgramId(null);
                    setSelectedMoyenId(null);
                    setDateISO(initialDateISO);
                    setTime('');
                }, 300);
            }
        } catch (err) {
            console.error('Error confirming:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View>
            {isRestaurant && (
                <View className="flex-column mb-3">
                    <Text className="text-lg font-semibold pl-3">Je réserve ma place</Text>
                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-3 gap-3">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-base font-bold">Nombre de personnes :</Text>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity className="btn-smallest-icon" onPress={() => setPeople((p) => Math.max(1, p - 1))}>
                                    <Text className="text-white text-xl">-</Text>
                                </TouchableOpacity>
                                <View className="bg-white w-[40] h-[40] p-2 flex-row align-center justify-center">
                                    <Text className="text-xl font-bold">{people}</Text>
                                </View>
                                <TouchableOpacity className="btn-smallest-icon" onPress={() => setPeople((p) => p + 1)}>
                                    <Text className="text-white text-xl">+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {!selectedMoyenId && isActivite && (
                <View className="mb-4">
                    <Text className="text-lg font-semibold pl-3 mb-3">Je choisi le moyen</Text>
                    <View className="flex-row flex-wrap justify-between px-3">
                        {displayMoyens.map((m) => (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => {
                                    setSelectedMoyenId(m.id);
                                    const firstProgram = m.programs?.[0];
                                    setExpandedProgramId(firstProgram?.id ?? null);
                                    setSelectedProgramId(null);
                                }}
                                className="w-[48%] h-[151px] mb-4 rounded-2xl overflow-hidden"
                                style={{ backgroundColor: '#ccc' }} // fallback background before image loads
                            >
                                {m.image ? (
                                    <Image
                                        source={{ uri: m.image }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : null}
                                <View className="absolute inset-0 bg-black/30 items-center justify-center">
                                    <Text className="text-white font-bold text-[18px]">{m.name}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {!selectedProgramId && allPrograms.length > 0 && (
                <View className="flex-column mb-3">
                    {allPrograms.map((prog) => {
                        const isExpanded = expandedProgramId === prog.id;
                        const isSelected = selectedProgramId === prog.id;

                        return (
                            <View
                                key={prog.id}
                                className={`rounded-2xl overflow-hidden bg-gray-100 shadow min-h-[60px] mb-3 flex-column justify-center ${isSelected ? 'border-2 border-danger' : 'border border-transparent'}`}
                            >
                                <TouchableOpacity
                                    onPress={() => setExpandedProgramId((prev) => (prev === prog.id ? null : prog.id))}
                                    className="p-2.5"
                                >
                                    <Text className="text-lg font-bold">{prog.title}</Text>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View className="px-3 pb-4 gap-4">
                                        <Text className="text-lg font-medium">{prog.description}</Text>
                                        <Text className="text-lg">{prog.price} dh · {prog.duration_minutes} min</Text>
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
            )}

            {(isRestaurant || selectedProgramId) && (
                <>
                    {selectedProgramId && selectedProgram && (
                        <>
                            <Text className="text-lg font-semibold pl-3">Je réserve</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedProgramId(null);
                                    setExpandedProgramId(allPrograms?.[0]?.id ?? null);
                                    setSelectedMoyenId(null);
                                    setDateISO(initialDateISO);
                                    setTime('');
                                }}
                                className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-4 gap-4 mb-2"
                            >
                                <Text className="text-lg font-bold">{selectedProgram.title}</Text>
                                <Text className="text-lg font-medium">{selectedProgram.description}</Text>
                                <Text className="text-lg">{selectedProgram.price} dh · {selectedProgram.duration_minutes} min</Text>
                            </TouchableOpacity>

                            {isActivite && selectedProgramId && (
                                <View className="flex-column mb-3">
                                    <Text className="text-lg font-semibold pl-3">Je réserve ma place</Text>
                                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-3 gap-3">
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-base font-bold">Nombre de personnes :</Text>
                                            <View className="flex-row items-center gap-2">
                                                <TouchableOpacity className="btn-smallest-icon" onPress={() => setPeople((p) => Math.max(1, p - 1))}>
                                                    <Text className="text-white text-xl">-</Text>
                                                </TouchableOpacity>
                                                <View className="bg-white w-[40] h-[40] p-2 flex-row align-center justify-center">
                                                    <Text className="text-xl font-bold">{people}</Text>
                                                </View>
                                                <TouchableOpacity className="btn-smallest-icon" onPress={() => setPeople((p) => p + 1)}>
                                                    <Text className="text-white text-xl">+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </>
                    )}

                    <View className="flex-column mb-3">
                        <Text className="text-lg font-semibold pl-3">Pour le</Text>
                        <View className="rounded-2xl overflow-hidden bg-gray-100 shadow">
                            <TouchableOpacity onPress={() => setShowCal(true)} className="py-5 px-3">
                                <Text className="text-base font-bold text-center">{formattedDate}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-column">
                        <Text className="text-lg font-semibold pl-3">À</Text>
                        <View className="rounded-2xl overflow-hidden bg-gray-100 shadow py-5 px-3 gap-4">
                            {(['Midi', 'Soir'] as const).map((momentKey) => {
                                const slots = fullSlotList.filter((s) =>
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
                                                    className={`rounded-2xl py-2 px-3 mr-2 ${time === slot ? 'bg-danger' : 'bg-white'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-base font-semibold ${time === slot ? 'text-white' : 'text-black'
                                                            }`}
                                                    >
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

                    <TouchableOpacity
                        onPress={handleConfirmClick}
                        disabled={isSaving || !time}
                        className={`btn-primary mt-6 mb-4 ${isSaving || !time ? 'opacity-50' : ''}`}
                    >
                        <Text className="btn-primary-text">
                            {isSaving ? 'Chargement...' : 'Je confirme ma REZA'}
                        </Text>
                    </TouchableOpacity>
                </>
            )}

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
