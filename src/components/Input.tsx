import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, I18nManager } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../utils/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, isRTL && styles.rtlText]}>{label}</Text>}
      <TextInput
        style={[styles.input, isRTL && styles.rtlInput, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        textAlign={isRTL ? 'right' : 'left'}
        {...props}
      />
      {error && <Text style={[styles.error, isRTL && styles.rtlText]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    writingDirection: 'rtl',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
    color: colors.text,
  },
  rtlInput: {
    writingDirection: 'rtl',
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
