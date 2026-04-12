import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Card from '../components/Card';
import DatePicker from '../components/DatePicker';
import Input from '../components/Input';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { formatDate, formatCurrency, getToday, getPatientName, getAppointmentTotal } from '../utils/helpers';

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed';

export default function AppointmentsScreen() {
  const navigation = useNavigation<any>();
  const { appointments, patients } = useData();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getToday());

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'today', label: t('filterToday') },
    { key: 'upcoming', label: t('filterUpcoming') },
    { key: 'completed', label: t('filterCompleted') },
  ];

  const today = getToday();

  // Stats
  const stats = useMemo(() => {
    const todayCount = appointments.filter((a) => a.date === today && a.status !== 'cancelled').length;
    const upcomingCount = appointments.filter((a) => a.date >= today && a.status === 'scheduled').length;
    const completedCount = appointments.filter((a) => a.status === 'completed').length;
    return { todayCount, upcomingCount, completedCount };
  }, [appointments, today]);

  // Set of dates that have appointments (for calendar dot indicators)
  const appointmentDates = useMemo(
    () => new Set(appointments.map((a) => a.date)),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    let result = appointments;

    // If calendar is open and on "all" tab, filter by selected date
    if (calendarOpen && activeFilter === 'all') {
      result = result.filter((a) => a.date === selectedCalendarDate);
    } else {
      switch (activeFilter) {
        case 'today':
          result = result.filter((a) => a.date === today);
          break;
        case 'upcoming':
          result = result.filter((a) => a.date >= today && a.status === 'scheduled');
          break;
        case 'completed':
          result = result.filter((a) => a.status === 'completed');
          break;
      }
    }

    // Search filter
    const query = search.toLowerCase().trim();
    if (query) {
      result = result.filter((a) => {
        const patient = patients.find((p) => p.id === a.patientId);
        if (!patient) return false;
        return (
          patient.name.toLowerCase().includes(query) ||
          (patient.phone && patient.phone.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [appointments, patients, activeFilter, search, today, calendarOpen, selectedCalendarDate]);

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

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name="calendar-outline" size={ms(14)} color={colors.textSecondary} />
      <Text style={styles.sectionHeaderText}>{formatDate(section.title)}</Text>
    </View>
  );

  const renderAppointmentCard = ({ item }: { item: (typeof appointments)[number] }) => {
    const patientName = getPatientName(item.patientId, patients);
    const patient = patients.find((p) => p.id === item.patientId);
    const total = getAppointmentTotal(item);
    const procedures = [...new Set(item.teethWork.map((tw) => tw.procedure).filter(Boolean))];

    return (
      <Card
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
        style={styles.appointmentCard}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {patientName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardPatientName} numberOfLines={1}>
                {patientName}
              </Text>
              {patient?.phone ? (
                <View style={styles.inlineRow}>
                  <Ionicons name="call-outline" size={ms(12)} color={colors.textMuted} />
                  <Text style={styles.cardPhone}>{patient.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Procedures chips */}
        {procedures.length > 0 && (
          <View style={styles.procedureRow}>
            {procedures.slice(0, 3).map((proc) => (
              <View key={proc} style={styles.procedureChip}>
                <Text style={styles.procedureChipText}>{proc}</Text>
              </View>
            ))}
            {procedures.length > 3 && (
              <View style={styles.procedureChip}>
                <Text style={styles.procedureChipText}>+{procedures.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {item.chiefComplaint ? (
          <Text style={styles.cardComplaint} numberOfLines={1}>
            {item.chiefComplaint}
          </Text>
        ) : null}

        <View style={styles.cardBottomRow}>
          <View style={styles.cardTimeContainer}>
            <Ionicons name="time-outline" size={ms(14)} color={colors.primary} />
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
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

  const appointmentNoun = appointments.length === 1 ? t('appointment') : t('tab_appointments');

  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('tab_appointments')}</Text>
        <Text style={styles.subtitle}>
          {appointments.length} {appointmentNoun}
        </Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.primaryBg }]}>
          <Text style={[styles.statLabel, { color: colors.primaryDark }]}>{t('filterToday')}</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.todayCount}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.warningBg }]}>
          <Text style={[styles.statLabel, { color: colors.warning }]}>{t('filterUpcoming')}</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.upcomingCount}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.successBg }]}>
          <Text style={[styles.statLabel, { color: colors.success }]}>{t('filterCompleted')}</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.completedCount}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <View style={styles.pillGroup}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, activeFilter === f.key && styles.pillActive]}
              onPress={() => {
                setActiveFilter(f.key);
                if (f.key !== 'all') setCalendarOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, activeFilter === f.key && styles.pillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Calendar Toggle + Calendar (only on "All" tab) */}
      {activeFilter === 'all' && (
        <>
          <View style={styles.calendarToggleRow}>
            <TouchableOpacity
              style={[styles.calendarToggleBtn, calendarOpen && styles.calendarToggleBtnActive]}
              onPress={() => setCalendarOpen(!calendarOpen)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={calendarOpen ? 'calendar' : 'calendar-outline'}
                size={ms(16)}
                color={calendarOpen ? colors.textOnPrimary : colors.primary}
              />
              <Text style={[styles.calendarToggleText, calendarOpen && styles.calendarToggleTextActive]}>
                {t('filterByDate')}
              </Text>
              <Ionicons
                name={calendarOpen ? 'chevron-up' : 'chevron-down'}
                size={ms(14)}
                color={calendarOpen ? colors.textOnPrimary : colors.primary}
              />
            </TouchableOpacity>
          </View>

          {calendarOpen && (
            <View style={styles.calendarContainer}>
              <DatePicker
                selectedDate={selectedCalendarDate}
                onSelectDate={setSelectedCalendarDate}
                appointmentDates={appointmentDates}
              />
            </View>
          )}
        </>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search-outline"
            size={ms(20)}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <Input
            placeholder={t('searchByNameOrPhone')}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
    </>
  );

  const ListEmpty = () => (
    sections.length === 0 ? (
      search.length > 0 ? (
        <EmptyState
          icon="search-outline"
          title={t('noResults')}
          message={`${t('noPatientFound')} "${search}"`}
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title={emptyConfig[activeFilter].title}
          message={emptyConfig[activeFilter].message}
          actionLabel={t('addAppointment')}
          onAction={() => navigation.navigate('AddAppointment')}
        />
      )
    ) : null
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentCard}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
      />

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
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  filterRow: {
    marginBottom: spacing.sm,
  },
  pillGroup: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    padding: wp(3),
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textOnPrimary,
  },
  calendarToggleRow: {
    marginBottom: spacing.sm,
  },
  calendarToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  calendarToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  calendarToggleText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  calendarToggleTextActive: {
    color: colors.textOnPrimary,
  },
  calendarContainer: {
    marginBottom: spacing.sm,
  },
  searchContainer: {
    paddingBottom: spacing.sm,
  },
  searchInputWrapper: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: wp(14),
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: wp(44),
    marginBottom: 0,
  },
  listContent: {
    paddingHorizontal: spacing.md,
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
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatar: {
    width: wp(40),
    height: wp(40),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardPatientName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  procedureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  procedureChip: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  procedureChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  cardComplaint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
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
