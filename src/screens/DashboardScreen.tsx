import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { formatCurrency, formatDate, getToday, getPatientName, getAppointmentTotal, getIncomeForPeriod, getMonthRange } from '../utils/helpers';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { doctor, patients, appointments, payments, isLoading, refreshData } = useData();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const today = getToday();

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    return t('goodEvening');
  }

  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today && a.status !== 'cancelled')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today],
  );

  const monthStats = useMemo(() => {
    const { start, end } = getMonthRange(today);
    return getIncomeForPeriod(appointments, payments, start, end);
  }, [appointments, payments, today]);

  const outstandingBalance = useMemo(() => {
    let total = 0;
    for (const patient of patients) {
      const patientApts = appointments.filter(
        (a) => a.patientId === patient.id && a.status !== 'cancelled',
      );
      const charged = patientApts.reduce((sum, a) => sum + getAppointmentTotal(a), 0);
      const aptPaid = patientApts.reduce((sum, a) => sum + a.amountPaid, 0);
      const extraPaid = payments
        .filter((p) => p.patientId === patient.id)
        .reduce((sum, p) => sum + p.amount, 0);
      total += charged - aptPaid - extraPaid;
    }
    return total;
  }, [patients, appointments, payments]);

  const recentPatients = useMemo(
    () =>
      [...patients]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [patients],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.doctorName}>{language === 'ar' ? 'د. ' : 'Dr. '}{doctor?.name ?? (language === 'ar' ? 'طبيب' : 'Doctor')}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={ms(24)} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="calendar-outline" size={ms(20)} color="rgba(255,255,255,0.85)" />
          </View>
          <Text style={styles.statValue}>{todaysAppointments.length}</Text>
          <Text style={styles.statLabel}>{t('todaysAppts')}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.success }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="trending-up-outline" size={ms(20)} color="rgba(255,255,255,0.85)" />
          </View>
          <Text style={styles.statValue}>{formatCurrency(monthStats.collected)}</Text>
          <Text style={styles.statLabel}>{t('thisMonth')}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.warning }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="wallet-outline" size={ms(20)} color="rgba(255,255,255,0.85)" />
          </View>
          <Text style={styles.statValue}>{formatCurrency(outstandingBalance)}</Text>
          <Text style={styles.statLabel}>{t('outstanding')}</Text>
        </View>
      </View>

      {/* Today's Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="today-outline" size={ms(20)} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('todaysAppointments')}</Text>
          </View>
          <Text style={styles.sectionCount}>{todaysAppointments.length}</Text>
        </View>

        {todaysAppointments.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={ms(40)} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('noAppointmentsToday')}</Text>
              <Text style={styles.emptySubtitle}>{t('enjoyFreeTime')}</Text>
            </View>
          </Card>
        ) : (
          todaysAppointments.map((apt) => (
            <Card
              key={apt.id}
              onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: apt.id })}
            >
              <View style={styles.appointmentRow}>
                <View style={styles.timeBlock}>
                  <Ionicons name="time-outline" size={ms(14)} color={colors.primary} />
                  <Text style={styles.timeText}>{apt.time}</Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientNameText} numberOfLines={1}>
                    {getPatientName(apt.patientId, patients)}
                  </Text>
                  {apt.chiefComplaint ? (
                    <Text style={styles.complaintText} numberOfLines={1}>
                      {apt.chiefComplaint}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge status={apt.status} />
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="flash-outline" size={ms(20)} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primaryBg }]}
            onPress={() => navigation.navigate('AddPatient')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="person-add-outline" size={ms(22)} color={colors.textOnPrimary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.primaryDark }]}>{t('newPatient')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.successBg }]}
            onPress={() => navigation.navigate('AddAppointment')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="add-circle-outline" size={ms(22)} color={colors.textOnPrimary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.success }]}>{t('newAppointment')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Patients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people-outline" size={ms(20)} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('recentPatients')}</Text>
          </View>
        </View>

        {recentPatients.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={ms(40)} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('noPatientsYet')}</Text>
              <Text style={styles.emptySubtitle}>{t('addFirstPatient')}</Text>
            </View>
          </Card>
        ) : (
          recentPatients.map((patient) => (
            <Card
              key={patient.id}
              onPress={() => navigation.navigate('PatientDetail', { patientId: patient.id })}
            >
              <View style={styles.patientRow}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.avatarText}>
                    {patient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientNameText} numberOfLines={1}>
                    {patient.name}
                  </Text>
                  <Text style={styles.patientMeta}>
                    {t('added')} {formatDate(patient.createdAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={ms(18)} color={colors.textMuted} />
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  settingsButton: {
    width: wp(44),
    height: wp(44),
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadow.md,
  },
  statIconWrap: {
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textOnPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },

  // Appointment items
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    minWidth: wp(72),
  },
  timeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  appointmentInfo: {
    flex: 1,
  },
  complaintText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.sm,
  },
  actionIconCircle: {
    width: wp(48),
    height: wp(48),
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  // Patient items
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  patientAvatar: {
    width: wp(40),
    height: wp(40),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
  },
  patientNameText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  patientMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
