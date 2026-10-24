import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import AppIcon from '../src/icons/AppIcon';

const BRAND = '#C53334';
const INK = '#16120F';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (isoDate: string) => void;
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
  const todayStr = dayjs().format('YYYY-MM-DD');

  const disabledMap = useMemo(() => {
    return disabledDates.reduce((acc, d) => {
      acc[d] = { disabled: true, disableTouchEvent: true };
      return acc;
    }, {} as Record<string, { disabled: true; disableTouchEvent: true }>);
  }, [disabledDates]);

  const enabledMonths = useMemo(() => {
    const set = new Set<string>();
    const today = dayjs().startOf('day');
    for (let i = 0; i < 365; i++) {
      const d = today.add(i, 'day');
      const key = d.format('YYYY-MM-DD');
      if (!disabledMap[key]) set.add(d.format('YYYY-MM'));
    }
    return set;
  }, [disabledMap]);

  const [currentMonth, setCurrentMonth] = useState(
    dayjs(selectedDate ?? todayStr).format('YYYY-MM'),
  );
  const curMonthDayjs = dayjs(currentMonth + '-01');

  const monthKey = (d: dayjs.Dayjs) => d.format('YYYY-MM');
  const disableLeft = !enabledMonths.has(monthKey(curMonthDayjs.subtract(1, 'month')));
  const disableRight = !enabledMonths.has(monthKey(curMonthDayjs.add(1, 'month')));

  const markedDates = useMemo(
    () => ({
      ...disabledMap,
      ...(selectedDate
        ? {
            [selectedDate]: {
              selected: true,
              selectedColor: BRAND,
              selectedTextColor: '#fff',
            },
          }
        : {}),
    }),
    [disabledMap, selectedDate],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(12,8,6,0.45)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            paddingTop: 16,
            paddingHorizontal: 12,
            paddingBottom: 20,
            width: '90%',
            maxWidth: 420,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 10,
          }}
          onPress={() => {}}
        >
          {visible && (
            <Calendar
              firstDay={1}
              enableSwipeMonths
              hideExtraDays
              monthFormat="MMMM yyyy"
              disableAllTouchEventsForDisabledDays
              markedDates={markedDates}
              disableArrowLeft={disableLeft}
              disableArrowRight={disableRight}
              onPressArrowLeft={(subtractMonth) => {
                if (disableLeft) return;
                subtractMonth();
                setCurrentMonth(monthKey(curMonthDayjs.subtract(1, 'month')));
              }}
              onPressArrowRight={(addMonth) => {
                if (disableRight) return;
                addMonth();
                setCurrentMonth(monthKey(curMonthDayjs.add(1, 'month')));
              }}
              onMonthChange={(d: { dateString?: string; year?: number; month?: number }) => {
                if (d?.dateString) {
                  setCurrentMonth(dayjs(d.dateString).format('YYYY-MM'));
                } else if (d?.year && d?.month) {
                  const ds = `${d.year}-${String(d.month).padStart(2, '0')}-01`;
                  setCurrentMonth(dayjs(ds).format('YYYY-MM'));
                }
              }}
              renderArrow={(direction) => {
                const isDisabled =
                  (direction === 'left' && disableLeft) ||
                  (direction === 'right' && disableRight);
                return (
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isDisabled ? '#F7F5F2' : '#F0EDE9',
                    }}
                  >
                    <AppIcon
                      name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
                      size={18}
                      color={isDisabled ? '#D6D1CB' : INK}
                    />
                  </View>
                );
              }}
              dayComponent={({ date, state }) => {
                if (state === 'disabled' || !date || !date.dateString) {
                  return <View style={{ width: 38, height: 38, margin: 3 }} />;
                }
                const dayStr: string = date.dateString;
                const isDisabled =
                  !!disabledMap[dayStr] || dayjs(dayStr).isBefore(todayStr, 'day');
                const isSelected = dayStr === selectedDate;
                const isToday = dayStr === todayStr;

                let bg = 'transparent', txt = INK, border = 'transparent', weight: '500' | '800' = '500';
                if (isDisabled) { txt = '#CFC9C2'; }
                else if (isSelected) { bg = BRAND; txt = '#fff'; weight = '800'; }
                else if (isToday) { border = BRAND; txt = BRAND; weight = '800'; }

                return (
                  <TouchableOpacity
                    disabled={isDisabled}
                    onPress={() => { if (!isDisabled) { onSelectDate(dayStr); onClose(); } }}
                    style={{
                      width: 38, height: 38, borderRadius: 19,
                      backgroundColor: bg, borderWidth: 1.5, borderColor: border,
                      alignItems: 'center', justifyContent: 'center',
                      marginHorizontal: 3, marginVertical: 3,
                    }}
                  >
                    <Text style={{ color: txt, fontSize: 16, fontWeight: weight }}>
                      {date.day}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              theme={{
                calendarBackground: '#ffffff',
                monthTextColor: INK,
                textMonthFontWeight: '800',
                textMonthFontSize: 19,
                textSectionTitleColor: '#8A8580',
                textDayHeaderFontSize: 13,
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default CustomCalendarModal;
