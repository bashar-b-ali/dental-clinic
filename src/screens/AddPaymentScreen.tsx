import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import DatePicker from '../components/DatePicker';
import CustomAlert, { useAlert } from '../components/CustomAlert';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { wp } from '../utils/responsive';
import { formatCurrency, formatDate, getPatientBalance, getToday } from '../utils/helpers';

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

const PAYMENT_METHOD_KEYS: { key: PaymentMethod; labelKey: string; icon: string }[] = [
  { key: 'cash', labelKey: 'cash', icon: 'cash-outline' },
  { key: 'card', labelKey: 'card', icon: 'card-outline' },
  { key: 'transfer', labelKey: 'transfer', icon: 'swap-horizontal-outline' },
  { key: 'other', labelKey: 'catOther', icon: 'ellipsis-horizontal-outline' },
];

export default function AddPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useLanguage();
  const { patientId, appointmentId, editPayment } = route.params;
  const isEditing = !!editPayment;
  const { patients, appointments, payments, addPayment, updatePayment, deletePayment } = useData();

  const patient = patients.find((p) => p.id === patientId);
  const { totalCharged, totalPaid, balance } = getPatientBalance(
    patientId,
    appointments,
    payments
  );

  // Combine Payment records + appointment amountPaid into unified history
  const allPaymentItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      type: 'payment' | 'appointment';
      amount: number;
      date: string;
      method?: string;
      notes?: string;
      appointmentId?: string;
      appointmentTime?: string;
      paymentRecord?: typeof payments[0];
    }> = [];

    // Payment records
    payments
      .filter((p) => p.patientId === patientId)
      .forEach((p) => {
        const apt = p.appointmentId ? appointments.find((a) => a.id === p.appointmentId) : null;
        items.push({
          id: p.id,
          type: 'payment',
          amount: p.amount,
          date: p.date,
          method: p.method,
          notes: p.notes,
          appointmentId: p.appointmentId,
          appointmentTime: apt?.time,
          paymentRecord: p,
        });
      });

    // Appointment amountPaid entries (not already in payments)
    appointments
      .filter((a) => a.patientId === patientId && a.amountPaid > 0 && a.status !== 'cancelled')
      .forEach((a) => {
        items.push({
          id: `apt-${a.id}`,
          type: 'appointment',
          amount: a.amountPaid,
          date: a.date,
          notes: a.chiefComplaint,
          appointmentId: a.id,
          appointmentTime: a.time,
        });
      });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, appointments, patientId]);

  const methodLabels: Record<string, string> = {
    cash: t('cash'),
    card: t('card'),
    transfer: t('transfer'),
    other: t('catOther'),
  };

  const [amount, setAmount] = useState(isEditing ? editPayment.amount.toString() : '');
  const [date, setDate] = useState(isEditing ? editPayment.date : getToday());
  const [method, setMethod] = useState<PaymentMethod>(isEditing ? editPayment.method : 'cash');
  const [notes, setNotes] = useState(isEditing ? (editPayment.notes ?? '') : '');
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const handleQuickAmount = (type: 'full' | 'half') => {
    if (balance <= 0) return;
    const value = type === 'full' ? balance : Math.round(balance * 50) / 100;
    setAmount(value.toFixed(2));
  };

  const handleSave = async () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      showAlert(t('invalidAmount'), t('invalidAmountMsg'), [{ text: t('ok') }]);
      return;
    }

    if (!date) {
      showAlert(t('missingDate'), t('missingDateMsg'), [{ text: t('ok') }]);
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updatePayment({
          ...editPayment,
          amount: numericAmount,
          date,
          method,
          notes: notes.trim() || undefined,
        });
      } else {
        await addPayment({
          patientId,
          appointmentId: appointmentId || undefined,
          amount: numericAmount,
          date,
          method,
          notes: notes.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch (error) {
      showAlert(t('error'), t('failedToSavePayment'), [{ text: t('ok') }]);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    showAlert(t('deletePaymentTitle'), t('deletePaymentMsg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => deletePayment(paymentId),
      },
    ]);
  };

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('patientNotFound')}</Text>
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
              {t('charged')}: {formatCurrency(totalCharged)} | {t('paid')}: {formatCurrency(totalPaid)}
            </Text>
          </View>
        </View>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>{t('currentBalance')}</Text>
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
            <Text style={styles.quickButtonText}>{t('payFullBalance')}</Text>
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
        label={t('amount')}
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      {/* Date */}
      <Card>
        <Text style={styles.fieldLabel}>{t('dateLabel')}</Text>
        <DatePicker selectedDate={date} onSelectDate={setDate} />
      </Card>

      {/* Payment Method */}
      <Text style={styles.fieldLabel}>{t('paymentMethod')}</Text>
      <View style={styles.methodRow}>
        {PAYMENT_METHOD_KEYS.map((m) => (
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
              {t(m.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <Input
        label={t('notesOptional')}
        placeholder={t('addPaymentNotes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.notesInput}
      />

      {/* Save Button */}
      <Button
        title={isEditing ? t('updatePayment') : t('savePayment')}
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        size="lg"
        style={styles.saveButton}
      />

      {/* Payment History */}
      {allPaymentItems.length > 0 && (
        <Card style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.historyTitle}>{t('paymentHistory')}</Text>
          </View>
          {allPaymentItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.historyItem,
                index < allPaymentItems.length - 1 && styles.historyItemBorder,
              ]}
              activeOpacity={item.type === 'payment' ? 0.6 : 1}
              onPress={item.type === 'payment' && item.paymentRecord ? () => {
                navigation.push('AddPayment', {
                  patientId,
                  editPayment: item.paymentRecord,
                });
              } : undefined}
            >
              <View style={styles.historyItemLeft}>
                <View style={[styles.historyBadge, item.type === 'appointment' && styles.historyBadgeApt]}>
                  <Ionicons
                    name={
                      item.type === 'appointment' ? 'medical-outline' :
                      item.method === 'cash' ? 'cash-outline' :
                      item.method === 'card' ? 'card-outline' :
                      item.method === 'transfer' ? 'swap-horizontal-outline' :
                      'ellipsis-horizontal-outline'
                    }
                    size={14}
                    color={item.type === 'appointment' ? colors.primary : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.historyTopRow}>
                    <Text style={[styles.historyAmount, item.type === 'appointment' && { color: colors.primary }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                    <Text style={styles.historyMethodTag}>
                      {item.type === 'appointment' ? t('appointment') : (methodLabels[item.method!] ?? item.method)}
                    </Text>
                  </View>
                  <Text style={styles.historyMeta}>{formatDate(item.date)}</Text>
                  {item.appointmentTime && (
                    <View style={styles.historyAptLink}>
                      <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                      <Text style={styles.historyAptText}>{item.appointmentTime}</Text>
                    </View>
                  )}
                  {item.notes ? (
                    <Text style={styles.historyNotes} numberOfLines={2}>{item.notes}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.historyActions}>
                {item.type === 'payment' && (
                  <>
                    <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => handleDeletePayment(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </>
                )}
                {item.type === 'appointment' && (
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
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
  historyCard: {
    marginTop: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  historyTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  historyBadge: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.success,
  },
  historyMethodTag: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  historyMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyAptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  historyAptText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  historyNotes: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 16,
  },
  historyBadgeApt: {
    backgroundColor: colors.primaryBg,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  historyDeleteBtn: {
    padding: spacing.xs,
  },
});
