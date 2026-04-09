import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useData } from '../context/DataContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { wp, ms } from '../utils/responsive';
import { generateId } from '../utils/helpers';

export default function OnboardingScreen() {
  const { setDoctor, completeOnboarding, importData } = useData();

  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleGetStarted = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Please enter your name');
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const doctor = {
        id: generateId(),
        name: trimmedName,
        clinicName: clinicName.trim() || undefined,
        phone: phone.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await setDoctor(doctor);
      await completeOnboarding();
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file?.uri) return;

      setImporting(true);
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = JSON.parse(content);

      if (!data.doctor || !data.patients || !data.appointments || !data.payments) {
        Alert.alert(
          'Invalid File',
          'The selected file does not contain valid MoBo data. Please ensure it has doctor, patients, appointments, and payments.'
        );
        return;
      }

      await importData(data);
      Alert.alert('Success', 'Data imported successfully!');
    } catch (error) {
      Alert.alert('Import Failed', 'Could not read or parse the selected file. Please ensure it is a valid JSON file.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header area */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Image
              source={require('../../assets/logo-128×128.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome to MoBo</Text>
          <Text style={styles.subtitle}>
            Your smart dental practice companion.{'\n'}Let's get you set up in seconds.
          </Text>
        </View>

        {/* Form area */}
        <View style={styles.form}>
          <Input
            label="Doctor's Name"
            placeholder="e.g. Dr. Sharma"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError('');
            }}
            error={nameError}
            autoCapitalize="words"
            autoFocus
          />

          <Input
            label="Clinic Name (optional)"
            placeholder="e.g. Smile Dental Clinic"
            value={clinicName}
            onChangeText={setClinicName}
            autoCapitalize="words"
          />

          <Input
            label="Phone (optional)"
            placeholder="e.g. 9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.buttonGroup}>
            <Button
              title="Get Started"
              onPress={handleGetStarted}
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || importing}
              icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Import Existing Data"
              onPress={handleImport}
              variant="secondary"
              size="lg"
              loading={importing}
              disabled={loading || importing}
              icon={<Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.primaryBg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    paddingTop: spacing.xl * 3,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: wp(110),
    height: wp(110),
    borderRadius: wp(55),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: wp(80),
    height: wp(80),
  },
  title: {
    fontSize: fontSize.xxl ?? 28,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: borderRadius.xl ?? 24,
    borderTopRightRadius: borderRadius.xl ?? 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGroup: {
    marginTop: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
