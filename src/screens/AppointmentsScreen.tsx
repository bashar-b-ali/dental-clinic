import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { formatDate, formatCurrency, getToday, getPatientName, getAppointmentTotal } from '../utils/helpers';
import { AppointmentStatus } from '../types';

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed';

export default function AppointmentsScreen() {
  const navigation = useNavigation<any>();
  const { appointments, patients } = useData();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'today', label: t('filterToday') },
    { key: 'upcoming', label: t('filterUpcoming') },
    { key: 'completed', label: t('filterCompleted') },
  ];

  const filteredAppointments = useMemo(() => {
    const today = getToday();

    switch (activeFilter) {
      case 'today':
        return appointments.filter((a) => a.date === today);
      case 'upcoming':
        return appointments.filter((a) => a.date >= today && a.status === 'scheduled');
      case 'completed':
        return appointments.filter((a) => a.status === 'completed');
      default:
        return appointments;
    }
  }, [appointments, activeFilter]);

  const sections = useMemo(() => {
    const grouped: Record<string, typeof filteredAppointments> = {};

    for (const apt of filteredAppointments) {
      if (!grouped[apt.date]) {
        grouped[apt.date] = [];
      }
      grouped[apt.date].push(apt);
    }

    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        title: date,
        data: grouped[date].sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [filteredAppointments]);

  const emptyConfig: Record<FilterTab, { title: string; message: string }> = {
    all: {
      title: t('noAppointments'),
      message: t('scheduleFirstAppointment'),
    },
    today: {
      title: t('noAppointmentsTodayTitle'),
      message: t('noAppointmentsTodayMsg'),
    },
    upcoming: {
      title: t('noUpcoming'),
      message: t('noUpcomingMsg'),
    },
    completed: {
      title: t('noCompleted'),
      message: t('noCompletedMsg'),
    },
  };

  const renderFilterTab = ({ item }: { item: (typeof FILTERS)[number] }) => {
    const isActive = activeFilter === item.key;
    return (
      <TouchableOpacity
        style={[styles.filterPill, isActive && styles.filterPillActive]}
        onPress={() => setActiveFilter(item.key)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name="calendar-outline" size={ms(14)} color={colors.textSecondary} />
      <Text style={styles.sectionHeaderText}>{formatDate(section.title)}</Text>
    </View>
  );

  const renderAppointmentCard = ({ item }: { item: (typeof appointments)[number] }) => {
    const patientName = getPatientName(item.patientId, patients);
    const total = getAppointmentTotal(item);

    return (
      <Card
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
        style={styles.appointmentCard}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardTimeContainer}>
            <Ionicons name="time-outline" size={ms(14)} color={colors.primary} />
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.cardPatientName}>{patientName}</Text>

        {item.chiefComplaint ? (
          <Text style={styles.cardComplaint} numberOfLines={2}>
            {item.chiefComplaint}
          </Text>
        ) : null}

        <View style={styles.cardBottomRow}>
          <View style={styles.cardTeethInfo}>
            {item.teethWork.length > 0 && (
              <>
                <Ionicons name="medical-outline" size={ms(13)} color={colors.textMuted} />
                <Text style={styles.cardTeethCount}>
                  {item.teethWork.length} {item.teethWork.length === 1 ? t('tooth') : t('teeth')}
                </Text>
              </>
            )}
          </View>
          <Text style={styles.cardTotal}>{formatCurrency(total)}</Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.filterContainer}>
        <FlatList
          data={FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={renderFilterTab}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {sections.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={emptyConfig[activeFilter].title}
          message={emptyConfig[activeFilter].message}
          actionLabel={t('addAppointment')}
          onAction={() => navigation.navigate('AddAppointment')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAppointment')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={ms(28)} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  filterContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadow.sm,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textOnPrimary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: wp(100),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appointmentCard: {
    marginBottom: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTime: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  cardPatientName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardComplaint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  cardTeethInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTeethCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  cardTotal: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: wp(56),
    height: wp(56),
    borderRadius: wp(28),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
});
