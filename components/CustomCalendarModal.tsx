import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { Calendar } from 'react-native-calendars';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelectDate: (formattedDate: string) => void;
    selectedDate?: string;
    disabledDates?: string[];
}

const CustomCalendarModal: React.FC<Props> = ({
    visible,
    onClose,
    onSelectDate,
    selectedDate,
    disabledDates = [],
}) => {
    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            useNativeDriver
            hideModalContentWhileAnimating
            backdropOpacity={0.4}
            style={{ justifyContent: 'center', alignItems: 'center' }}
        >
            <View
                style={{
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    paddingTop: 12,
                    paddingHorizontal: 12,
                    paddingBottom: 32,
                    width: '100%',
                }}
            >
                <Calendar
                    firstDay={1}
                    enableSwipeMonths
                    hideExtraDays={true}
                    monthFormat="MMMM yyyy"
                    dayComponent={({ date, state }) => {
                        const dayStr = date.dateString;
                        const isDisabled = disabledDates.includes(dayStr);
                        const isToday = dayStr === todayStr;
                        const isSelected = dayStr === selectedDate;

                        let backgroundColor = '#C53334';
                        let textColor = '#fff';

                        if (isDisabled) {
                            backgroundColor = '#D9D9D9';
                            textColor = '#fff';
                        } else if (isSelected) {
                            backgroundColor = '#000';
                            textColor = '#fff';
                        } else if (isToday) {
                            backgroundColor = '#F7F7F7';
                            textColor = '#C53334';
                        }

                        const handlePress = () => {
                            if (isDisabled) return;
                            const dateObj = new Date(dayStr);
                            const formatted = dateObj.toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            });
                            const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                            onSelectDate(capitalized);
                            onClose();
                        };

                        return (
                            <TouchableOpacity
                                disabled={isDisabled}
                                onPress={handlePress}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginHorizontal: 6,
                                    marginVertical: 6,
                                }}
                            >
                                <Text style={{ color: textColor, fontSize: 16, fontWeight: '400' }}>{date.day}</Text>
                            </TouchableOpacity>
                        );
                    }}
                    theme={{
                        calendarBackground: '#ffffff',
                        textMonthFontWeight: '800',
                        textMonthFontSize: 20,
                        textDayHeaderFontSize: 16,
                        textDayHeaderFontWeight: '400',
                        textDayFontSize: 16,
                    }}
                />
            </View>
        </Modal>
    );
};

export default CustomCalendarModal;
