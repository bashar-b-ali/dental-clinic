import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { formatDate, getPatientBalance, formatCurrency } from '../utils/helpers';
import { Patient } from '../types';

export default function PatientsScreen() {
  const navigation = useNavigation<any>();
  const { patients, appointments, payments } = useData();
  const [search, setSearch] = useState('');

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.phone && p.phone.toLowerCase().includes(query))
    );
  }, [patients, search]);

  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredPatients]);

  const renderPatientCard = ({ item }: { item: Patient }) => {
    const { totalCharged, totalPaid, balance } = getPatientBalance(
      item.id,
      appointments,
      payments
    );
    const isPaidUp = balance <= 0;

    return (
      <Card
        onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
        style={styles.patientCard}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.patientName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.phone ? (
              <View style={styles.inlineRow}>
                <Ionicons name="call-outline" size={ms(13)} color={colors.textMuted} />
                <Text style={styles.patientPhone}>{item.phone}</Text>
              </View>
            ) : null}
            <View style={styles.inlineRow}>
              <Ionicons name="calendar-outline" size={ms(13)} color={colors.textMuted} />
              <Text style={styles.dateText}>
                Added {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: isPaidUp ? colors.success : colors.danger },
              ]}
            >
              {formatCurrency(Math.abs(balance))}
            </Text>
            {isPaidUp && balance === 0 && totalCharged === 0 ? (
              <Text style={styles.balanceHint}>No visits</Text>
            ) : isPaidUp ? (
              <Text style={[styles.balanceHint, { color: colors.success }]}>Paid up</Text>
            ) : (
              <Text style={[styles.balanceHint, { color: colors.danger }]}>Outstanding</Text>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <Text style={styles.subtitle}>
          {patients.length} {patients.length === 1 ? 'patient' : 'patients'} total
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search-outline"
            size={ms(20)}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {sortedPatients.length === 0 ? (
        search.length > 0 ? (
          <EmptyState
            icon="search-outline"
            title="No Results"
            message={`No patients found matching "${search}"`}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No Patients Yet"
            message="Add your first patient to get started"
            actionLabel="Add Patient"
            onAction={() => navigation.navigate('AddPatient', {})}
          />
        )
      ) : (
        <FlatList
          data={sortedPatients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatientCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPatient', {})}
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
  dateText: {
    fontSize: fontSize.xs,
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
  balanceHint: {
    fontSize: ms(10),
    color: colors.textMuted,
    marginTop: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: wp(56),
    height: wp(56),
    borderRadius: wp(28),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
});
