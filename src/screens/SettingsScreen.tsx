import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import CustomAlert, { useAlert } from '../components/CustomAlert';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { formatDate, getPatientName } from '../utils/helpers';
import { wp } from '../utils/responsive';
import * as storage from '../utils/storage';
import { clearPasswordHash } from '../utils/auth';
import { usePasswordAction } from '../navigation/AppNavigator';
import * as notifications from '../utils/notifications';
import * as XLSX from 'xlsx';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { doctor, patients, appointments, payments, patientFiles, setDoctor, mergeData, refreshData } = useData();
  const { t, language, setLanguage, setOnRestartNeeded } = useLanguage();
  const { onChangePassword } = usePasswordAction();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(doctor?.name ?? '');
  const [editClinic, setEditClinic] = useState(doctor?.clinicName ?? '');
  const [editPhone, setEditPhone] = useState(doctor?.phone ?? '');
  const [exporting, setExporting] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  useEffect(() => {
    notifications.getNotificationsEnabled().then(setNotificationsOn);
  }, []);

  // Register restart callback so language switch uses CustomAlert
  useEffect(() => {
    setOnRestartNeeded((title: string, msg: string) => {
      showAlert(title, msg, [{ text: t('ok') }]);
    });
    return () => setOnRestartNeeded(null);
  }, [setOnRestartNeeded, showAlert, t]);

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await notifications.requestPermissions();
      if (!granted) {
        showAlert(t('notificationPermDenied'), t('notificationPermDeniedMsg'), [{ text: t('ok') }]);
        return;
      }
      await notifications.setNotificationsEnabled(true);
      setNotificationsOn(true);
      // Schedule reminders for all upcoming appointments
      await notifications.rescheduleAllReminders(
        appointments,
        (patientId) => getPatientName(patientId, patients),
        language as 'en' | 'ar',
      );
    } else {
      await notifications.setNotificationsEnabled(false);
      setNotificationsOn(false);
    }
  }, [appointments, patients, language, showAlert, t]);

  const handleSaveProfile = async () => {
    if (!doctor) return;
    if (!editName.trim()) {
      showAlert(t('error'), t('pleaseSelectPatient'), [{ text: t('ok') }]);
      return;
    }
    await setDoctor({
      ...doctor,
      name: editName.trim(),
      clinicName: editClinic.trim() || undefined,
      phone: editPhone.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(doctor?.name ?? '');
    setEditClinic(doctor?.clinicName ?? '');
    setEditPhone(doctor?.phone ?? '');
    setIsEditing(false);
  };

  const exportJSON = async () => {
    try {
      setExporting(true);
      const data = await storage.getAllDataForExport();
      const json = JSON.stringify(data, null, 2);
      const fileName = `dental-backup-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(filePath, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(filePath);
    } catch (error: any) {
      showAlert(t('error'), error.message || t('exportErrorMsg'), [{ text: t('ok') }]);
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      const data = await storage.getAllData();
      const wb = XLSX.utils.book_new();

      const patientsData = data.patients.map((p) => ({
        Name: p.name,
        Phone: p.phone || '',
        Email: p.email || '',
        Age: p.age || '',
        Gender: p.gender || '',
        Notes: p.medicalNotes || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientsData), 'Patients');

      const aptsData = data.appointments.map((a) => ({
        Date: a.date,
        Time: a.time,
        Patient: getPatientName(a.patientId, data.patients),
        Status: a.status,
        Complaint: a.chiefComplaint || '',
        Diagnosis: a.diagnosis || '',
        Teeth: a.teethWork.map((tw) => `#${tw.toothNumber}: ${tw.procedure}`).join('; '),
        Materials: a.materialsUsed.map((m) => `${m.name} x${m.quantity}`).join('; '),
        ProcedureFee: a.procedureFee,
        MaterialsCost: a.materialsUsed.reduce((s, m) => s + m.quantity * m.unitCost, 0),
        AdditionalExpenses: a.additionalExpenses.reduce((s, e) => s + e.amount, 0),
        AmountPaid: a.amountPaid,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aptsData), 'Appointments');

      const paysData = data.payments.map((p) => ({
        Date: p.date,
        Patient: getPatientName(p.patientId, data.patients),
        Amount: p.amount,
        Method: p.method,
        Notes: p.notes || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paysData), 'Payments');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `dental-data-${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(filePath, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(filePath);
    } catch (error: any) {
      showAlert(t('error'), error.message || t('exportErrorMsg'), [{ text: t('ok') }]);
    } finally {
      setExporting(false);
    }
  };

  const importDataFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(content);

      if (!data.patients || !data.appointments || !data.payments) {
        showAlert(t('error'), t('invalidMergeFile'), [{ text: t('ok') }]);
        return;
      }

      const fileCount = data.patientFiles?.length ?? 0;
      const attachmentCount = data.fileAttachments?.length ?? 0;

      showAlert(
        `${t('importData')} (${t('smartMerge')})`,
        `${t('mergeDescription')}\n\n${t('mergeIncoming')}\n- ${t('mergePatients').replace('{count}', data.patients.length)}\n- ${t('mergeAppointments').replace('{count}', data.appointments.length)}\n- ${t('mergePayments').replace('{count}', data.payments.length)}\n- ${t('mergeFiles').replace('{count}', String(fileCount)).replace('{attachments}', String(attachmentCount))}`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('mergeBtn'),
            onPress: async () => {
              const stats = await mergeData(data);
              showAlert(
                t('done'),
                `${t('mergeAdded')}\n- ${t('mergeNewPatients').replace('{count}', String(stats.patientsAdded))}\n- ${t('mergeNewAppointments').replace('{count}', String(stats.appointmentsAdded))}\n- ${t('mergeNewPayments').replace('{count}', String(stats.paymentsAdded))}\n- ${t('mergeNewFiles').replace('{count}', String(stats.filesAdded))}\n\n${t('recordsKept')}`,
                [{ text: t('ok') }]
              );
            },
          },
        ]
      );
    } catch (error: any) {
      showAlert(t('error'), error.message || t('importErrorMsg'), [{ text: t('ok') }]);
    }
  };

  const clearData = () => {
    showAlert(
      t('clearAllData'),
      t('clearConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: () => {
            showAlert(
              t('finalConfirmation'),
              t('clearFinalMsg'),
              [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('delete'),
                  style: 'destructive',
                  onPress: async () => {
                    await storage.clearAllData();
                    await clearPasswordHash();
                    await refreshData();
                    showAlert(t('done'), t('clearSuccess'), [
                      { text: t('ok') },
                    ]);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    const title = language === 'ar' ? 'Change Language' : 'تغيير اللغة';
    const message = language === 'ar'
      ? 'Switch to English?'
      : 'هل تريد التبديل إلى العربية؟';
    showAlert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: language === 'ar' ? 'English' : 'العربية',
        onPress: () => setLanguage(newLang),
      },
    ], { icon: 'language' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      {/* Language Toggle */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="language" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('language')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.languageToggle}
          onPress={toggleLanguage}
          activeOpacity={0.7}
        >
          <View style={styles.languageRow}>
            <Text style={styles.languageCurrent}>
              {language === 'en' ? 'English' : 'العربية'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Notifications */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('notifications')}</Text>
          </View>
        </View>
        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>{t('appointmentReminders')}</Text>
            <Text style={styles.notificationDesc}>{t('appointmentRemindersDesc')}</Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={notificationsOn ? colors.primary : colors.textMuted}
          />
        </View>
        <Text style={styles.notificationStatus}>
          {notificationsOn ? t('notificationsEnabled') : t('notificationsDisabled')}
        </Text>
      </Card>

      {/* Security */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('security')}</Text>
          </View>
        </View>
        <Button
          title={t('changePassword')}
          variant="secondary"
          size="md"
          onPress={onChangePassword}
          icon={<Ionicons name="key-outline" size={18} color={colors.primary} />}
          style={styles.actionBtn}
        />
      </Card>

      {/* Doctor Profile */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="person-circle" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('doctorProfile')}</Text>
          </View>
          {!isEditing && (
            <TouchableOpacity
              onPress={() => {
                setEditName(doctor?.name ?? '');
                setEditClinic(doctor?.clinicName ?? '');
                setEditPhone(doctor?.phone ?? '');
                setIsEditing(true);
              }}
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.editBtnText}>{t('edit')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View>
            <Input label={t('name')} value={editName} onChangeText={setEditName} placeholder="Dr. Name" />
            <Input label={t('clinicName')} value={editClinic} onChangeText={setEditClinic} placeholder={t('clinicNamePlaceholder')} />
            <Input label={t('phone')} value={editPhone} onChangeText={setEditPhone} placeholder={t('phonePlaceholder')} keyboardType="phone-pad" />
            <View style={styles.editActions}>
              <Button title={t('cancel')} variant="ghost" size="sm" onPress={handleCancelEdit} />
              <Button title={t('save')} variant="primary" size="sm" onPress={handleSaveProfile} />
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
              <Text style={styles.profileLabel}>{t('name')}</Text>
              <Text style={styles.profileValue}>{doctor?.name ?? '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="business" size={16} color={colors.textMuted} />
              <Text style={styles.profileLabel}>{t('clinicName')}</Text>
              <Text style={styles.profileValue}>{doctor?.clinicName || '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="call" size={16} color={colors.textMuted} />
              <Text style={styles.profileLabel}>{t('phone')}</Text>
              <Text style={styles.profileValue}>{doctor?.phone || '-'}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Data Management */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="server" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('dataManagement')}</Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <Button
            title={t('exportJson')}
            variant="secondary"
            size="md"
            onPress={exportJSON}
            loading={exporting}
            icon={<Ionicons name="code-download" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title={t('exportExcel')}
            variant="secondary"
            size="md"
            onPress={exportExcel}
            loading={exporting}
            icon={<Ionicons name="document" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title={t('importData')}
            variant="secondary"
            size="md"
            onPress={importDataFromFile}
            icon={<Ionicons name="cloud-upload" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
        </View>
      </Card>

      {/* App Info */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="information-circle" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('appInfo')}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('version')}</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('tab_patients')}</Text>
            <Text style={styles.infoValue}>{patients.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('tab_appointments')}</Text>
            <Text style={styles.infoValue}>{appointments.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('sectionPayment')}</Text>
            <Text style={styles.infoValue}>{payments.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('files')}</Text>
            <Text style={styles.infoValue}>{patientFiles.length}</Text>
          </View>
        </View>
      </Card>

      {/* Reports Navigation */}
      <Card
        style={styles.reportsCard}
        onPress={() => navigation.navigate('Reports')}
      >
        <View style={styles.reportsRow}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="stats-chart" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.reportsTitle}>{t('financialReports')}</Text>
              <Text style={styles.reportsSubtitle}>{t('viewAnalytics')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </View>
      </Card>

      <View style={{ height: spacing.xl }} />

      <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
  },
  sectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.full,
  },
  editBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  profileInfo: {
    gap: spacing.sm + 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: wp(60),
    fontWeight: '500',
  },
  profileValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  // Notifications
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  notificationInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  notificationDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notificationStatus: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  // Language toggle
  languageToggle: {
    marginTop: -spacing.xs,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  languageCurrent: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  actionBtn: {
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoItem: {
    width: '47%',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  reportsCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  reportsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  reportsSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  iconCircle: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
