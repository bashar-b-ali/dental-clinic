import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Doctor, Patient, Appointment, Payment, PatientFile, ExportData, TreatmentPlan } from '../types';
import * as storage from '../utils/storage';
import { generateId, getPatientName } from '../utils/helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleAppointmentReminder, cancelAppointmentReminder, getNotificationsEnabled } from '../utils/notifications';

interface DataContextType {
  doctor: Doctor | null;
  patients: Patient[];
  appointments: Appointment[];
  payments: Payment[];
  patientFiles: PatientFile[];
  treatmentPlans: TreatmentPlan[];
  isLoading: boolean;
  isOnboarded: boolean;

  setDoctor: (doctor: Doctor) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient>;
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  updateAppointment: (apt: Appointment) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<Payment>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  addPatientFile: (file: Omit<PatientFile, 'id' | 'createdAt'>) => Promise<PatientFile>;
  updatePatientFile: (file: PatientFile) => Promise<void>;
  deletePatientFile: (id: string) => Promise<void>;
  addTreatmentPlan: (plan: Omit<TreatmentPlan, 'id' | 'createdAt'>) => Promise<TreatmentPlan>;
  updateTreatmentPlan: (plan: TreatmentPlan) => Promise<void>;
  deleteTreatmentPlan: (id: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  importData: (data: any) => Promise<void>;
  mergeData: (data: ExportData) => Promise<{ patientsAdded: number; appointmentsAdded: number; paymentsAdded: number; filesAdded: number }>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctorState] = useState<Doctor | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPaymentsState] = useState<Payment[]>([]);
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [doc, pats, apts, pays, files, plans, onboarded] = await Promise.all([
        storage.getDoctor(),
        storage.getPatients(),
        storage.getAppointments(),
        storage.getPayments(),
        storage.getPatientFiles(),
        storage.getTreatmentPlans(),
        storage.isOnboarded(),
      ]);
      setDoctorState(doc);
      setPatients(pats);
      setAppointments(apts);
      setPaymentsState(pays);
      setPatientFiles(files);
      setTreatmentPlans(plans);
      setIsOnboarded(onboarded);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setDoctor = async (doc: Doctor) => {
    await storage.saveDoctor(doc);
    setDoctorState(doc);
  };

  const addPatient = async (data: Omit<Patient, 'id' | 'createdAt'>) => {
    const patient: Patient = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...patients, patient];
    await storage.savePatients(updated);
    setPatients(updated);
    return patient;
  };

  const updatePatient = async (patient: Patient) => {
    const updated = patients.map((p) => (p.id === patient.id ? patient : p));
    await storage.savePatients(updated);
    setPatients(updated);
  };

  const deletePatient = async (id: string) => {
    const updated = patients.filter((p) => p.id !== id);
    await storage.savePatients(updated);
    setPatients(updated);
    // Also clean up patient files
    const filesToDelete = patientFiles.filter((f) => f.patientId === id);
    for (const f of filesToDelete) {
      await storage.deletePrivateFile(f.localPath);
    }
    const updatedFiles = patientFiles.filter((f) => f.patientId !== id);
    await storage.savePatientFiles(updatedFiles);
    setPatientFiles(updatedFiles);
  };

  const getLang = async (): Promise<'en' | 'ar'> => {
    const stored = await AsyncStorage.getItem('@mobo_language');
    return stored === 'ar' ? 'ar' : 'en';
  };

  const addAppointment = async (data: Omit<Appointment, 'id' | 'createdAt'>) => {
    const apt: Appointment = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...appointments, apt];
    await storage.saveAppointments(updated);
    setAppointments(updated);
    // Schedule notification
    const lang = await getLang();
    scheduleAppointmentReminder(apt, getPatientName(apt.patientId, patients), lang);
    return apt;
  };

  const updateAppointment = async (apt: Appointment) => {
    const updated = appointments.map((a) => (a.id === apt.id ? apt : a));
    await storage.saveAppointments(updated);
    setAppointments(updated);
    // Reschedule notification
    const lang = await getLang();
    if (apt.status === 'cancelled' || apt.status === 'completed') {
      cancelAppointmentReminder(apt.id);
    } else {
      scheduleAppointmentReminder(apt, getPatientName(apt.patientId, patients), lang);
    }
  };

  const deleteAppointment = async (id: string) => {
    const updated = appointments.filter((a) => a.id !== id);
    await storage.saveAppointments(updated);
    setAppointments(updated);
    cancelAppointmentReminder(id);
  };

  const addPayment = async (data: Omit<Payment, 'id'>) => {
    const payment: Payment = { ...data, id: generateId() };
    const updated = [...payments, payment];
    await storage.savePayments(updated);
    setPaymentsState(updated);
    return payment;
  };

  const updatePayment = async (payment: Payment) => {
    const updated = payments.map((p) => (p.id === payment.id ? payment : p));
    await storage.savePayments(updated);
    setPaymentsState(updated);
  };

  const deletePayment = async (id: string) => {
    const updated = payments.filter((p) => p.id !== id);
    await storage.savePayments(updated);
    setPaymentsState(updated);
  };

  const addPatientFile = async (data: Omit<PatientFile, 'id' | 'createdAt'>) => {
    const file: PatientFile = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...patientFiles, file];
    await storage.savePatientFiles(updated);
    setPatientFiles(updated);
    return file;
  };

  const updatePatientFile = async (file: PatientFile) => {
    const updated = patientFiles.map((f) => (f.id === file.id ? file : f));
    await storage.savePatientFiles(updated);
    setPatientFiles(updated);
  };

  const deletePatientFile = async (id: string) => {
    const file = patientFiles.find((f) => f.id === id);
    if (file) {
      await storage.deletePrivateFile(file.localPath);
    }
    const updated = patientFiles.filter((f) => f.id !== id);
    await storage.savePatientFiles(updated);
    setPatientFiles(updated);
  };

  const addTreatmentPlan = async (data: Omit<TreatmentPlan, 'id' | 'createdAt'>) => {
    const plan: TreatmentPlan = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...treatmentPlans, plan];
    await storage.saveTreatmentPlans(updated);
    setTreatmentPlans(updated);
    return plan;
  };

  const updateTreatmentPlan = async (plan: TreatmentPlan) => {
    const updated = treatmentPlans.map((p) => (p.id === plan.id ? plan : p));
    await storage.saveTreatmentPlans(updated);
    setTreatmentPlans(updated);
  };

  const deleteTreatmentPlan = async (id: string) => {
    const updated = treatmentPlans.filter((p) => p.id !== id);
    await storage.saveTreatmentPlans(updated);
    setTreatmentPlans(updated);
  };

  const completeOnboarding = async () => {
    await storage.setOnboarded();
    setIsOnboarded(true);
  };

  const importData = async (data: any) => {
    await storage.importAllData(data);
    await loadData();
  };

  const mergeData = async (data: ExportData) => {
    const stats = await storage.mergeImportData(data);
    await loadData();
    return stats;
  };

  const refreshData = async () => {
    await loadData();
  };

  return (
    <DataContext.Provider
      value={{
        doctor,
        patients,
        appointments,
        payments,
        patientFiles,
        treatmentPlans,
        isLoading,
        isOnboarded,
        setDoctor,
        addPatient,
        updatePatient,
        deletePatient,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addPayment,
        updatePayment,
        deletePayment,
        addPatientFile,
        updatePatientFile,
        deletePatientFile,
        addTreatmentPlan,
        updateTreatmentPlan,
        deleteTreatmentPlan,
        completeOnboarding,
        importData,
        mergeData,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
