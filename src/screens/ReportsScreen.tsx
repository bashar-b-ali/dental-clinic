import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { formatCurrency, getToday, getIncomeForPeriod, getDayRange, getWeekRange, getMonthRange, getAppointmentTotal, getPatientName } from '../utils/helpers';

type Period = 'day' | 'week' | 'month';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const { appointments, payments, patients } = useData();
  const [period, setPeriod] = useState<Period>('month');
  const [referenceDate, setReferenceDate] = useState(getToday());

  const dateRange = useMemo(() => {
    switch (period) {
      case 'day':
        return getDayRange(referenceDate);
      case 'week':
        return getWeekRange(referenceDate);
      case 'month':
        return getMonthRange(referenceDate);
    }
  }, [period, referenceDate]);

  const income = useMemo(
    () => getIncomeForPeriod(appointments, payments, dateRange.start, dateRange.end),
    [appointments, payments, dateRange]
  );

  const netIncome = income.revenue - income.expenses;

  const periodAppointments = useMemo(
    () => appointments.filter((a) => a.date >= dateRange.start && a.date <= dateRange.end),
    [appointments, dateRange]
  );

  const appointmentStats = useMemo(() => {
    const total = periodAppointments.length;
    const completed = periodAppointments.filter((a) => a.status === 'completed').length;
    const cancelled = periodAppointments.filter((a) => a.status === 'cancelled').length;
    const noShow = periodAppointments.filter((a) => a.status === 'no-show').length;
    const scheduled = periodAppointments.filter((a) => a.status === 'scheduled').length;
    return { total, completed, cancelled, noShow, scheduled };
  }, [periodAppointments]);

  const topProcedures = useMemo(() => {
    const counts: Record<string, number> = {};
    periodAppointments
      .filter((a) => a.status === 'completed')
      .forEach((a) => {
        a.teethWork.forEach((tw) => {
          counts[tw.procedure] = (counts[tw.procedure] || 0) + 1;
        });
      });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [periodAppointments]);

  const topPatients = useMemo(() => {
    const totals: Record<string, number> = {};
    periodAppointments
      .filter((a) => a.status === 'completed')
      .forEach((a) => {
        totals[a.patientId] = (totals[a.patientId] || 0) + getAppointmentTotal(a);
      });
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([patientId, total]) => ({
        name: getPatientName(patientId, patients),
        total,
      }));
  }, [periodAppointments, patients]);

  const maxProcedureCount = topProcedures.length > 0 ? topProcedures[0][1] : 1;
  const maxPatientTotal = topPatients.length > 0 ? topPatients[0].total : 1;

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(referenceDate);
    switch (period) {
      case 'day':
        d.setDate(d.getDate() + direction);
        break;
      case 'week':
        d.setDate(d.getDate() + direction * 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() + direction);
        break;
    }
    setReferenceDate(d.toISOString().split('T')[0]);
  };

  const formatPeriodLabel = () => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (period === 'day') {
      return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (period === 'month') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Income bar visualization data
  const incomeBarData = useMemo(() => {
    const maxVal = Math.max(income.revenue, income.expenses, income.collected, 1);
    return [
      { label: 'Revenue', value: income.revenue, color: colors.primary, pct: (income.revenue / maxVal) * 100 },
      { label: 'Expenses', value: income.expenses, color: colors.danger, pct: (income.expenses / maxVal) * 100 },
      { label: 'Collected', value: income.collected, color: colors.success, pct: (income.collected / maxVal) * 100 },
      { label: 'Outstanding', value: income.outstanding, color: colors.warning, pct: (Math.abs(income.outstanding) / maxVal) * 100 },
    ];
  }, [income]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Period Selector */}
      <View style={styles.periodRow}>
        <View style={styles.pillContainer}>
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pill, period === p && styles.pillActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{formatPeriodLabel()}</Text>
        <TouchableOpacity onPress={() => navigateDate(1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryHalf}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="trending-up" size={18} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(income.revenue)}</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </Card>
        </View>
        <View style={styles.summaryHalf}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="trending-down" size={18} color={colors.danger} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(income.expenses)}</Text>
            <Text style={styles.summaryLabel}>Expenses</Text>
          </Card>
        </View>
        <View style={styles.summaryHalf}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.iconCircle, { backgroundColor: netIncome >= 0 ? colors.successBg : colors.dangerBg }]}>
                <Ionicons name="wallet" size={18} color={netIncome >= 0 ? colors.success : colors.danger} />
              </View>
            </View>
            <Text style={[styles.summaryValue, { color: netIncome >= 0 ? colors.success : colors.danger }]}>
              {formatCurrency(netIncome)}
            </Text>
            <Text style={styles.summaryLabel}>Net Income</Text>
          </Card>
        </View>
        <View style={styles.summaryHalf}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(income.collected)}</Text>
            <Text style={styles.summaryLabel}>Collected</Text>
          </Card>
        </View>
        <View style={styles.summaryHalf}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="time" size={18} color={colors.warning} />
              </View>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(income.outstanding)}</Text>
            <Text style={styles.summaryLabel}>Outstanding</Text>
          </Card>
        </View>
      </View>

      {/* Income Visualization */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bar-chart" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Income Overview</Text>
        </View>
        {incomeBarData.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(bar.pct, 2)}%`, backgroundColor: bar.color },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{formatCurrency(bar.value)}</Text>
          </View>
        ))}
      </Card>

      {/* Appointment Stats */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Appointment Stats</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{appointmentStats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{appointmentStats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>{appointmentStats.cancelled}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>{appointmentStats.noShow}</Text>
            <Text style={styles.statLabel}>No-Show</Text>
          </View>
        </View>
        {appointmentStats.total > 0 && (
          <View style={styles.percentageBar}>
            {appointmentStats.completed > 0 && (
              <View
                style={[
                  styles.pctSegment,
                  {
                    flex: appointmentStats.completed,
                    backgroundColor: colors.success,
                    borderTopLeftRadius: borderRadius.sm,
                    borderBottomLeftRadius: borderRadius.sm,
                  },
                ]}
              />
            )}
            {appointmentStats.scheduled > 0 && (
              <View style={[styles.pctSegment, { flex: appointmentStats.scheduled, backgroundColor: colors.primary }]} />
            )}
            {appointmentStats.cancelled > 0 && (
              <View style={[styles.pctSegment, { flex: appointmentStats.cancelled, backgroundColor: colors.danger }]} />
            )}
            {appointmentStats.noShow > 0 && (
              <View
                style={[
                  styles.pctSegment,
                  {
                    flex: appointmentStats.noShow,
                    backgroundColor: colors.warning,
                    borderTopRightRadius: borderRadius.sm,
                    borderBottomRightRadius: borderRadius.sm,
                  },
                ]}
              />
            )}
          </View>
        )}
        {appointmentStats.total > 0 && (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>{getPercentage(appointmentStats.completed, appointmentStats.total)}% Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>{getPercentage(appointmentStats.cancelled, appointmentStats.total)}% Cancelled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>{getPercentage(appointmentStats.noShow, appointmentStats.total)}% No-Show</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Top Procedures */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="medkit" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Top Procedures</Text>
        </View>
        {topProcedures.length === 0 ? (
          <Text style={styles.emptyText}>No procedures recorded in this period</Text>
        ) : (
          topProcedures.map(([procedure, count], index) => (
            <View key={procedure} style={styles.rankRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{procedure}</Text>
                <View style={styles.rankBarTrack}>
                  <View
                    style={[
                      styles.rankBarFill,
                      { width: `${(count / maxProcedureCount) * 100}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.rankValue}>{count}x</Text>
            </View>
          ))
        )}
      </Card>

      {/* Top Patients by Revenue */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Top Patients by Revenue</Text>
        </View>
        {topPatients.length === 0 ? (
          <Text style={styles.emptyText}>No patient revenue in this period</Text>
        ) : (
          topPatients.map((patient, index) => (
            <View key={`${patient.name}-${index}`} style={styles.rankRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{patient.name}</Text>
                <View style={styles.rankBarTrack}>
                  <View
                    style={[
                      styles.rankBarFill,
                      { width: `${(patient.total / maxPatientTotal) * 100}%`, backgroundColor: colors.accent },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.rankValue}>{formatCurrency(patient.total)}</Text>
            </View>
          ))
        )}
      </Card>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
  },
  periodRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    padding: 3,
  },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  pillActive: {
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textOnPrimary,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    minWidth: 180,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryHalf: {
    width: '48.5%',
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  summaryIconRow: {
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  barLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 80,
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  barValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    width: 72,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  percentageBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    marginBottom: spacing.sm,
    gap: 2,
  },
  pctSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  rankBarTrack: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  rankValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    minWidth: 50,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
