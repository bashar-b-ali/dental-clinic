import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { useData } from '../context/DataContext';
import Button from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { formatDate, getPatientName } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;

function getFileIcon(fileType: string): keyof typeof Ionicons.glyphMap {
  switch (fileType) {
    case 'pdf':
      return 'document-text';
    case 'document':
      return 'document';
    default:
      return 'document-outline';
  }
}

export default function FileViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { fileId } = route.params;
  const { patientFiles, patients, appointments, updatePatientFile, deletePatientFile } = useData();

  const file = patientFiles.find((f) => f.id === fileId);

  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editedNotes, setEditedNotes] = useState(file?.notes ?? '');
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);

  if (!file) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <Text style={styles.notFoundText}>File not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="secondary" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const isImage = file.fileType === 'image';
  const patientName = getPatientName(file.patientId, patients);
  const linkedAppointment = file.appointmentId
    ? appointments.find((a) => a.id === file.appointmentId)
    : null;
  const patientAppointments = appointments.filter((a) => a.patientId === file.patientId);

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(file.localPath);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share file.');
    }
  };

  const handleSaveNotes = async () => {
    await updatePatientFile({ ...file, notes: editedNotes.trim() || undefined });
    setNotesModalVisible(false);
  };

  const handleLinkAppointment = async (appointmentId: string | undefined) => {
    await updatePatientFile({ ...file, appointmentId });
    setAppointmentModalVisible(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.fileName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePatientFile(file.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Image / File Preview */}
        {isImage ? (
          <View style={styles.imageContainer}>
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoomContainer}
            >
              <Image
                source={{ uri: file.localPath }}
                style={styles.image}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        ) : (
          <View style={styles.filePreviewContainer}>
            <Ionicons name={getFileIcon(file.fileType)} size={80} color={colors.textMuted} />
            <Text style={styles.filePreviewName} numberOfLines={2}>
              {file.fileName}
            </Text>
            <View style={styles.fileTypeBadgeLarge}>
              <Text style={styles.fileTypeBadgeLargeText}>{file.fileType.toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {/* File Name */}
          <Text style={styles.fileName}>{file.fileName}</Text>

          {/* File Type Badge */}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{file.fileType.toUpperCase()}</Text>
            </View>
          </View>

          {/* Info Rows */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Date Added</Text>
              <Text style={styles.infoValue}>{formatDate(file.createdAt)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Patient</Text>
              <Text style={styles.infoValue}>{patientName}</Text>
            </View>

            {linkedAppointment && (
              <View style={styles.infoRow}>
                <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Appointment</Text>
                <Text style={styles.infoValue}>
                  {formatDate(linkedAppointment.date)} at {linkedAppointment.time}
                </Text>
              </View>
            )}
          </View>

          {/* Notes */}
          <TouchableOpacity style={styles.notesSection} onPress={() => { setEditedNotes(file.notes ?? ''); setNotesModalVisible(true); }}>
            <View style={styles.notesSectionHeader}>
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.notesLabel}>Notes</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            <Text style={file.notes ? styles.notesText : styles.notesPlaceholder}>
              {file.notes || 'Tap to add notes...'}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title="Share"
              onPress={handleShare}
              variant="secondary"
              icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
              style={styles.actionButton}
            />
            <Button
              title="Edit Notes"
              onPress={() => { setEditedNotes(file.notes ?? ''); setNotesModalVisible(true); }}
              variant="secondary"
              icon={<Ionicons name="create-outline" size={18} color={colors.primary} />}
              style={styles.actionButton}
            />
            <Button
              title={file.appointmentId ? 'Change Appointment' : 'Link to Appointment'}
              onPress={() => setAppointmentModalVisible(true)}
              variant="secondary"
              icon={<Ionicons name="link-outline" size={18} color={colors.primary} />}
              style={styles.actionButton}
            />
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="danger"
              icon={<Ionicons name="trash-outline" size={18} color={colors.danger} />}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>

      {/* Back Button (floating) */}
      <TouchableOpacity
        style={[styles.backButton, isImage ? styles.backButtonDark : styles.backButtonLight]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={isImage ? '#fff' : colors.text} />
      </TouchableOpacity>

      {/* Notes Modal */}
      <Modal visible={notesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Notes</Text>
              <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Add notes about this file..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setNotesModalVisible(false)} variant="ghost" />
              <Button title="Save" onPress={handleSaveNotes} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Link Appointment Modal */}
      <Modal visible={appointmentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link to Appointment</Text>
              <TouchableOpacity onPress={() => setAppointmentModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.appointmentList}>
              {file.appointmentId && (
                <TouchableOpacity
                  style={styles.unlinkRow}
                  onPress={() => handleLinkAppointment(undefined)}
                >
                  <Ionicons name="unlink-outline" size={20} color={colors.danger} />
                  <Text style={styles.unlinkText}>Unlink Appointment</Text>
                </TouchableOpacity>
              )}

              {patientAppointments.length === 0 && (
                <Text style={styles.emptyText}>No appointments found for this patient.</Text>
              )}

              {patientAppointments.map((apt) => {
                const isLinked = apt.id === file.appointmentId;
                return (
                  <TouchableOpacity
                    key={apt.id}
                    style={[styles.appointmentRow, isLinked && styles.appointmentRowActive]}
                    onPress={() => handleLinkAppointment(apt.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appointmentDate}>
                        {formatDate(apt.date)} at {apt.time}
                      </Text>
                      {apt.chiefComplaint ? (
                        <Text style={styles.appointmentComplaint} numberOfLines={1}>
                          {apt.chiefComplaint}
                        </Text>
                      ) : null}
                    </View>
                    {isLinked && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="Close" onPress={() => setAppointmentModalVisible(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // Image display
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: '#111',
  },
  zoomContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },

  // Non-image file preview
  filePreviewContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  filePreviewName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  fileTypeBadgeLarge: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  fileTypeBadgeLargeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },

  // Back button
  backButton: {
    position: 'absolute',
    top: 48,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonDark: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backButtonLight: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Details card
  detailsCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    marginTop: -spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.xl,
  },
  fileName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // Info section
  infoSection: {
    marginTop: spacing.lg,
    gap: spacing.sm + 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 100,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },

  // Notes section
  notesSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  notesPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Actions
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  notesInput: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  // Appointment list
  appointmentList: {
    maxHeight: 320,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },
  appointmentRowActive: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  appointmentDate: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  appointmentComplaint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unlinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dangerBg,
    marginBottom: spacing.sm,
  },
  unlinkText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.danger,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
