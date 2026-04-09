import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { formatDate, getPatientName } from '../utils/helpers';
import { wp } from '../utils/responsive';
import * as storage from '../utils/storage';
import * as XLSX from 'xlsx';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { doctor, patients, appointments, payments, patientFiles, setDoctor, mergeData, refreshData } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(doctor?.name ?? '');
  const [editClinic, setEditClinic] = useState(doctor?.clinicName ?? '');
  const [editPhone, setEditPhone] = useState(doctor?.phone ?? '');
  const [exporting, setExporting] = useState(false);

  const handleSaveProfile = async () => {
    if (!doctor) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required.');
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
      Alert.alert('Export Failed', error.message || 'An error occurred while exporting data.');
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      const data = await storage.getAllData();
      const wb = XLSX.utils.book_new();

      // Patients sheet
      const patientsData = data.patients.map((p) => ({
        Name: p.name,
        Phone: p.phone || '',
        Email: p.email || '',
        Age: p.age || '',
        Gender: p.gender || '',
        Notes: p.medicalNotes || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientsData), 'Patients');

      // Appointments sheet with flattened data
      const aptsData = data.appointments.map((a) => ({
        Date: a.date,
        Time: a.time,
        Patient: getPatientName(a.patientId, data.patients),
        Status: a.status,
        Complaint: a.chiefComplaint || '',
        Diagnosis: a.diagnosis || '',
        Teeth: a.teethWork.map((t) => `#${t.toothNumber}: ${t.procedure}`).join('; '),
        Materials: a.materialsUsed.map((m) => `${m.name} x${m.quantity}`).join('; '),
        ProcedureFee: a.procedureFee,
        MaterialsCost: a.materialsUsed.reduce((s, m) => s + m.quantity * m.unitCost, 0),
        AdditionalExpenses: a.additionalExpenses.reduce((s, e) => s + e.amount, 0),
        AmountPaid: a.amountPaid,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aptsData), 'Appointments');

      // Payments sheet
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
      Alert.alert('Export Failed', error.message || 'An error occurred while exporting data.');
    } finally {
      setExporting(false);
    }
  };

  const importDataFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(content);

      if (!data.patients || !data.appointments || !data.payments) {
        Alert.alert('Invalid File', 'The selected file does not contain valid dental app data.');
        return;
      }

      const fileCount = data.patientFiles?.length ?? 0;
      const attachmentCount = data.fileAttachments?.length ?? 0;

      Alert.alert(
        'Import Data (Smart Merge)',
        `This will merge new records into your existing data.\nExisting records will NOT be overwritten.\n\nIncoming:\n- ${data.patients.length} patients\n- ${data.appointments.length} appointments\n- ${data.payments.length} payments\n- ${fileCount} files (${attachmentCount} with attachments)`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge',
            onPress: async () => {
              const stats = await mergeData(data);
              Alert.alert(
                'Import Complete',
                `Added:\n- ${stats.patientsAdded} new patients\n- ${stats.appointmentsAdded} new appointments\n- ${stats.paymentsAdded} new payments\n- ${stats.filesAdded} new files\n\nExisting records were kept unchanged.`
              );
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Import Failed', error.message || 'An error occurred while importing data.');
    }
  };

  const clearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Clear All',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete ALL patients, appointments, payments, and settings. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    await storage.clearAllData();
                    await refreshData();
                    Alert.alert('Done', 'All data has been cleared.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Doctor Profile */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="person-circle" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Doctor Profile</Text>
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
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View>
            <Input label="Name" value={editName} onChangeText={setEditName} placeholder="Dr. Name" />
            <Input label="Clinic Name" value={editClinic} onChangeText={setEditClinic} placeholder="Clinic name (optional)" />
            <Input label="Phone" value={editPhone} onChangeText={setEditPhone} placeholder="Phone (optional)" keyboardType="phone-pad" />
            <View style={styles.editActions}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={handleCancelEdit} />
              <Button title="Save" variant="primary" size="sm" onPress={handleSaveProfile} />
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{doctor?.name ?? '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="business" size={16} color={colors.textMuted} />
              <Text style={styles.profileLabel}>Clinic</Text>
              <Text style={styles.profileValue}>{doctor?.clinicName || '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="call" size={16} color={colors.textMuted} />
              <Text style={styles.profileLabel}>Phone</Text>
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
            <Text style={styles.sectionTitle}>Data Management</Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <Button
            title="Export as JSON"
            variant="secondary"
            size="md"
            onPress={exportJSON}
            loading={exporting}
            icon={<Ionicons name="code-download" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title="Export as Excel"
            variant="secondary"
            size="md"
            onPress={exportExcel}
            loading={exporting}
            icon={<Ionicons name="document" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title="Import Data"
            variant="secondary"
            size="md"
            onPress={importDataFromFile}
            icon={<Ionicons name="cloud-upload" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
          <View style={styles.dangerDivider} />
          <Button
            title="Clear All Data"
            variant="danger"
            size="md"
            onPress={clearData}
            icon={<Ionicons name="trash" size={18} color={colors.danger} />}
            style={styles.actionBtn}
          />
        </View>
      </Card>

      {/* App Info */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="information-circle" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>App Info</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Patients</Text>
            <Text style={styles.infoValue}>{patients.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Appointments</Text>
            <Text style={styles.infoValue}>{appointments.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Payments</Text>
            <Text style={styles.infoValue}>{payments.length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Files</Text>
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
              <Text style={styles.reportsTitle}>Financial Reports</Text>
              <Text style={styles.reportsSubtitle}>View analytics and insights</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </View>
      </Card>

      <View style={{ height: spacing.xl }} />
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
