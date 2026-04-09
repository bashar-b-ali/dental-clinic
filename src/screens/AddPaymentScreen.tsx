import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { wp } from '../utils/responsive';
import { formatCurrency, getPatientBalance, getToday } from '../utils/helpers';

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'card', label: 'Card', icon: 'card-outline' },
  { key: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function AddPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientId, appointmentId } = route.params;
  const { patients, appointments, payments, addPayment } = useData();

  const patient = patients.find((p) => p.id === patientId);
  const { totalCharged, totalPaid, balance } = getPatientBalance(
    patientId,
    appointments,
    payments
  );

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getToday());
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleQuickAmount = (type: 'full' | 'half') => {
    if (balance <= 0) return;
    const value = type === 'full' ? balance : Math.round(balance * 50) / 100;
    setAmount(value.toFixed(2));
  };

  const handleSave = async () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount greater than 0.');
      return;
    }

    if (!date) {
      Alert.alert('Missing Date', 'Please enter a payment date.');
      return;
    }

    setSaving(true);
    try {
      await addPayment({
        patientId,
        appointmentId: appointmentId || undefined,
        amount: numericAmount,
        date,
        method,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Patient not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Patient Info Header */}
      <Card style={styles.patientCard}>
        <View style={styles.patientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {patient.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientSub}>
              Charged: {formatCurrency(totalCharged)} | Paid: {formatCurrency(totalPaid)}
            </Text>
          </View>
        </View>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>Current Balance</Text>
          <Text
            style={[
              styles.balanceBannerValue,
              { color: balance > 0 ? colors.danger : colors.success },
            ]}
          >
            {formatCurrency(balance)}
          </Text>
        </View>
      </Card>

      {/* Quick Amount Buttons */}
      {balance > 0 && (
        <View style={styles.quickAmounts}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAmount('full')}
            activeOpacity={0.7}
          >
            <Text style={styles.quickButtonText}>Pay Full Balance</Text>
            <Text style={styles.quickButtonAmount}>{formatCurrency(balance)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAmount('half')}
            activeOpacity={0.7}
          >
            <Text style={styles.quickButtonText}>50%</Text>
            <Text style={styles.quickButtonAmount}>
              {formatCurrency(Math.round(balance * 50) / 100)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Amount Input */}
      <Input
        label="Amount"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      {/* Date Input */}
      <Input
        label="Date"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
      />

      {/* Payment Method */}
      <Text style={styles.fieldLabel}>Payment Method</Text>
      <View style={styles.methodRow}>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.methodPill, method === m.key && styles.methodPillActive]}
            onPress={() => setMethod(m.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.methodPillText,
                method === m.key && styles.methodPillTextActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <Input
        label="Notes (optional)"
        placeholder="Add any notes about this payment..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.notesInput}
      />

      {/* Save Button */}
      <Button
        title="Save Payment"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        size="lg"
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: wp(60),
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  patientCard: {
    marginBottom: spacing.md,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  patientSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceBanner: {
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceBannerLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceBannerValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickButton: {
    flex: 1,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  quickButtonAmount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  methodPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodPillText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodPillTextActive: {
    color: colors.textOnPrimary,
  },
  notesInput: {
    minHeight: wp(80),
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
