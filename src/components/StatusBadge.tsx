import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../utils/theme';
import { AppointmentStatus } from '../types';

const statusConfig: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  scheduled: { bg: colors.primaryBg, text: colors.primary, label: 'Scheduled' },
  completed: { bg: colors.successBg, text: colors.success, label: 'Completed' },
  cancelled: { bg: colors.dangerBg, text: colors.danger, label: 'Cancelled' },
  'no-show': { bg: colors.warningBg, text: colors.warning, label: 'No Show' },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
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
