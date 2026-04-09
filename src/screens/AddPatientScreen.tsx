import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { wp } from '../utils/responsive';
import { Patient } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function AddPatientScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addPatient, updatePatient } = useData();
  const { t } = useLanguage();

  const existingPatient: Patient | undefined = route.params?.patient;
  const isEditing = !!existingPatient;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Patient['gender'] | undefined>(undefined);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingPatient) {
      setName(existingPatient.name);
      setPhone(existingPatient.phone ?? '');
      setEmail(existingPatient.email ?? '');
      setAge(existingPatient.age != null ? String(existingPatient.age) : '');
      setGender(existingPatient.gender);
      setMedicalNotes(existingPatient.medicalNotes ?? '');
    }
  }, [existingPatient]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('patientNameRequired'));
      return;
    }
    setNameError('');

    setSaving(true);
    try {
      const parsedAge = age.trim() ? parseInt(age.trim(), 10) : undefined;

      if (isEditing && existingPatient) {
        await updatePatient({
          ...existingPatient,
          name: trimmedName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          age: parsedAge,
          gender,
          medicalNotes: medicalNotes.trim() || undefined,
        });
      } else {
        await addPatient({
          name: trimmedName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          age: parsedAge,
          gender,
          medicalNotes: medicalNotes.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert(t('error'), t('failedToSavePatient'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>{isEditing ? t('editPatient') : t('newPatient')}</Text>

        <Input
          label={t('name') + ' *'}
          placeholder={t('fullName')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError('');
          }}
          error={nameError}
          autoCapitalize="words"
        />

        <Input
          label={t('phone')}
          placeholder={t('phoneNumber')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          label={t('email')}
          placeholder={t('emailAddress')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label={t('age')}
          placeholder={t('age')}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        {/* Gender selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('gender')}</Text>
          <View style={styles.genderRow}>
            {([
              { label: t('male'), value: 'male' as Patient['gender'] },
              { label: t('female'), value: 'female' as Patient['gender'] },
              { label: t('other'), value: 'other' as Patient['gender'] },
            ]).map((opt) => {
              const selected = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.genderButton, selected && styles.genderButtonSelected]}
                  onPress={() => setGender(selected ? undefined : opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderText, selected && styles.genderTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Input
          label={t('medicalNotes')}
          placeholder={t('medicalNotesPlaceholder')}
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          multiline
          numberOfLines={4}
          style={styles.multilineInput}
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <Button
            title={isEditing ? t('saveChanges') : t('addPatient')}
            onPress={handleSave}
            loading={saving}
            size="lg"
            style={styles.saveButton}
          />
          <Button
            title={t('cancel')}
            onPress={() => navigation.goBack()}
            variant="ghost"
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  header: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  genderButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  genderTextSelected: {
    color: colors.textOnPrimary,
  },
  multilineInput: {
    minHeight: wp(100),
    paddingTop: spacing.sm + 4,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  saveButton: {
    width: '100%',
  },
});
