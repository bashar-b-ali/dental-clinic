import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  FlatList,
  StatusBar,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PinchGestureHandler,
  PanGestureHandler,
  State as GestureState,
  PinchGestureHandlerStateChangeEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import Button from '../components/Button';
import CustomAlert, { useAlert } from '../components/CustomAlert';
import { colors, spacing, fontSize, borderRadius, shadow } from '../utils/theme';
import { formatDate, getPatientName } from '../utils/helpers';
import { ms } from '../utils/responsive';
import { PatientFile } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getFileIcon(fileType: string): keyof typeof Ionicons.glyphMap {
  switch (fileType) {
    case 'pdf': return 'document-text';
    case 'document': return 'document';
    default: return 'document-outline';
  }
}

// Samsung-style zoomable + pannable image with boundary clamping
function ZoomableImage({ uri, onTap }: { uri: string; onTap: () => void }) {
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  // Scale
  const baseScaleRef = useRef(1);
  const pinchScale = useRef(new Animated.Value(1)).current;
  const savedScale = useRef(new Animated.Value(1)).current;
  const displayScale = Animated.multiply(savedScale, pinchScale);

  // Translation
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffsetX = useRef(0);
  const lastOffsetY = useRef(0);

  const lastTap = useRef(0);

  const clampOffset = (scale: number) => {
    // How far the image can move before showing blank space
    const maxX = (SCREEN_WIDTH * (scale - 1)) / 2;
    const maxY = (SCREEN_HEIGHT * 0.85 * (scale - 1)) / 2;
    lastOffsetX.current = Math.min(maxX, Math.max(-maxX, lastOffsetX.current));
    lastOffsetY.current = Math.min(maxY, Math.max(-maxY, lastOffsetY.current));
  };

  const resetPosition = () => {
    lastOffsetX.current = 0;
    lastOffsetY.current = 0;
    translateX.flattenOffset();
    translateY.flattenOffset();
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  // Pinch
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true },
  );

  const onPinchStateChange = (event: PinchGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === GestureState.ACTIVE) {
      const newScale = baseScaleRef.current * event.nativeEvent.scale;
      const clamped = Math.min(Math.max(newScale, 1), 5);
      baseScaleRef.current = clamped;
      savedScale.setValue(clamped);
      pinchScale.setValue(1);

      if (clamped <= 1.05) {
        baseScaleRef.current = 1;
        Animated.spring(savedScale, { toValue: 1, useNativeDriver: true }).start();
        resetPosition();
      } else {
        // Clamp position after zoom change
        clampOffset(clamped);
        translateX.flattenOffset();
        translateX.setValue(lastOffsetX.current);
        translateX.setOffset(0);
        translateY.flattenOffset();
        translateY.setValue(lastOffsetY.current);
        translateY.setOffset(0);
      }
    }
  };

  // Pan
  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true },
  );

  const onPanStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === GestureState.ACTIVE) {
      if (baseScaleRef.current <= 1.05) {
        resetPosition();
      } else {
        lastOffsetX.current += event.nativeEvent.translationX;
        lastOffsetY.current += event.nativeEvent.translationY;
        clampOffset(baseScaleRef.current);
        translateX.setOffset(lastOffsetX.current);
        translateX.setValue(0);
        translateY.setOffset(lastOffsetY.current);
        translateY.setValue(0);
      }
    }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      pinchScale.setValue(1);
      if (baseScaleRef.current > 1.05) {
        baseScaleRef.current = 1;
        Animated.spring(savedScale, { toValue: 1, useNativeDriver: true }).start();
        resetPosition();
      } else {
        baseScaleRef.current = 2.5;
        Animated.spring(savedScale, { toValue: 2.5, useNativeDriver: true }).start();
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          onTap();
        }
      }, 300);
    }
  };

  return (
    <PanGestureHandler
      ref={panRef}
      onGestureEvent={onPanEvent}
      onHandlerStateChange={onPanStateChange}
      simultaneousHandlers={pinchRef}
      minPointers={1}
      maxPointers={2}
      activeOffsetX={[-10, 10]}
      activeOffsetY={[-10, 10]}
    >
      <Animated.View style={styles.zoomContent}>
        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
          simultaneousHandlers={panRef}
        >
          <Animated.View
            style={[
              styles.zoomContent,
              {
                transform: [
                  { scale: displayScale },
                  { translateX },
                  { translateY },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={handleTap}>
              <Image
                source={{ uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function FileViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { fileId } = route.params;
  const { patientFiles, patients, appointments, updatePatientFile, deletePatientFile } = useData();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const file = patientFiles.find((f) => f.id === fileId);

  // Get all image files for the same patient for gallery swiping
  const siblingImages = patientFiles
    .filter((f) => f.patientId === file?.patientId && f.fileType === 'image')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const initialIndex = siblingImages.findIndex((f) => f.id === fileId);
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, initialIndex));
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editedNotes, setEditedNotes] = useState(file?.notes ?? '');
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentFile = file?.fileType === 'image' && siblingImages.length > 0
    ? siblingImages[currentIndex] ?? file
    : file;

  if (!file || !currentFile) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <Text style={styles.notFoundText}>{t('fileNotFound')}</Text>
        <Button title={t('goBack')} onPress={() => navigation.goBack()} variant="secondary" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const isImage = file.fileType === 'image';
  const patientName = getPatientName(currentFile.patientId, patients);
  const linkedAppointment = currentFile.appointmentId
    ? appointments.find((a) => a.id === currentFile.appointmentId)
    : null;
  const patientAppointments = appointments.filter((a) => a.patientId === currentFile.patientId);

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showAlert(t('error'), t('sharingNotAvailable'), [{ text: t('ok') }]);
        return;
      }
      await Sharing.shareAsync(currentFile.localPath);
    } catch (err: any) {
      showAlert(t('error'), err.message || t('failedToShare'), [{ text: t('ok') }]);
    }
  };

  const handleSaveNotes = async () => {
    await updatePatientFile({ ...currentFile, notes: editedNotes.trim() || undefined });
    setNotesModalVisible(false);
  };

  const handleLinkAppointment = async (appointmentId: string | undefined) => {
    await updatePatientFile({ ...currentFile, appointmentId });
    setAppointmentModalVisible(false);
  };

  const handleDelete = () => {
    showAlert(
      t('deleteFile'),
      t('deleteFileConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deletePatientFile(currentFile.id);
            if (isImage && siblingImages.length > 1) {
              // Stay in gallery, adjust index
              const newIndex = Math.min(currentIndex, siblingImages.length - 2);
              setCurrentIndex(newIndex);
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const toggleOverlay = () => setOverlayVisible((v) => !v);

  const onPageChange = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  }, []);

  // -------- IMAGE GALLERY MODE --------
  if (isImage) {
    return (
      <View style={styles.galleryContainer}>
        <StatusBar barStyle="light-content" />

        {/* Gallery */}
        <FlatList
          ref={flatListRef}
          data={siblingImages}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={onPageChange}
          renderItem={({ item }) => (
            <View style={styles.galleryPage}>
              <ZoomableImage uri={item.localPath} onTap={toggleOverlay} />
            </View>
          )}
        />

        {/* Top overlay */}
        {overlayVisible && (
          <View style={[styles.topOverlay, { paddingTop: insets.top + spacing.xs }]}>
            <TouchableOpacity style={styles.overlayButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={ms(22)} color="#fff" />
            </TouchableOpacity>

            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {currentIndex + 1} {t('imageOf')} {siblingImages.length}
              </Text>
            </View>

            <TouchableOpacity style={styles.overlayButton} onPress={() => setDetailsVisible(true)}>
              <Ionicons name="information-circle-outline" size={ms(24)} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom overlay */}
        {overlayVisible && (
          <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + spacing.sm }]}>
            {/* File info strip */}
            {currentFile.notes ? (
              <Text style={styles.overlayNotes} numberOfLines={2}>{currentFile.notes}</Text>
            ) : null}
            {linkedAppointment && (
              <View style={styles.overlayAppointmentChip}>
                <Ionicons name="calendar-outline" size={ms(12)} color={colors.primaryLight} />
                <Text style={styles.overlayAppointmentText}>
                  {formatDate(linkedAppointment.date)}
                </Text>
              </View>
            )}

            {/* Action bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionBarButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={ms(22)} color="#fff" />
                <Text style={styles.actionBarLabel}>{t('share')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBarButton}
                onPress={() => {
                  setEditedNotes(currentFile.notes ?? '');
                  setNotesModalVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={ms(22)} color="#fff" />
                <Text style={styles.actionBarLabel}>{t('editNotes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBarButton}
                onPress={() => setAppointmentModalVisible(true)}
              >
                <Ionicons name="link-outline" size={ms(22)} color="#fff" />
                <Text style={styles.actionBarLabel}>{currentFile.appointmentId ? t('changeAppointmentLink') : t('linkToAppointment')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBarButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={ms(22)} color="#ff6b6b" />
                <Text style={[styles.actionBarLabel, { color: '#ff6b6b' }]}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Details bottom sheet */}
        <Modal visible={detailsVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.detailsSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{currentFile.fileName}</Text>
                <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>{t('dateAdded')}</Text>
                  <Text style={styles.infoValue}>{formatDate(currentFile.createdAt)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>{t('tab_patients')}</Text>
                  <Text style={styles.infoValue}>{patientName}</Text>
                </View>
                {linkedAppointment && (
                  <View style={styles.infoRow}>
                    <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.infoLabel}>{t('appointment')}</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(linkedAppointment.date)} - {linkedAppointment.time}
                    </Text>
                  </View>
                )}
                {currentFile.notes && (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.infoLabel}>{t('sectionNotes')}</Text>
                    <Text style={styles.infoValue}>{currentFile.notes}</Text>
                  </View>
                )}
              </View>

              <Button title={t('close')} onPress={() => setDetailsVisible(false)} variant="ghost" />
            </View>
          </View>
        </Modal>

        {/* Notes Modal */}
        <Modal visible={notesModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('editNotes')}</Text>
                <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.notesInput}
                value={editedNotes}
                onChangeText={setEditedNotes}
                placeholder={t('addNotesAboutFile')}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.modalActions}>
                <Button title={t('cancel')} onPress={() => setNotesModalVisible(false)} variant="ghost" />
                <Button title={t('save')} onPress={handleSaveNotes} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Link Appointment Modal */}
        <Modal visible={appointmentModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('linkToAppointment')}</Text>
                <TouchableOpacity onPress={() => setAppointmentModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.appointmentList}>
                {currentFile.appointmentId && (
                  <TouchableOpacity
                    style={styles.unlinkRow}
                    onPress={() => handleLinkAppointment(undefined)}
                  >
                    <Ionicons name="unlink-outline" size={20} color={colors.danger} />
                    <Text style={styles.unlinkText}>{t('unlinkAppointment')}</Text>
                  </TouchableOpacity>
                )}

                {patientAppointments.length === 0 && (
                  <Text style={styles.emptyText}>{t('noAppointmentsForPatient')}</Text>
                )}

                {patientAppointments
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((apt) => {
                    const isLinked = apt.id === currentFile.appointmentId;
                    return (
                      <TouchableOpacity
                        key={apt.id}
                        style={[styles.appointmentRow, isLinked && styles.appointmentRowActive]}
                        onPress={() => handleLinkAppointment(apt.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.appointmentDate}>
                            {formatDate(apt.date)} - {apt.time}
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
                <Button title={t('close')} onPress={() => setAppointmentModalVisible(false)} variant="ghost" />
              </View>
            </View>
          </View>
        </Modal>

        <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
      </View>
    );
  }

  // -------- NON-IMAGE FILE MODE --------
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        <View style={styles.filePreviewContainer}>
          <Ionicons name={getFileIcon(file.fileType)} size={80} color={colors.textMuted} />
          <Text style={styles.filePreviewName} numberOfLines={2}>{file.fileName}</Text>
          <View style={styles.fileTypeBadge}>
            <Text style={styles.fileTypeBadgeText}>{file.fileType.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.fileName}>{file.fileName}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>{t('dateAdded')}</Text>
              <Text style={styles.infoValue}>{formatDate(file.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>{t('tab_patients')}</Text>
              <Text style={styles.infoValue}>{patientName}</Text>
            </View>
            {linkedAppointment && (
              <View style={styles.infoRow}>
                <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>{t('appointment')}</Text>
                <Text style={styles.infoValue}>
                  {formatDate(linkedAppointment.date)} - {linkedAppointment.time}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.notesSection}
            onPress={() => { setEditedNotes(file.notes ?? ''); setNotesModalVisible(true); }}
          >
            <View style={styles.notesSectionHeader}>
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.notesLabel}>{t('sectionNotes')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            <Text style={file.notes ? styles.notesText : styles.notesPlaceholder}>
              {file.notes || t('tapToAddNotes')}
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <Button title={t('share')} onPress={handleShare} variant="secondary"
              icon={<Ionicons name="share-outline" size={18} color={colors.primary} />} style={styles.actionButton} />
            <Button title={t('editNotes')} onPress={() => { setEditedNotes(file.notes ?? ''); setNotesModalVisible(true); }} variant="secondary"
              icon={<Ionicons name="create-outline" size={18} color={colors.primary} />} style={styles.actionButton} />
            <Button
              title={file.appointmentId ? t('changeAppointmentLink') : t('linkToAppointment')}
              onPress={() => setAppointmentModalVisible(true)} variant="secondary"
              icon={<Ionicons name="link-outline" size={18} color={colors.primary} />} style={styles.actionButton} />
            <Button title={t('delete')} onPress={handleDelete} variant="danger"
              icon={<Ionicons name="trash-outline" size={18} color={colors.danger} />} style={styles.actionButton} />
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.backButton, styles.backButtonLight]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Notes Modal */}
      <Modal visible={notesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('editNotes')}</Text>
              <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder={t('addNotesAboutFile')}
              placeholderTextColor={colors.textMuted}
              multiline textAlignVertical="top" autoFocus
            />
            <View style={styles.modalActions}>
              <Button title={t('cancel')} onPress={() => setNotesModalVisible(false)} variant="ghost" />
              <Button title={t('save')} onPress={handleSaveNotes} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Link Appointment Modal */}
      <Modal visible={appointmentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('linkToAppointment')}</Text>
              <TouchableOpacity onPress={() => setAppointmentModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.appointmentList}>
              {currentFile.appointmentId && (
                <TouchableOpacity style={styles.unlinkRow} onPress={() => handleLinkAppointment(undefined)}>
                  <Ionicons name="unlink-outline" size={20} color={colors.danger} />
                  <Text style={styles.unlinkText}>{t('unlinkAppointment')}</Text>
                </TouchableOpacity>
              )}
              {patientAppointments.length === 0 && (
                <Text style={styles.emptyText}>{t('noAppointmentsForPatient')}</Text>
              )}
              {patientAppointments.sort((a, b) => b.date.localeCompare(a.date)).map((apt) => {
                const isLinked = apt.id === currentFile.appointmentId;
                return (
                  <TouchableOpacity key={apt.id}
                    style={[styles.appointmentRow, isLinked && styles.appointmentRowActive]}
                    onPress={() => handleLinkAppointment(apt.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appointmentDate}>{formatDate(apt.date)} - {apt.time}</Text>
                      {apt.chiefComplaint ? <Text style={styles.appointmentComplaint} numberOfLines={1}>{apt.chiefComplaint}</Text> : null}
                    </View>
                    {isLinked && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button title={t('close')} onPress={() => setAppointmentModalVisible(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert {...alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Gallery mode
  galleryContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  counterText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Bottom overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayNotes: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  overlayAppointmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  overlayAppointmentText: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  actionBarButton: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  actionBarLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(10),
    fontWeight: '500',
  },

  // Details sheet
  detailsSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  // Non-image mode
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

  filePreviewContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
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
  fileTypeBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  fileTypeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },

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
  backButtonLight: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },

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

  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
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
