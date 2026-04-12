import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { useLanguage } from '../i18n/LanguageContext';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  appointmentDates?: Set<string>; // dates that have appointments (dot indicators)
}

function getMonthYear(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (lang === 'ar') {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonthDays(dateStr: string): string[][] {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  // Fill leading days from previous month
  const prevMonthLast = new Date(year, month, 0); // last day of prev month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = new Date(prevMonthLast);
    day.setDate(prevMonthLast.getDate() - i);
    currentWeek.push(toDateStr(day));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day);
    currentWeek.push(toDateStr(dateObj));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill trailing days from next month
  if (currentWeek.length > 0) {
    let nextDay = 1;
    while (currentWeek.length < 7) {
      const dateObj = new Date(year, month + 1, nextDay++);
      currentWeek.push(toDateStr(dateObj));
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function getMonth(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getMonth();
}

export default function DatePicker({ selectedDate, onSelectDate, appointmentDates }: DatePickerProps) {
  const { t, language, isRTL } = useLanguage();

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  // Get current view month from selectedDate
  const viewDate = selectedDate || new Date().toISOString().split('T')[0];
  const weeks = useMemo(() => getMonthDays(viewDate), [viewDate]);

  const navigateMonth = (direction: number) => {
    const d = new Date(viewDate + 'T12:00:00');
    d.setMonth(d.getMonth() + direction);
    d.setDate(1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    onSelectDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <View style={styles.container}>
      {/* Month header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={ms(18)} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.monthContainer}>
          <Text style={styles.monthText}>
            {getMonthYear(viewDate, language)}
          </Text>
          {!isToday(selectedDate) && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{t('today')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={ms(18)} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day names header */}
      <View style={styles.dayNamesRow}>
        {dayKeys.map((key) => (
          <View key={key} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((dateStr, dayIndex) => {
            const dayNum = new Date(dateStr + 'T12:00:00').getDate();
            const currentMonth = getMonth(viewDate);
            const dateMonth = getMonth(dateStr);
            const isOutsideMonth = dateMonth !== currentMonth;
            const isSelected = dateStr === selectedDate;
            const isTodayDate = isToday(dateStr);
            const hasAppointment = appointmentDates?.has(dateStr);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isTodayDate && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => onSelectDate(dateStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isOutsideMonth && styles.dayNumberOutside,
                    isSelected && styles.dayNumberSelected,
                    isTodayDate && !isSelected && styles.dayNumberToday,
                  ]}
                >
                  {dayNum}
                </Text>
                {hasAppointment && !isOutsideMonth && (
                  <View
                    style={[
                      styles.appointmentDot,
                      isSelected && styles.appointmentDotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = wp(42);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  navButton: {
    width: wp(32),
    height: wp(32),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  todayBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    borderRadius: borderRadius.full,
  },
  todayBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayNameText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    backgroundColor: colors.primaryBg,
  },
  dayNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  dayNumberOutside: {
    color: colors.border,
  },
  dayNumberSelected: {
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  dayNumberToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  appointmentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  appointmentDotSelected: {
    backgroundColor: colors.textOnPrimary,
  },
});
