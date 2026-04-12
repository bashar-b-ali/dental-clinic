import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Card from '../components/Card';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { formatCurrency, getPatientBalance } from '../utils/helpers';
import { Patient } from '../types';

type FilterType = 'all' | 'withBalance' | 'paidUp';
type SortType = 'name' | 'balance';

type BillingItem = {
  patient: Patient;
  totalCharged: number;
  totalPaid: number;
  balance: number;
};

export default function BillingScreen() {
  const navigation = useNavigation<any>();
  const { patients, appointments, payments } = useData();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');

  const patientBillingData = useMemo(() => {
    return patients.map((patient) => ({
      patient,
      ...getPatientBalance(patient.id, appointments, payments),
    }));
  }, [patients, appointments, payments]);

  const totals = useMemo(() => {
    return patientBillingData.reduce(
      (acc, item) => ({
        totalCharged: acc.totalCharged + item.totalCharged,
        totalPaid: acc.totalPaid + item.totalPaid,
        totalOutstanding: acc.totalOutstanding + Math.max(0, item.balance),
      }),
      { totalCharged: 0, totalPaid: 0, totalOutstanding: 0 }
    );
  }, [patientBillingData]);

  const filteredAndSorted = useMemo(() => {
    const query = search.toLowerCase().trim();

    let result = patientBillingData;

    if (query) {
      result = result.filter(
        (item) =>
          item.patient.name.toLowerCase().includes(query) ||
          (item.patient.phone && item.patient.phone.toLowerCase().includes(query))
      );
    }

    if (filter === 'withBalance') {
      result = result.filter((item) => item.balance > 0);
    } else if (filter === 'paidUp') {
      result = result.filter((item) => item.balance <= 0);
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) =>
        a.patient.name.localeCompare(b.patient.name)
      );
    } else {
      result = [...result].sort((a, b) => b.balance - a.balance);
    }

    return result;
  }, [patientBillingData, search, filter, sortBy]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'withBalance', label: t('withBalance') },
    { key: 'paidUp', label: t('paidUpFilter') },
  ];

  const renderPatientCard = ({ item }: { item: BillingItem }) => {
    const isPaidUp = item.balance <= 0;
    const paidPercent = item.totalCharged > 0
      ? Math.min(100, Math.round((item.totalPaid / item.totalCharged) * 100))
      : 0;

    return (
      <Card
        onPress={() =>
          navigation.navigate('PatientDetail', { patientId: item.patient.id })
        }
        style={styles.patientCard}
      >
        {/* Top row: avatar + info + balance */}
        <View style={styles.cardTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.patient.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item.patient.name}
            </Text>
            {item.patient.phone ? (
              <View style={styles.inlineRow}>
                <Ionicons name="call-outline" size={ms(12)} color={colors.textMuted} />
                <Text style={styles.patientPhone}>{item.patient.phone}</Text>
              </View>
            ) : null}
          </View>
          {isPaidUp && item.totalCharged > 0 ? (
            <View style={styles.paidUpBadge}>
              <Ionicons name="checkmark-circle" size={ms(18)} color={colors.success} />
              <Text style={styles.paidUpText}>{t('paid')}</Text>
            </View>
          ) : item.totalCharged > 0 ? (
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceAmount}>{formatCurrency(item.balance)}</Text>
              <Text style={styles.balanceLabel}>{t('balance')}</Text>
            </View>
          ) : null}
        </View>

        {/* Financial row */}
        {item.totalCharged > 0 && (
          <>
            <View style={styles.financeRow}>
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>{t('charged')}</Text>
                <Text style={styles.financeValue}>{formatCurrency(item.totalCharged)}</Text>
              </View>
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>{t('paid')}</Text>
                <Text style={[styles.financeValue, { color: colors.success }]}>
                  {formatCurrency(item.totalPaid)}
                </Text>
              </View>
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>{t('balance')}</Text>
                <Text style={[styles.financeValue, { color: isPaidUp ? colors.success : colors.danger }]}>
                  {formatCurrency(item.balance)}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${paidPercent}%`,
                      backgroundColor: isPaidUp ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{paidPercent}%</Text>
            </View>
          </>
        )}

        {/* Record payment button */}
        {item.balance > 0 && (
          <TouchableOpacity
            style={styles.recordPaymentBtn}
            onPress={() =>
              navigation.navigate('AddPayment', { patientId: item.patient.id })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={ms(14)} color={colors.primary} />
            <Text style={styles.recordPaymentText}>{t('recordPayment')}</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  const patientNoun = patients.length === 1 ? t('patient') : t('patients');

  const ListHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('billingTitle')}</Text>
        <Text style={styles.subtitle}>
          {patients.length} {patientNoun}
        </Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.primaryBg }]}>
          <Text style={[styles.statLabel, { color: colors.primaryDark }]}>{t('revenue')}</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatCurrency(totals.totalCharged)}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.successBg }]}>
          <Text style={[styles.statLabel, { color: colors.success }]}>{t('collected')}</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(totals.totalPaid)}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.statLabel, { color: colors.danger }]}>{t('outstanding')}</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {formatCurrency(totals.totalOutstanding)}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <View style={styles.pillGroup}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, filter === f.key && styles.pillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.pillText, filter === f.key && styles.pillTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortBy(sortBy === 'name' ? 'balance' : 'name')}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical-outline" size={ms(16)} color={colors.primary} />
          <Text style={styles.sortButtonText}>
            {sortBy === 'name' ? t('sortName') : t('sortBalance')}
          </Text>
        </TouchableOpacity>
      </View>

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
    search.length > 0 ? (
      <EmptyState
        icon="search-outline"
        title={t('noResults')}
        message={`${t('noPatientFound')} "${search}"`}
      />
    ) : filter !== 'all' ? (
      <EmptyState
        icon="funnel-outline"
        title={t('noPatientsTitle')}
        message={
          filter === 'withBalance'
            ? t('noOutstandingBalance')
            : t('noPaidUpYet')
        }
      />
    ) : (
      <EmptyState
        icon="cash-outline"
        title={t('noBillingData')}
        message={t('addPatientsForBilling')}
        actionLabel={t('addPatient')}
        onAction={() => navigation.navigate('AddPatient', {})}
      />
    )
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filteredAndSorted}
        keyExtractor={(item) => item.patient.id}
        renderItem={renderPatientCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
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
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  pillGroup: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    padding: wp(3),
  },
  pill: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sortButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
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

  // Patient card
  patientCard: {
    marginBottom: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: wp(42),
    height: wp(42),
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
    marginRight: spacing.sm,
  },
  patientName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  patientPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  paidUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  paidUpText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.success,
  },
  balanceBadge: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.danger,
  },
  balanceLabel: {
    fontSize: ms(10),
    color: colors.textMuted,
    marginTop: 1,
  },

  // Finance row
  financeRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  financeItem: {
    flex: 1,
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: ms(10),
    color: colors.textMuted,
    marginBottom: 2,
  },
  financeValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },

  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: colors.textMuted,
    minWidth: wp(30),
    textAlign: 'right',
  },

  // Record payment button
  recordPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  recordPaymentText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
});
