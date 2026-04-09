import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../utils/theme';
import { wp } from '../utils/responsive';

interface ToothChartProps {
  selectedTeeth: number[];
  onToggleTooth: (tooth: number) => void;
  readonly?: boolean;
}

// Universal dental numbering (1-32 for adults)
const upperTeeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const lowerTeeth = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

function ToothButton({ number, selected, onPress, readonly }: {
  number: number;
  selected: boolean;
  onPress: () => void;
  readonly?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.tooth, selected && styles.toothSelected]}
      onPress={onPress}
      disabled={readonly}
      activeOpacity={0.7}
    >
      <Text style={[styles.toothText, selected && styles.toothTextSelected]}>
        {number}
      </Text>
    </TouchableOpacity>
  );
}

export default function ToothChart({ selectedTeeth, onToggleTooth, readonly }: ToothChartProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Upper Jaw</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {upperTeeth.map((t) => (
            <ToothButton
              key={t}
              number={t}
              selected={selectedTeeth.includes(t)}
              onPress={() => onToggleTooth(t)}
              readonly={readonly}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.divider} />
      <Text style={styles.label}>Lower Jaw</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {lowerTeeth.map((t) => (
            <ToothButton
              key={t}
              number={t}
              selected={selectedTeeth.includes(t)}
              onPress={() => onToggleTooth(t)}
              readonly={readonly}
            />
          ))}
        </View>
      </ScrollView>
      {selectedTeeth.length > 0 && (
        <Text style={styles.selectedLabel}>
          Selected: {selectedTeeth.sort((a,b) => a-b).join(', ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  tooth: {
    width: wp(36),
    height: wp(36),
    borderRadius: borderRadius.sm,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toothSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  toothText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toothTextSelected: {
    color: '#fff',
  },
  divider: {
    height: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    borderRadius: 1,
  },
  selectedLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
