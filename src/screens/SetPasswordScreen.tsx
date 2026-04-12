import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert, { useAlert } from '../components/CustomAlert';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { hashPassword, savePasswordHash, verifyPassword } from '../utils/auth';
import { useLanguage } from '../i18n/LanguageContext';

interface SetPasswordScreenProps {
  isChangeMode: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

const MIN_PASSWORD_LENGTH = 4;

export default function SetPasswordScreen({ isChangeMode, onComplete, onCancel }: SetPasswordScreenProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isChangeMode && !currentPassword) {
      newErrors.current = t('enterCurrentPassword');
    }

    if (!newPassword) {
      newErrors.new = t('enterNewPassword');
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      newErrors.new = t('passwordTooShort');
    }

    if (!confirmPassword) {
      newErrors.confirm = t('confirmYourPassword');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = t('passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Verify current password if changing
      if (isChangeMode) {
        const valid = await verifyPassword(currentPassword);
        if (!valid) {
          setErrors({ current: t('wrongPassword') });
          setLoading(false);
          return;
        }
      }

      const hash = await hashPassword(newPassword);
      await savePasswordHash(hash);

      showAlert(
        t('done'),
        isChangeMode ? t('passwordChanged') : t('passwordSet'),
        [{ text: t('ok'), onPress: onComplete }],
      );
    } catch {
      showAlert(t('error'), t('failedToSave'), [{ text: t('ok') }]);
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggleShow: () => void,
    errorKey: string,
    placeholder: string,
    autoFocus?: boolean,
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrapper, errors[errorKey] && styles.inputError]}>
        <Ionicons
          name="lock-closed-outline"
          size={ms(18)}
          color={errors[errorKey] ? colors.danger : colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            onChange(text);
            if (errors[errorKey]) {
              setErrors((prev) => { const n = { ...prev }; delete n[errorKey]; return n; });
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!show}
          autoFocus={autoFocus}
        />
        <TouchableOpacity onPress={toggleShow} style={styles.eyeButton}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={ms(18)}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {errors[errorKey] ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={ms(13)} color={colors.danger} />
          <Text style={styles.errorText}>{errors[errorKey]}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button for change mode */}
        {isChangeMode && onCancel && (
          <TouchableOpacity style={styles.backButton} onPress={onCancel} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={ms(22)} color={colors.text} />
            <Text style={styles.backButtonText}>{t('back')}</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isChangeMode ? 'key-outline' : 'shield-checkmark-outline'}
              size={ms(36)}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {isChangeMode ? t('changePassword') : t('setYourPassword')}
          </Text>
          <Text style={styles.subtitle}>
            {isChangeMode ? t('changePasswordDesc') : t('setPasswordDesc')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {isChangeMode &&
            renderPasswordField(
              t('currentPassword'),
              currentPassword,
              setCurrentPassword,
              showCurrent,
              () => setShowCurrent(!showCurrent),
              'current',
              '••••••',
              true,
            )}

          {renderPasswordField(
            isChangeMode ? t('newPassword') : t('password'),
            newPassword,
            setNewPassword,
            showNew,
            () => setShowNew(!showNew),
            'new',
            '••••••',
            !isChangeMode,
          )}

          {renderPasswordField(
            t('confirmPassword'),
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            () => setShowConfirm(!showConfirm),
            'confirm',
            '••••••',
          )}

          {/* Password requirements hint */}
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={ms(14)} color={colors.textMuted} />
            <Text style={styles.hintText}>
              {t('passwordMinLength')}
            </Text>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isChangeMode ? 'checkmark-circle' : 'shield-checkmark'}
              size={ms(22)}
              color={colors.textOnPrimary}
            />
            <Text style={styles.saveButtonText}>
              {loading ? '...' : isChangeMode ? t('changePassword') : t('setPassword')}
            </Text>
          </TouchableOpacity>
        </View>

        <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: wp(80),
    height: wp(80),
    borderRadius: wp(40),
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadow.md,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
    color: colors.text,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '500',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadow.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
