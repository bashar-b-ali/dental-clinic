import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { formatDate } from '../utils/helpers';
import { copyFileToPrivate } from '../utils/storage';
import { PatientFile } from '../types';

type FilterTab = 'all' | 'images' | 'documents';

interface PendingFile {
  localPath: string;
  fileName: string;
  fileType: 'image' | 'pdf' | 'document';
  mimeType: string;
}

interface FileSection {
  title: string;
  subtitle?: string;
  appointmentId?: string;
  data: PatientFile[];
}

function getFileTypeFromMime(mimeType?: string): 'image' | 'pdf' | 'document' {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'document';
}

function getDocIcon(fileType: string): keyof typeof Ionicons.glyphMap {
  switch (fileType) {
    case 'pdf':
      return 'document-text';
    case 'image':
      return 'image';
    default:
      return 'document-outline';
  }
}

export default function PatientFilesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { patientId, appointmentId } = route.params as {
    patientId: string;
    appointmentId?: string;
  };

  const { patients, appointments, patientFiles, addPatientFile, updatePatientFile, deletePatientFile } = useData();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [fabOpen, setFabOpen] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [notesText, setNotesText] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFile, setEditingFile] = useState<PatientFile | null>(null);
  const [editNotesText, setEditNotesText] = useState('');

  const patient = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId]);
  const filteredAppointment = useMemo(
    () => (appointmentId ? appointments.find((a) => a.id === appointmentId) : null),
    [appointments, appointmentId],
  );

  const files = useMemo(() => {
    let result = patientFiles.filter((f) => f.patientId === patientId);
    if (appointmentId) {
      result = result.filter((f) => f.appointmentId === appointmentId);
    }
    if (activeTab === 'images') {
      result = result.filter((f) => f.fileType === 'image');
    } else if (activeTab === 'documents') {
      result = result.filter((f) => f.fileType !== 'image');
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [patientFiles, patientId, appointmentId, activeTab]);

  const sections = useMemo((): FileSection[] => {
    if (appointmentId || activeTab !== 'all') return [];

    const appointmentMap = new Map(appointments.map((a) => [a.id, a]));
    const grouped = new Map<string, PatientFile[]>();
    const unlinked: PatientFile[] = [];

    for (const file of files) {
      if (file.appointmentId) {
        const existing = grouped.get(file.appointmentId) ?? [];
        existing.push(file);
        grouped.set(file.appointmentId, existing);
      } else {
        unlinked.push(file);
      }
    }

    const result: FileSection[] = [];
    const sortedEntries = [...grouped.entries()].sort(([aId], [bId]) => {
      const aDate = appointmentMap.get(aId)?.date ?? '';
      const bDate = appointmentMap.get(bId)?.date ?? '';
      return bDate.localeCompare(aDate);
    });

    for (const [aptId, aptFiles] of sortedEntries) {
      const apt = appointmentMap.get(aptId);
      const procedures = apt?.teethWork.map((tw) => tw.procedure).join(', ') ?? '';
      result.push({
        title: apt ? formatDate(apt.date) : 'Unknown Appointment',
        subtitle: procedures || undefined,
        appointmentId: aptId,
        data: aptFiles,
      });
    }

    if (unlinked.length > 0) {
      result.push({
        title: 'Unlinked Files',
        subtitle: 'Not linked to any appointment',
        data: unlinked,
      });
    }

    return result;
  }, [files, appointments, appointmentId, activeTab]);

  // --- Upload flow ---

  const finishUpload = async (filesToUpload: PendingFile[], notes: string) => {
    for (const pf of filesToUpload) {
      await addPatientFile({
        patientId,
        appointmentId: appointmentId ?? undefined,
        fileName: pf.fileName,
        fileType: pf.fileType,
        mimeType: pf.mimeType,
        localPath: pf.localPath,
        notes: notes || undefined,
      });
    }
  };

  const showNotesModal = (pending: PendingFile[]) => {
    setPendingFiles(pending);
    setNotesText('');
    setNotesModalVisible(true);
  };

  const handleSaveNotes = async () => {
    setNotesModalVisible(false);
    await finishUpload(pendingFiles, notesText);
    setPendingFiles([]);
  };

  const handleSkipNotes = async () => {
    setNotesModalVisible(false);
    await finishUpload(pendingFiles, '');
    setPendingFiles([]);
  };

  const handleTakePhoto = async () => {
    setFabOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
    const localPath = await copyFileToPrivate(asset.uri, fileName);
    const mimeType = asset.mimeType ?? 'image/jpeg';

    showNotesModal([{ localPath, fileName, fileType: getFileTypeFromMime(mimeType), mimeType }]);
  };

  const handlePickFromGallery = async () => {
    setFabOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to choose photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const pending: PendingFile[] = [];
    for (const asset of result.assets) {
      const fileName = asset.fileName ?? `photo_${Date.now()}_${pending.length}.jpg`;
      const localPath = await copyFileToPrivate(asset.uri, fileName);
      const mimeType = asset.mimeType ?? 'image/jpeg';
      pending.push({ localPath, fileName, fileType: getFileTypeFromMime(mimeType), mimeType });
    }

    showNotesModal(pending);
  };

  const handlePickDocument = async () => {
    setFabOpen(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const fileName = asset.name ?? `document_${Date.now()}`;
    const localPath = await copyFileToPrivate(asset.uri, fileName);
    const mimeType = asset.mimeType ?? 'application/octet-stream';

    showNotesModal([{ localPath, fileName, fileType: getFileTypeFromMime(mimeType), mimeType }]);
  };

  // --- Actions ---

  const handleFilePress = (file: PatientFile) => {
    navigation.navigate('FileViewer', { fileId: file.id });
  };

  const handleFileLongPress = (file: PatientFile) => {
    const options: { text: string; onPress: () => void; style?: 'destructive' | 'cancel' }[] = [
      {
        text: 'Edit Notes',
        onPress: () => {
          setEditingFile(file);
          setEditNotesText(file.notes ?? '');
          setEditModalVisible(true);
        },
      },
    ];

    if (file.appointmentId) {
      options.push({
        text: 'Unlink from Appointment',
        onPress: () => {
          Alert.alert('Unlink File', 'Remove this file from the appointment?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unlink',
              onPress: () =>
                updatePatientFile({ ...file, appointmentId: undefined }),
            },
          ]);
        },
      });
    }

    options.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        Alert.alert('Delete File', 'This file will be permanently deleted.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deletePatientFile(file.id),
          },
        ]);
      },
    });

    options.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' });

    Alert.alert('File Options', file.fileName, options);
  };

  const handleSaveEditNotes = async () => {
    if (editingFile) {
      await updatePatientFile({ ...editingFile, notes: editNotesText || undefined });
    }
    setEditModalVisible(false);
    setEditingFile(null);
  };

  // --- Renderers ---

  const renderImageThumbnail = (file: PatientFile, index: number) => {
    const apt = file.appointmentId
      ? appointments.find((a) => a.id === file.appointmentId)
      : null;

    return (
      <TouchableOpacity
        key={file.id}
        style={[styles.thumbnailContainer, index % 2 === 0 ? { marginRight: spacing.sm / 2 } : { marginLeft: spacing.sm / 2 }]}
        onPress={() => handleFilePress(file)}
        onLongPress={() => handleFileLongPress(file)}
        activeOpacity={0.8}
      >
        <View style={styles.thumbnailWrapper}>
          <Image source={{ uri: file.localPath }} style={styles.thumbnailImage} />
          <View style={styles.thumbnailOverlay}>
            <Ionicons name="camera" size={14} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={styles.thumbnailDateLabel}>
            <Text style={styles.thumbnailDateText}>{formatDate(file.createdAt)}</Text>
          </View>
          {apt && (
            <View style={styles.appointmentChip}>
              <Ionicons name="calendar-outline" size={10} color={colors.primary} />
              <Text style={styles.appointmentChipText}>{formatDate(apt.date)}</Text>
            </View>
          )}
        </View>
        {file.notes ? (
          <Text style={styles.thumbnailNotes} numberOfLines={1}>
            {file.notes}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderDocumentRow = (file: PatientFile) => {
    const apt = file.appointmentId
      ? appointments.find((a) => a.id === file.appointmentId)
      : null;

    return (
      <Card
        key={file.id}
        onPress={() => handleFilePress(file)}
        style={styles.documentRow}
      >
        <TouchableOpacity
          style={styles.documentRowInner}
          onLongPress={() => handleFileLongPress(file)}
          activeOpacity={0.7}
        >
          <View style={[styles.docIconContainer, file.fileType === 'pdf' ? styles.docIconPdf : styles.docIconGeneric]}>
            <Ionicons name={getDocIcon(file.fileType)} size={24} color={file.fileType === 'pdf' ? colors.danger : colors.primary} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docFileName} numberOfLines={1}>
              {file.fileName}
            </Text>
            <Text style={styles.docMeta}>
              {formatDate(file.createdAt)}
              {apt ? `  •  Apt: ${formatDate(apt.date)}` : ''}
            </Text>
            {file.notes ? (
              <Text style={styles.docNotes} numberOfLines={1}>
                {file.notes}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>
    );
  };

  const renderSectionHeader = (section: FileSection) => (
    <View style={styles.sectionHeader} key={`section-${section.title}`}>
      <View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.subtitle ? (
          <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
        ) : null}
      </View>
      <Text style={styles.sectionCount}>
        {section.data.length} {section.data.length === 1 ? 'file' : 'files'}
      </Text>
    </View>
  );

  const renderFileItem = (file: PatientFile, index: number) => {
    if (file.fileType === 'image' && activeTab !== 'documents') {
      return renderImageThumbnail(file, index);
    }
    return renderDocumentRow(file);
  };

  const renderGroupedContent = () => {
    if (sections.length === 0 && files.length === 0) {
      return (
        <EmptyState
          icon="folder-open-outline"
          title="No Files Yet"
          message="Take photos or upload documents to keep track of this patient's records."
        />
      );
    }

    // If we have sections (grouped view), render with section headers
    if (sections.length > 0) {
      return (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: section }) => (
            <View>
              {renderSectionHeader(section)}
              {renderSectionFiles(section.data)}
            </View>
          )}
        />
      );
    }

    // Flat view (filtered by tab or appointmentId)
    return renderFlatFileList();
  };

  const renderSectionFiles = (sectionFiles: PatientFile[]) => {
    const images = sectionFiles.filter((f) => f.fileType === 'image');
    const docs = sectionFiles.filter((f) => f.fileType !== 'image');

    return (
      <View>
        {images.length > 0 && (
          <View style={styles.imageGrid}>
            {images.map((file, idx) => renderImageThumbnail(file, idx))}
          </View>
        )}
        {docs.map((file) => renderDocumentRow(file))}
      </View>
    );
  };

  const renderFlatFileList = () => {
    const images = files.filter((f) => f.fileType === 'image');
    const docs = files.filter((f) => f.fileType !== 'image');

    if (files.length === 0) {
      return (
        <EmptyState
          icon="folder-open-outline"
          title="No Files Found"
          message={
            activeTab === 'images'
              ? 'No images found. Take a photo or choose from gallery.'
              : activeTab === 'documents'
                ? 'No documents found. Upload a PDF or document.'
                : 'Take photos or upload documents to get started.'
          }
        />
      );
    }

    return (
      <FlatList
        data={[1]}
        keyExtractor={() => 'flat'}
        contentContainerStyle={styles.listContent}
        renderItem={() => (
          <View>
            {activeTab !== 'documents' && images.length > 0 && (
              <View style={styles.imageGrid}>
                {images.map((file, idx) => renderImageThumbnail(file, idx))}
              </View>
            )}
            {activeTab !== 'images' && docs.map((file) => renderDocumentRow(file))}
          </View>
        )}
      />
    );
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Files' },
    { key: 'images', label: 'Images' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{patient?.name ?? 'Patient Files'}</Text>
          <Text style={styles.headerSubtitle}>
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </Text>
        </View>
      </View>

      {/* Appointment filter banner */}
      {filteredAppointment && (
        <View style={styles.appointmentBanner}>
          <View style={styles.bannerLeft}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={styles.bannerText}>
              Files for appointment on {formatDate(filteredAppointment.date)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('PatientFiles', { patientId })}
          >
            <Text style={styles.bannerAction}>View All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter tabs - only when no appointmentId */}
      {!appointmentId && (
        <View style={styles.tabBar}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>{renderGroupedContent()}</View>

      {/* FAB */}
      {fabOpen && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        >
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.fabMenuItem} onPress={handleTakePhoto}>
              <View style={[styles.fabMenuIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={styles.fabMenuLabel}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={handlePickFromGallery}>
              <View style={[styles.fabMenuIcon, { backgroundColor: colors.successBg }]}>
                <Ionicons name="images" size={22} color={colors.success} />
              </View>
              <Text style={styles.fabMenuLabel}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={handlePickDocument}>
              <View style={[styles.fabMenuIcon, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="document-attach" size={22} color={colors.warning} />
              </View>
              <Text style={styles.fabMenuLabel}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.fab, fabOpen && styles.fabActive]}
        onPress={() => setFabOpen(!fabOpen)}
        activeOpacity={0.8}
      >
        <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Notes Modal (after upload) */}
      <Modal visible={notesModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Notes</Text>
            <Text style={styles.modalSubtitle}>
              Optionally describe {pendingFiles.length > 1 ? 'these files' : 'this file'} (e.g., "Before treatment", "X-ray left molar")
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter notes..."
              placeholderTextColor={colors.textMuted}
              value={notesText}
              onChangeText={setNotesText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button title="Skip" variant="ghost" onPress={handleSkipNotes} style={{ flex: 1 }} />
              <Button title="Save" variant="primary" onPress={handleSaveNotes} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter notes..."
              placeholderTextColor={colors.textMuted}
              value={editNotesText}
              onChangeText={setEditNotesText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingFile(null);
                }}
                style={{ flex: 1 }}
              />
              <Button title="Save" variant="primary" onPress={handleSaveEditNotes} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const THUMBNAIL_GAP = spacing.sm;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Appointment banner
  appointmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  bannerText: {
    fontSize: fontSize.sm,
    color: colors.primaryDark,
    fontWeight: '500',
    flex: 1,
  },
  bannerAction: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '700',
  },

  // Filter tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textOnPrimary,
  },

  // Content
  content: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Image grid
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -THUMBNAIL_GAP / 2,
    marginBottom: spacing.sm,
  },
  thumbnailContainer: {
    width: '50%',
    paddingHorizontal: THUMBNAIL_GAP / 2,
    marginBottom: THUMBNAIL_GAP,
  },
  thumbnailWrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
    aspectRatio: 1,
    ...shadow.sm,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: borderRadius.full,
    padding: 4,
  },
  thumbnailDateLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  thumbnailDateText: {
    fontSize: fontSize.xs,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  appointmentChip: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  appointmentChipText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: '600',
  },
  thumbnailNotes: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
    paddingHorizontal: 2,
  },

  // Document rows
  documentRow: {
    marginBottom: spacing.sm,
    padding: 0,
  },
  documentRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  docIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconPdf: {
    backgroundColor: colors.dangerBg,
  },
  docIconGeneric: {
    backgroundColor: colors.primaryBg,
  },
  docInfo: {
    flex: 1,
  },
  docFileName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  docMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  docNotes: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // FAB
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    zIndex: 10,
  },
  fabMenu: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    marginBottom: 80,
    minWidth: 220,
    ...shadow.lg,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...shadow.lg,
  },
  fabActive: {
    backgroundColor: colors.primaryDark,
  },

  // Modals
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
    paddingBottom: spacing.xl + spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
