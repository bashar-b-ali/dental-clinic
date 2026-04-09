import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { AppData, ExportData, Doctor, Patient, Appointment, Payment, PatientFile } from '../types';

const STORAGE_KEYS = {
  DOCTOR: '@mobo_doctor',
  PATIENTS: '@mobo_patients',
  APPOINTMENTS: '@mobo_appointments',
  PAYMENTS: '@mobo_payments',
  PATIENT_FILES: '@mobo_patient_files',
  ONBOARDED: '@mobo_onboarded',
};

// Private directory for patient files - not visible in gallery
const FILES_DIR = FileSystem.documentDirectory + 'patient-files/';

export async function ensureFilesDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FILES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
  }
}

export async function copyFileToPrivate(sourceUri: string, fileName: string): Promise<string> {
  await ensureFilesDir();
  const destPath = FILES_DIR + Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  return destPath;
}

export async function deletePrivateFile(localPath: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
  } catch {}
}

// --- CRUD helpers ---

export async function getDoctor(): Promise<Doctor | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR);
  return data ? JSON.parse(data) : null;
}

export async function saveDoctor(doctor: Doctor): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DOCTOR, JSON.stringify(doctor));
}

export async function getPatients(): Promise<Patient[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PATIENTS);
  return data ? JSON.parse(data) : [];
}

export async function savePatients(patients: Patient[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
}

export async function getAppointments(): Promise<Appointment[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
  return data ? JSON.parse(data) : [];
}

export async function saveAppointments(appointments: Appointment[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
}

export async function getPayments(): Promise<Payment[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
  return data ? JSON.parse(data) : [];
}

export async function savePayments(payments: Payment[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
}

export async function getPatientFiles(): Promise<PatientFile[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PATIENT_FILES);
  return data ? JSON.parse(data) : [];
}

export async function savePatientFiles(files: PatientFile[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_FILES, JSON.stringify(files));
}

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED);
  return val === 'true';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
}

// --- Bulk data ---

export async function getAllData(): Promise<AppData> {
  const [doctor, patients, appointments, payments, patientFiles] = await Promise.all([
    getDoctor(),
    getPatients(),
    getAppointments(),
    getPayments(),
    getPatientFiles(),
  ]);
  return {
    doctor: doctor!,
    patients,
    appointments,
    payments,
    patientFiles,
  };
}

// Export with files encoded as base64
export async function getAllDataForExport(): Promise<ExportData> {
  const data = await getAllData();
  const fileAttachments: ExportData['fileAttachments'] = [];

  for (const f of data.patientFiles) {
    try {
      const info = await FileSystem.getInfoAsync(f.localPath);
      if (info.exists) {
        const base64 = await FileSystem.readAsStringAsync(f.localPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileAttachments!.push({ fileId: f.id, base64, fileName: f.fileName });
      }
    } catch {}
  }

  return { ...data, fileAttachments };
}

// Smart merge import - never override existing records
export async function mergeImportData(incoming: ExportData): Promise<{
  patientsAdded: number;
  appointmentsAdded: number;
  paymentsAdded: number;
  filesAdded: number;
}> {
  const current = await getAllData();
  const stats = { patientsAdded: 0, appointmentsAdded: 0, paymentsAdded: 0, filesAdded: 0 };

  // Merge patients by id
  const existingPatientIds = new Set(current.patients.map((p) => p.id));
  const newPatients = (incoming.patients ?? []).filter((p) => !existingPatientIds.has(p.id));
  stats.patientsAdded = newPatients.length;

  // Merge appointments by id
  const existingAptIds = new Set(current.appointments.map((a) => a.id));
  const newApts = (incoming.appointments ?? []).filter((a) => !existingAptIds.has(a.id));
  stats.appointmentsAdded = newApts.length;

  // Merge payments by id
  const existingPayIds = new Set(current.payments.map((p) => p.id));
  const newPays = (incoming.payments ?? []).filter((p) => !existingPayIds.has(p.id));
  stats.paymentsAdded = newPays.length;

  // Merge files by id + restore base64 attachments
  const existingFileIds = new Set(current.patientFiles.map((f) => f.id));
  const incomingFiles = (incoming.patientFiles ?? []).filter((f) => !existingFileIds.has(f.id));
  const attachmentMap = new Map(
    (incoming.fileAttachments ?? []).map((a) => [a.fileId, a])
  );

  await ensureFilesDir();
  const restoredFiles: PatientFile[] = [];
  for (const fileMeta of incomingFiles) {
    const attachment = attachmentMap.get(fileMeta.id);
    if (attachment) {
      const destPath = FILES_DIR + Date.now() + '_' + attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      await FileSystem.writeAsStringAsync(destPath, attachment.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      restoredFiles.push({ ...fileMeta, localPath: destPath });
    }
  }
  stats.filesAdded = restoredFiles.length;

  // If no doctor set, adopt incoming doctor
  if (!current.doctor && incoming.doctor) {
    await saveDoctor(incoming.doctor);
  }

  await Promise.all([
    savePatients([...current.patients, ...newPatients]),
    saveAppointments([...current.appointments, ...newApts]),
    savePayments([...current.payments, ...newPays]),
    savePatientFiles([...current.patientFiles, ...restoredFiles]),
    setOnboarded(),
  ]);

  return stats;
}

// Legacy full-replace import (used on onboarding when no data exists)
export async function importAllData(data: ExportData): Promise<void> {
  // If there's existing data, use merge instead
  const existingDoc = await getDoctor();
  if (existingDoc) {
    await mergeImportData(data);
    return;
  }

  // Fresh import
  await ensureFilesDir();
  const attachmentMap = new Map(
    (data.fileAttachments ?? []).map((a) => [a.fileId, a])
  );
  const restoredFiles: PatientFile[] = [];
  for (const fileMeta of (data.patientFiles ?? [])) {
    const attachment = attachmentMap.get(fileMeta.id);
    if (attachment) {
      const destPath = FILES_DIR + Date.now() + '_' + attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      await FileSystem.writeAsStringAsync(destPath, attachment.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      restoredFiles.push({ ...fileMeta, localPath: destPath });
    }
  }

  await Promise.all([
    saveDoctor(data.doctor),
    savePatients(data.patients ?? []),
    saveAppointments(data.appointments ?? []),
    savePayments(data.payments ?? []),
    savePatientFiles(restoredFiles),
    setOnboarded(),
  ]);
}

export async function clearAllData(): Promise<void> {
  // Delete all private files
  try {
    const info = await FileSystem.getInfoAsync(FILES_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(FILES_DIR, { idempotent: true });
    }
  } catch {}

  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
