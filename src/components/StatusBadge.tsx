import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../utils/theme';
import { useLanguage } from '../i18n/LanguageContext';
import { AppointmentStatus } from '../types';

const statusKeys: Record<AppointmentStatus, { bg: string; text: string; labelKey: string }> = {
  scheduled: { bg: colors.primaryBg, text: colors.primary, labelKey: 'statusScheduled' },
  completed: { bg: colors.successBg, text: colors.success, labelKey: 'statusCompleted' },
  cancelled: { bg: colors.dangerBg, text: colors.danger, labelKey: 'statusCancelled' },
  'no-show': { bg: colors.warningBg, text: colors.warning, labelKey: 'statusNoShow' },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useLanguage();
  const config = statusKeys[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{t(config.labelKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
