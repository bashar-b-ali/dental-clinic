import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { verifyPassword } from '../utils/auth';
import { useLanguage } from '../i18n/LanguageContext';

interface LockScreenProps {
  doctorName?: string;
  onUnlock: () => void;
}

export default function LockScreen({ doctorName, onUnlock }: LockScreenProps) {
  const { t, language } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError(t('enterPassword'));
      shake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const valid = await verifyPassword(password);
      if (valid) {
        onUnlock();
      } else {
        setError(t('wrongPassword'));
        setPassword('');
        shake();
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const drPrefix = language === 'ar' ? 'د. ' : 'Dr. ';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/logo-128×128.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Welcome text */}
        <Text style={styles.welcomeText}>{t('welcomeBack')}</Text>
        {doctorName && (
          <Text style={styles.doctorName}>{drPrefix}{doctorName}</Text>
        )}

        {/* Password field */}
        <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={ms(20)} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              placeholder={t('enterPassword')}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleUnlock}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={ms(20)}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={ms(14)} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Unlock button */}
        <TouchableOpacity
          style={[styles.unlockButton, loading && styles.unlockButtonDisabled]}
          onPress={handleUnlock}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.unlockButtonText}>...</Text>
          ) : (
            <>
              <Ionicons name="lock-open-outline" size={ms(20)} color={colors.textOnPrimary} />
              <Text style={styles.unlockButtonText}>{t('unlock')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom branding */}
      <Text style={styles.branding}>MoBo Dental</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: wp(100),
    height: wp(100),
    borderRadius: wp(50),
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
  logo: {
    width: wp(70),
    height: wp(70),
  },
  welcomeText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  doctorName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    ...shadow.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: '500',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadow.md,
  },
  unlockButtonDisabled: {
    opacity: 0.6,
  },
  unlockButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  branding: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingBottom: spacing.xl,
  },
});
