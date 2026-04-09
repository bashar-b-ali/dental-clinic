import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { formatDate, formatCurrency, getPatientBalance, getAppointmentTotal } from '../utils/helpers';
import { wp } from '../utils/responsive';

export default function PatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientId } = route.params;
  const { patients, appointments, payments, patientFiles, deletePatient } = useData();

  const patient = useMemo(
    () => patients.find((p) => p.id === patientId),
    [patients, patientId]
  );

  const patientAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.time.localeCompare(a.time);
        }),
    [appointments, patientId]
  );

  const financials = useMemo(
    () => getPatientBalance(patientId, appointments, payments),
    [patientId, appointments, payments]
  );

  const handleDelete = () => {
    if (!patient) return;

    const hasAppointments = patientAppointments.length > 0;
    const message = hasAppointments
      ? `This patient has ${patientAppointments.length} appointment(s). Deleting will remove the patient record but keep the appointment history. Are you sure?`
      : `Are you sure you want to delete ${patient.name}? This action cannot be undone.`;

    Alert.alert('Delete Patient', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePatient(patientId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!patient) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundText}>Patient not found</Text>
      </View>
    );
  }

  const infoItems = [
    { icon: 'call-outline' as const, label: 'Phone', value: patient.phone },
    { icon: 'mail-outline' as const, label: 'Email', value: patient.email },
    { icon: 'person-outline' as const, label: 'Age', value: patient.age ? `${patient.age} years` : undefined },
    { icon: 'male-female-outline' as const, label: 'Gender', value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : undefined },
  ].filter((item) => item.value);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {patient.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.memberSince}>
            Patient since {formatDate(patient.createdAt)}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('AddPatient', { patient })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.headerButtonText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.headerDivider} />
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.headerButtonText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patient Info */}
        {(infoItems.length > 0 || patient.medicalNotes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Information</Text>
            <Card>
              {infoItems.map((item, index) => (
                <View
                  key={item.label}
                  style={[
                    styles.infoRow,
                    index < infoItems.length - 1 && styles.infoRowBorder,
                  ]}
                >
                  <View style={styles.infoLabel}>
                    <Ionicons name={item.icon} size={18} color={colors.textMuted} />
                    <Text style={styles.infoLabelText}>{item.label}</Text>
                  </View>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              ))}
              {patient.medicalNotes ? (
                <View style={[styles.infoRow, infoItems.length > 0 && styles.infoRowBorder]}>
                  <View style={styles.notesSection}>
                    <View style={styles.infoLabel}>
                      <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                      <Text style={styles.infoLabelText}>Medical Notes</Text>
                    </View>
                    <Text style={styles.notesText}>{patient.medicalNotes}</Text>
                  </View>
                </View>
              ) : null}
            </Card>
          </View>
        )}

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <Card>
            <View style={styles.financeGrid}>
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>Total Charged</Text>
                <Text style={styles.financeValue}>
                  {formatCurrency(financials.totalCharged)}
                </Text>
              </View>
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>Total Paid</Text>
                <Text style={[styles.financeValue, { color: colors.success }]}>
                  {formatCurrency(financials.totalPaid)}
                </Text>
              </View>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Remaining Balance</Text>
              <Text
                style={[
                  styles.balanceValue,
                  {
                    color: financials.balance > 0 ? colors.danger : colors.success,
                    backgroundColor: financials.balance > 0 ? colors.dangerBg : colors.successBg,
                  },
                ]}
              >
                {formatCurrency(financials.balance)}
              </Text>
            </View>
            <View style={styles.paymentButtonWrapper}>
              <Button
                title="Record Payment"
                variant="secondary"
                size="sm"
                icon={<Ionicons name="card-outline" size={16} color={colors.primary} />}
                onPress={() => navigation.navigate('AddPayment', { patientId })}
              />
            </View>
          </Card>
        </View>

        {/* Files & Images */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Files & Images</Text>
            <Text style={styles.appointmentCount}>
              {patientFiles.filter((f) => f.patientId === patientId).length} files
            </Text>
          </View>
          {(() => {
            const files = patientFiles
              .filter((f) => f.patientId === patientId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const recentImages = files.filter((f) => f.fileType === 'image').slice(0, 4);
            return (
              <Card onPress={() => navigation.navigate('PatientFiles', { patientId })}>
                {recentImages.length > 0 ? (
                  <View style={styles.filePreviewGrid}>
                    {recentImages.map((img) => (
                      <TouchableOpacity
                        key={img.id}
                        style={styles.filePreviewThumb}
                        onPress={() => navigation.navigate('FileViewer', { fileId: img.id })}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: img.localPath }} style={styles.filePreviewImage} />
                      </TouchableOpacity>
                    ))}
                    {files.length > 4 && (
                      <View style={styles.filePreviewMore}>
                        <Text style={styles.filePreviewMoreText}>+{files.length - 4}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyAppointments}>
                    <Ionicons name="images-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No files yet</Text>
                  </View>
                )}
                <View style={styles.viewAllRow}>
                  <Text style={styles.viewAllText}>View all files</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              </Card>
            );
          })()}
          <Button
            title="Upload Files"
            variant="secondary"
            size="sm"
            icon={<Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />}
            onPress={() => navigation.navigate('PatientFiles', { patientId })}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appointment History</Text>
            <Text style={styles.appointmentCount}>
              {patientAppointments.length} {patientAppointments.length === 1 ? 'visit' : 'visits'}
            </Text>
          </View>

          {patientAppointments.length === 0 ? (
            <Card>
              <View style={styles.emptyAppointments}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyText}>No appointments yet</Text>
              </View>
            </Card>
          ) : (
            patientAppointments.map((apt) => {
              const total = getAppointmentTotal(apt);
              const procedures = apt.teethWork.map((t) => t.procedure);
              const uniqueProcedures = [...new Set(procedures)];

              return (
                <Card
                  key={apt.id}
                  onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: apt.id })}
                >
                  <View style={styles.aptHeader}>
                    <View style={styles.aptDateSection}>
                      <View style={styles.aptDateRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.aptDate}>{formatDate(apt.date)}</Text>
                      </View>
                      <View style={styles.aptDateRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.aptTime}>{apt.time}</Text>
                      </View>
                    </View>
                    <StatusBadge status={apt.status} />
                  </View>

                  {uniqueProcedures.length > 0 && (
                    <View style={styles.procedureRow}>
                      {uniqueProcedures.map((proc) => (
                        <View key={proc} style={styles.procedureChip}>
                          <Text style={styles.procedureChipText}>{proc}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {apt.chiefComplaint ? (
                    <Text style={styles.complaint} numberOfLines={1}>
                      {apt.chiefComplaint}
                    </Text>
                  ) : null}

                  <View style={styles.aptFooter}>
                    <Text style={styles.aptAmountLabel}>Amount</Text>
                    <Text style={styles.aptAmount}>{formatCurrency(total)}</Text>
                  </View>
                </Card>
              );
            })
          )}

          <View style={styles.newAppointmentButton}>
            <Button
              title="New Appointment"
              onPress={() => navigation.navigate('AddAppointment', { patientId })}
              icon={<Ionicons name="add-circle-outline" size={20} color={colors.textOnPrimary} />}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  notFoundText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  // Header
  headerCard: {
    backgroundColor: colors.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...shadow.md,
  },
  avatarLarge: {
    width: wp(72),
    height: wp(72),
    borderRadius: wp(36),
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarLargeText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
  },
  patientName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memberSince: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  headerDivider: {
    width: 1,
    height: wp(24),
    backgroundColor: colors.border,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  appointmentCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  notesSection: {
    flex: 1,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  // Financial
  financeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  financeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  financeValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm + 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  balanceValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  paymentButtonWrapper: {
    marginTop: spacing.md,
    alignItems: 'center',
  },

  // Appointments
  emptyAppointments: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  aptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  aptDateSection: {
    gap: 4,
  },
  aptDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aptDate: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  aptTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  procedureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  procedureChip: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  procedureChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  complaint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  aptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  aptAmountLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  aptAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  newAppointmentButton: {
    marginTop: spacing.md,
  },

  // File previews
  filePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filePreviewThumb: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  filePreviewImage: {
    width: '100%',
    height: '100%',
  },
  filePreviewMore: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewMoreText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
