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

  const renderPatientCard = ({
    item,
  }: {
    item: { patient: Patient; totalCharged: number; totalPaid: number; balance: number };
  }) => {
    const isPaidUp = item.balance <= 0;

    return (
      <Card
        onPress={() =>
          navigation.navigate('PatientDetail', { patientId: item.patient.id })
        }
        style={styles.patientCard}
      >
        <View style={styles.cardRow}>
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
                <Ionicons name="call-outline" size={ms(13)} color={colors.textMuted} />
                <Text style={styles.patientPhone}>{item.patient.phone}</Text>
              </View>
            ) : null}
            <View style={styles.chargesRow}>
              <Text style={styles.chargeText}>
                {t('charged')}: {formatCurrency(item.totalCharged)}
              </Text>
              <Text style={styles.paidText}>
                {t('paid')}: {formatCurrency(item.totalPaid)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceContainer}>
            {isPaidUp && item.totalCharged > 0 ? (
              <View style={styles.paidUpBadge}>
                <Ionicons name="checkmark-circle" size={ms(20)} color={colors.success} />
                <Text style={styles.paidUpText}>{t('paid')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.balanceLabel}>{t('balance')}</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    { color: item.balance > 0 ? colors.danger : colors.textMuted },
                  ]}
                >
                  {formatCurrency(item.balance)}
                </Text>
              </>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const patientNoun = patients.length === 1 ? t('patient') : t('patients');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      {/* Patient List */}
      {filteredAndSorted.length === 0 ? (
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
      ) : (
        <FlatList
          data={filteredAndSorted}
          keyExtractor={(item) => item.patient.id}
          renderItem={renderPatientCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: wp(100),
  },
  patientCard: {
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: wp(48),
    height: wp(48),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.lg,
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
    marginBottom: 2,
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
  chargesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  chargeText: {
    fontSize: ms(11),
    color: colors.textMuted,
  },
  paidText: {
    fontSize: ms(11),
    color: colors.textMuted,
  },
  balanceContainer: {
    alignItems: 'flex-end',
    minWidth: wp(80),
  },
  balanceLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  paidUpBadge: {
    alignItems: 'center',
    gap: 2,
  },
  paidUpText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.success,
  },
});
