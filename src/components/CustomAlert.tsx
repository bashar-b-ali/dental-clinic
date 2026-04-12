import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

interface CustomAlertProps extends AlertConfig {
  onDismiss: () => void;
}

export default function CustomAlert({ visible, title, message, buttons, icon, iconColor, onDismiss }: CustomAlertProps) {
  const handleButtonPress = (button: AlertButton) => {
    onDismiss();
    button.onPress?.();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return { bg: colors.dangerBg, text: colors.danger, border: colors.danger };
      case 'cancel':
        return { bg: colors.borderLight, text: colors.textSecondary, border: colors.border };
      default:
        return { bg: colors.primary, text: colors.textOnPrimary, border: colors.primary };
    }
  };

  const getIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    if (icon) return { name: icon, color: iconColor || colors.primary };
    // Auto-detect based on button styles
    const hasDestructive = buttons.some((b) => b.style === 'destructive');
    if (hasDestructive) return { name: 'warning-outline', color: colors.danger };
    return { name: 'information-circle-outline', color: colors.primary };
  };

  const alertIcon = getIcon();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={[styles.iconCircle, { backgroundColor: alertIcon.color + '15' }]}>
                <Ionicons name={alertIcon.name} size={32} color={alertIcon.color} />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttonRow}>
                {buttons.map((button, index) => {
                  const btnStyle = getButtonStyle(button.style);
                  const isCancel = button.style === 'cancel';
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        {
                          backgroundColor: btnStyle.bg,
                          borderColor: btnStyle.border,
                          borderWidth: isCancel ? 1 : 0,
                        },
                        buttons.length === 1 && styles.buttonFull,
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          { color: btnStyle.text },
                          button.style === 'destructive' && styles.buttonTextBold,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Helper hook for easier usage
import { useState, useCallback } from 'react';

export function useAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback(
    (title: string, message: string, buttons: AlertButton[], options?: { icon?: keyof typeof Ionicons.glyphMap; iconColor?: string }) => {
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons,
        icon: options?.icon,
        iconColor: options?.iconColor,
      });
    },
    []
  );

  const dismissAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  return { alertConfig, showAlert, dismissAlert };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadow.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  buttonTextBold: {
    fontWeight: '700',
  },
});
