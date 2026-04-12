import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { useLanguage } from '../i18n/LanguageContext';

interface TimePickerProps {
  value: string; // "HH:mm" in 24h format
  onChange: (time: string) => void;
  label?: string;
}

function parse24h(time: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number);
  const hour24 = isNaN(h) ? 9 : h;
  const minute = isNaN(m) ? 0 : m;
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return { hour: hour12, minute, period };
}

function to24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function formatDisplay(hour: number, minute: number, period: 'AM' | 'PM'): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
}

function clampHour(val: number): number {
  if (isNaN(val) || val < 1) return 1;
  if (val > 12) return 12;
  return val;
}

function clampMinute(val: number): number {
  if (isNaN(val) || val < 0) return 0;
  if (val > 59) return 59;
  return val;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const { t, isRTL } = useLanguage();
  const parsed = parse24h(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [modalVisible, setModalVisible] = useState(false);

  const [editingHour, setEditingHour] = useState(false);
  const [editingMinute, setEditingMinute] = useState(false);
  const [hourText, setHourText] = useState('');
  const [minuteText, setMinuteText] = useState('');
  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);

  // Sync with external value
  useEffect(() => {
    const p = parse24h(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const incrementHour = () => setHour((h) => (h >= 12 ? 1 : h + 1));
  const decrementHour = () => setHour((h) => (h <= 1 ? 12 : h - 1));
  const incrementMinute = () => setMinute((m) => (m >= 55 ? 0 : m + 5));
  const decrementMinute = () => setMinute((m) => (m <= 0 ? 55 : m - 5));

  const startEditHour = () => {
    setHourText(hour.toString().padStart(2, '0'));
    setEditingHour(true);
    setTimeout(() => hourInputRef.current?.focus(), 50);
  };

  const finishEditHour = () => {
    const val = parseInt(hourText, 10);
    setHour(clampHour(val));
    setEditingHour(false);
  };

  const startEditMinute = () => {
    setMinuteText(minute.toString().padStart(2, '0'));
    setEditingMinute(true);
    setTimeout(() => minuteInputRef.current?.focus(), 50);
  };

  const finishEditMinute = () => {
    const val = parseInt(minuteText, 10);
    setMinute(clampMinute(val));
    setEditingMinute(false);
  };

  const handleConfirm = () => {
    onChange(to24h(hour, minute, period));
    setModalVisible(false);
    setEditingHour(false);
    setEditingMinute(false);
  };

  const handleCancel = () => {
    const p = parse24h(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
    setModalVisible(false);
    setEditingHour(false);
    setEditingMinute(false);
  };

  const displayTime = formatDisplay(parsed.hour, parsed.minute, parsed.period);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, isRTL && styles.rtlText]}>{label}</Text>}
      <TouchableOpacity style={styles.display} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
        <Ionicons name="time-outline" size={20} color={colors.primary} />
        <Text style={styles.displayText}>{displayTime}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={handleCancel}>
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modal}>
                <Text style={styles.modalTitle}>{t('selectTime')}</Text>

                <View style={styles.pickerRow}>
                  {/* Hour Column */}
                  <View style={styles.column}>
                    <Text style={styles.columnLabel}>{t('hour')}</Text>
                    <TouchableOpacity style={styles.arrowBtn} onPress={incrementHour}>
                      <Ionicons name="chevron-up" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.valueBox} onPress={startEditHour} activeOpacity={0.7}>
                      {editingHour ? (
                        <TextInput
                          ref={hourInputRef}
                          style={styles.valueInput}
                          value={hourText}
                          onChangeText={(t) => setHourText(t.replace(/[^0-9]/g, '').slice(0, 2))}
                          onBlur={finishEditHour}
                          onSubmitEditing={finishEditHour}
                          keyboardType="number-pad"
                          maxLength={2}
                          selectTextOnFocus
                        />
                      ) : (
                        <Text style={styles.valueText}>{hour.toString().padStart(2, '0')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.arrowBtn} onPress={decrementHour}>
                      <Ionicons name="chevron-down" size={28} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.separator}>:</Text>

                  {/* Minute Column */}
                  <View style={styles.column}>
                    <Text style={styles.columnLabel}>{t('minute')}</Text>
                    <TouchableOpacity style={styles.arrowBtn} onPress={incrementMinute}>
                      <Ionicons name="chevron-up" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.valueBox} onPress={startEditMinute} activeOpacity={0.7}>
                      {editingMinute ? (
                        <TextInput
                          ref={minuteInputRef}
                          style={styles.valueInput}
                          value={minuteText}
                          onChangeText={(t) => setMinuteText(t.replace(/[^0-9]/g, '').slice(0, 2))}
                          onBlur={finishEditMinute}
                          onSubmitEditing={finishEditMinute}
                          keyboardType="number-pad"
                          maxLength={2}
                          selectTextOnFocus
                        />
                      ) : (
                        <Text style={styles.valueText}>{minute.toString().padStart(2, '0')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.arrowBtn} onPress={decrementMinute}>
                      <Ionicons name="chevron-down" size={28} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* AM/PM Toggle */}
                  <View style={styles.periodColumn}>
                    <TouchableOpacity
                      style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
                      onPress={() => setPeriod('AM')}
                    >
                      <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>
                        {isRTL ? 'ص' : 'AM'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
                      onPress={() => setPeriod('PM')}
                    >
                      <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>
                        {isRTL ? 'م' : 'PM'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preview */}
                <View style={styles.preview}>
                  <Ionicons name="time" size={18} color={colors.primary} />
                  <Text style={styles.previewText}>{formatDisplay(hour, minute, period)}</Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                    <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                    <Text style={styles.confirmBtnText}>{t('done')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rtlText: {
    textAlign: 'right',
  },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  displayText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadow.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  column: {
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  arrowBtn: {
    padding: spacing.xs,
  },
  valueBox: {
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
  },
  valueInput: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    padding: 0,
    minWidth: 40,
  },
  separator: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
  },
  periodColumn: {
    gap: spacing.sm,
    marginLeft: spacing.sm,
    marginTop: 20,
  },
  periodBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 56,
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textMuted,
  },
  periodTextActive: {
    color: colors.textOnPrimary,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  confirmBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});
