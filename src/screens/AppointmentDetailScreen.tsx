import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import ToothChart from '../components/ToothChart';
import CustomAlert, { useAlert } from '../components/CustomAlert';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { formatDate, formatCurrency, getPatientName, getAppointmentTotal } from '../utils/helpers';
import { wp } from '../utils/responsive';
import { AppointmentStatus } from '../types';

export default function AppointmentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { appointmentId } = route.params;
  const { appointments, patients, payments, patientFiles, updateAppointment, deleteAppointment } = useData();
  const { t } = useLanguage();
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const appointment = appointments.find((a) => a.id === appointmentId);

  if (!appointment) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundText}>{t('appointmentNotFound')}</Text>
      </View>
    );
  }

  const patientName = getPatientName(appointment.patientId, patients);
  const patient = patients.find((p) => p.id === appointment.patientId);
  const selectedTeeth = appointment.teethWork.map((tw) => tw.toothNumber);
  const materialsTotal = appointment.materialsUsed.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  );
  const additionalTotal = appointment.additionalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const total = getAppointmentTotal(appointment);
  const balance = total - appointment.amountPaid;
  const patientPayments = payments
    .filter((p) => p.patientId === appointment.patientId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const methodLabels: Record<string, string> = {
    cash: t('cash'),
    card: t('card'),
    transfer: t('transfer'),
    other: t('catOther'),
  };

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    const labels: Record<string, string> = {
      completed: t('markCompleted'),
      cancelled: t('cancelAppointment'),
      'no-show': t('markNoShow'),
    };

    showAlert(labels[newStatus], t('changeStatusConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: newStatus === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          await updateAppointment({ ...appointment, status: newStatus });
        },
      },
    ]);
  };

  const handleDelete = () => {
    showAlert(
      t('deleteAppointment'),
      t('deleteAppointmentMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteAppointment(appointment.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderStatusActions = () => {
    const { status } = appointment;
    if (status === 'cancelled') return null;

    return (
      <View style={styles.statusActions}>
        {status === 'scheduled' && (
          <>
            <Button
              title={t('markCompleted')}
              variant="primary"
              size="sm"
              icon={<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />}
              onPress={() => handleStatusChange('completed')}
              style={styles.statusButton}
            />
            <Button
              title={t('markNoShow')}
              variant="secondary"
              size="sm"
              icon={<Ionicons name="eye-off-outline" size={16} color={colors.primary} />}
              onPress={() => handleStatusChange('no-show')}
              style={styles.statusButton}
            />
            <Button
              title={t('cancelAppointment')}
              variant="danger"
              size="sm"
              icon={<Ionicons name="close-circle-outline" size={16} color={colors.danger} />}
              onPress={() => handleStatusChange('cancelled')}
              style={styles.statusButton}
            />
          </>
        )}
        {status === 'completed' && (
          <Button
            title={t('cancelAppointment')}
            variant="danger"
            size="sm"
            icon={<Ionicons name="close-circle-outline" size={16} color={colors.danger} />}
            onPress={() => handleStatusChange('cancelled')}
            style={styles.statusButton}
          />
        )}
        {status === 'no-show' && (
          <>
            <Button
              title={t('markCompleted')}
              variant="primary"
              size="sm"
              icon={<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />}
              onPress={() => handleStatusChange('completed')}
              style={styles.statusButton}
            />
            <Button
              title={t('cancelAppointment')}
              variant="danger"
              size="sm"
              icon={<Ionicons name="close-circle-outline" size={16} color={colors.danger} />}
              onPress={() => handleStatusChange('cancelled')}
              style={styles.statusButton}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerDate}>{formatDate(appointment.date)}</Text>
              <View style={styles.headerTimeRow}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.headerTime}>{appointment.time}</Text>
              </View>
            </View>
            <StatusBadge status={appointment.status} />
          </View>
          <Text style={styles.headerPatientName}>{patientName}</Text>
          {renderStatusActions()}
        </Card>

        {/* Patient Info */}
        {patient && (
          <Card
            onPress={() =>
              navigation.navigate('PatientDetail', { patientId: appointment.patientId })
            }
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('sectionPatient')}</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
                style={styles.chevron}
              />
            </View>
            <View style={styles.patientInfoRow}>
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {patient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patientDetails}>
                <Text style={styles.patientName}>{patient.name}</Text>
                {patient.phone ? (
                  <Text style={styles.patientMeta}>{patient.phone}</Text>
                ) : null}
                {patient.age ? (
                  <Text style={styles.patientMeta}>
                    {patient.age} {t('years')}{patient.gender ? ` - ${t(patient.gender)}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        )}

        {/* Chief Complaint & Diagnosis */}
        {(appointment.chiefComplaint || appointment.diagnosis) && (
          <Card>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('clinicalNotes')}</Text>
            </View>
            {appointment.chiefComplaint ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteLabel}>{t('chiefComplaint')}</Text>
                <View style={styles.noteBox}>
                  <ScrollView
                    style={styles.noteScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    persistentScrollbar
                    indicatorStyle="default"
                  >
                    <Text style={styles.noteValue}>{appointment.chiefComplaint}</Text>
                  </ScrollView>
                </View>
              </View>
            ) : null}
            {appointment.diagnosis ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteLabel}>{t('diagnosis')}</Text>
                <View style={styles.noteBox}>
                  <ScrollView
                    style={styles.noteScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    persistentScrollbar
                    indicatorStyle="default"
                  >
                    <Text style={styles.noteValue}>{appointment.diagnosis}</Text>
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </Card>
        )}

        {/* Tooth Chart */}
        {selectedTeeth.length > 0 && (
          <Card>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="medical-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('sectionToothChart')}</Text>
            </View>
            <ToothChart
              selectedTeeth={selectedTeeth}
              onToggleTooth={() => {}}
              readonly
            />
          </Card>
        )}

        {/* Teeth Work Details */}
        {appointment.teethWork.length > 0 && (
          <Card>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="construct-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('procedures')}</Text>
            </View>
            {appointment.teethWork.map((tw, index) => (
              <View
                key={`${tw.toothNumber}-${index}`}
                style={[
                  styles.toothWorkItem,
                  index < appointment.teethWork.length - 1 && styles.toothWorkItemBorder,
                ]}
              >
                <View style={styles.toothWorkHeader}>
                  <View style={styles.toothBadge}>
                    <Text style={styles.toothBadgeText}>#{tw.toothNumber}</Text>
                  </View>
                  <Text style={styles.toothProcedure}>{tw.procedure}</Text>
                </View>
                {tw.notes ? <Text style={styles.toothNotes}>{tw.notes}</Text> : null}
              </View>
            ))}
          </Card>
        )}

        {/* Materials Used */}
        {appointment.materialsUsed.length > 0 && (
          <Card>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('sectionMaterials')}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableCellName]}>{t('catMaterial')}</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellQty]}>{t('qty')}</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellCost]}>{t('unitCost')}</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellTotal]}>{t('total')}</Text>
            </View>
            {appointment.materialsUsed.map((mat, index) => (
              <View
                key={`${mat.name}-${index}`}
                style={[
                  styles.tableRow,
                  index % 2 === 0 && styles.tableRowAlt,
                ]}
              >
                <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>
                  {mat.name}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellQty]}>{mat.quantity}</Text>
                <Text style={[styles.tableCell, styles.tableCellCost]}>
                  {formatCurrency(mat.unitCost)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellTotal, styles.tableCellBold]}>
                  {formatCurrency(mat.quantity * mat.unitCost)}
                </Text>
              </View>
            ))}
            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalLabel}>{t('materialsTotal')}</Text>
              <Text style={styles.tableTotalValue}>{formatCurrency(materialsTotal)}</Text>
            </View>
          </Card>
        )}

        {/* Financial Breakdown */}
        <Card>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cash-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('financialSummary')}</Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>{t('procedureFee')}</Text>
            <Text style={styles.financeValue}>{formatCurrency(appointment.procedureFee)}</Text>
          </View>

          {materialsTotal > 0 && (
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>{t('materials')}</Text>
              <Text style={styles.financeValue}>{formatCurrency(materialsTotal)}</Text>
            </View>
          )}

          {appointment.additionalExpenses.map((exp, index) => (
            <View key={`${exp.description}-${index}`} style={styles.financeRow}>
              <View style={styles.financeExpenseLabel}>
                <Text style={styles.financeLabel}>{exp.description}</Text>
                <Text style={styles.financeCategory}>{exp.category}</Text>
              </View>
              <Text style={styles.financeValue}>{formatCurrency(exp.amount)}</Text>
            </View>
          ))}

          <View style={styles.financeDivider} />

          <View style={styles.financeRow}>
            <Text style={styles.financeTotalLabel}>{t('totalUpper')}</Text>
            <Text style={styles.financeTotalValue}>{formatCurrency(total)}</Text>
          </View>

          <View style={styles.financeSubDivider} />

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>{t('amountPaid')}</Text>
            <Text style={[styles.financeValue, { color: colors.success }]}>
              {formatCurrency(appointment.amountPaid)}
            </Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>{t('balanceRemaining')}</Text>
            <Text
              style={[
                styles.financeValue,
                { color: balance > 0 ? colors.danger : colors.success, fontWeight: '700' },
              ]}
            >
              {formatCurrency(balance)}
            </Text>
          </View>
        </Card>

        {/* Payment History */}
        <Card>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('paymentHistory')}</Text>
          </View>
          {patientPayments.length > 0 ? (
            patientPayments.map((pmt, index) => (
              <View
                key={pmt.id}
                style={[
                  styles.paymentItem,
                  index < patientPayments.length - 1 && styles.paymentItemBorder,
                ]}
              >
                <View style={styles.paymentItemLeft}>
                  <View style={styles.paymentMethodBadge}>
                    <Ionicons
                      name={
                        pmt.method === 'cash' ? 'cash-outline' :
                        pmt.method === 'card' ? 'card-outline' :
                        pmt.method === 'transfer' ? 'swap-horizontal-outline' :
                        'ellipsis-horizontal-outline'
                      }
                      size={14}
                      color={colors.success}
                    />
                  </View>
                  <View>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(pmt.amount)}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {formatDate(pmt.date)} · {methodLabels[pmt.method] ?? pmt.method}
                    </Text>
                    {pmt.notes ? (
                      <Text style={styles.paymentNotes} numberOfLines={1}>{pmt.notes}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyPayments}>{t('noPaymentsYet')}</Text>
          )}
        </Card>

        {/* Notes */}
        {appointment.notes ? (
          <Card>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('sectionNotes')}</Text>
            </View>
            <View style={styles.noteBox}>
              <ScrollView
                style={styles.noteScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                persistentScrollbar
                indicatorStyle="default"
              >
                <Text style={styles.noteValue}>{appointment.notes}</Text>
              </ScrollView>
            </View>
          </Card>
        ) : null}

        {/* Files & Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="images-outline" size={18} color={colors.primary} /> {t('filesAndImages')}
          </Text>
          <Card>
            {(() => {
              const linkedFiles = patientFiles
                .filter((f) => f.appointmentId === appointment.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              const images = linkedFiles.filter((f) => f.fileType === 'image');
              return (
                <>
                  {images.length > 0 ? (
                    <View style={styles.aptFilesGrid}>
                      {images.slice(0, 6).map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          style={styles.aptFileThumb}
                          onPress={() => navigation.navigate('FileViewer', { fileId: img.id })}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: img.localPath }} style={styles.aptFileImage} />
                          {img.notes ? (
                            <View style={styles.aptFileNotesBadge}>
                              <Text style={styles.aptFileNotesText} numberOfLines={1}>{img.notes}</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                      <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                      <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs }}>
                        {t('noFilesLinked')}
                      </Text>
                    </View>
                  )}
                  {linkedFiles.filter((f) => f.fileType !== 'image').length > 0 && (
                    <View style={{ marginTop: spacing.sm }}>
                      {linkedFiles.filter((f) => f.fileType !== 'image').map((doc) => (
                        <TouchableOpacity
                          key={doc.id}
                          style={styles.aptDocRow}
                          onPress={() => navigation.navigate('FileViewer', { fileId: doc.id })}
                        >
                          <Ionicons name="document-outline" size={18} color={colors.primary} />
                          <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text }} numberOfLines={1}>{doc.fileName}</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              );
            })()}
            <TouchableOpacity
              style={styles.aptFilesViewAll}
              onPress={() => navigation.navigate('PatientFiles', { patientId: appointment.patientId, appointmentId: appointment.id })}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.primary }}>
                {t('uploadManageFiles')}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {balance > 0 && (
            <Button
              title={t('recordPayment')}
              variant="primary"
              icon={<Ionicons name="wallet-outline" size={18} color="#fff" />}
              onPress={() =>
                navigation.navigate('AddPayment', {
                  patientId: appointment.patientId,
                  appointmentId: appointment.id,
                })
              }
              style={styles.actionButton}
            />
          )}

          <Button
            title={t('editAppointment')}
            variant="secondary"
            icon={<Ionicons name="create-outline" size={18} color={colors.primary} />}
            onPress={() => navigation.navigate('AddAppointment', { appointment })}
            style={styles.actionButton}
          />

          <Button
            title={t('deleteAppointment')}
            variant="danger"
            icon={<Ionicons name="trash-outline" size={18} color={colors.danger} />}
            onPress={handleDelete}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
      <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
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
    marginTop: spacing.sm,
  },

  // Header
  headerCard: {
    marginBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerDate: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  headerTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  headerTime: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  headerPatientName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },

  // Status Actions
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusButton: {
    flex: 0,
  },

  // Section Titles
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },

  // Patient Info
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  patientAvatar: {
    width: wp(44),
    height: wp(44),
    borderRadius: wp(22),
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  patientMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Clinical Notes
  noteBlock: {
    marginBottom: spacing.md,
  },
  noteLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  noteBox: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxHeight: wp(160),
    minHeight: wp(60),
  },
  noteScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noteValue: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },

  // Teeth Work
  toothWorkItem: {
    paddingVertical: spacing.sm,
  },
  toothWorkItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  toothWorkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toothBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  toothBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  toothProcedure: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  toothNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 44,
    lineHeight: 20,
  },

  // Materials Table
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
  },
  tableCell: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  tableCellName: {
    flex: 2,
    paddingRight: spacing.xs,
  },
  tableCellQty: {
    flex: 0.6,
    textAlign: 'center',
  },
  tableCellCost: {
    flex: 1.2,
    textAlign: 'right',
  },
  tableCellTotal: {
    flex: 1.2,
    textAlign: 'right',
  },
  tableCellBold: {
    fontWeight: '600',
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableTotalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  tableTotalValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },

  // Financial
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  financeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  financeExpenseLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  financeCategory: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  financeValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  financeDivider: {
    height: 2,
    backgroundColor: colors.text,
    marginVertical: spacing.sm,
    borderRadius: 1,
  },
  financeTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  financeTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  financeSubDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // Payment History
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  paymentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  paymentMethodBadge: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.success,
  },
  paymentMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentNotes: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyPayments: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },


  // Files section
  section: {
    marginTop: spacing.sm,
  },
  aptFilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aptFileThumb: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  aptFileImage: {
    width: '100%',
    height: '100%',
  },
  aptFileNotesBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  aptFileNotesText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  aptDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  aptFilesViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  // Action Buttons
  actionButtons: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
