import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { useLanguage } from '../i18n/LanguageContext';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

function getDaysOfWeek(centerDate: string): string[] {
  const d = new Date(centerDate + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const start = new Date(d);
  start.setDate(d.getDate() - day);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    days.push(current.toISOString().split('T')[0]);
  }
  return days;
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

export default function DatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const { t, language } = useLanguage();
  const weekDates = getDaysOfWeek(selectedDate);

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  const navigateWeek = (direction: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction * 7);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    onSelectDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <View style={styles.container}>
      {/* Month header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={ms(20)} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.monthContainer}>
          <Text style={styles.monthText}>
            {getMonthYear(selectedDate, language)}
          </Text>
          {!isToday(selectedDate) && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{t('today')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={ms(20)} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Days strip */}
      <View style={styles.daysRow}>
        {weekDates.map((dateStr) => {
          const d = new Date(dateStr + 'T12:00:00');
          const dayIndex = d.getDay();
          const dayNum = d.getDate();
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(dateStr);

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
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  isTodayDate && !isSelected && styles.dayNameToday,
                ]}
              >
                {t(dayKeys[dayIndex])}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isTodayDate && !isSelected && styles.dayNumberToday,
                ]}
              >
                {dayNum}
              </Text>
              {isTodayDate && (
                <View
                  style={[
                    styles.todayDot,
                    isSelected && styles.todayDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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
    width: wp(36),
    height: wp(36),
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
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg,
    minHeight: wp(68),
    justifyContent: 'center',
    gap: spacing.xs - 1,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  dayCellToday: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayNameSelected: {
    color: colors.textOnPrimary,
  },
  dayNameToday: {
    color: colors.primary,
  },
  dayNumber: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  dayNumberSelected: {
    color: colors.textOnPrimary,
  },
  dayNumberToday: {
    color: colors.primary,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  todayDotSelected: {
    backgroundColor: colors.textOnPrimary,
  },
});
