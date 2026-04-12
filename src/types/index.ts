export interface Doctor {
  id: string;
  name: string;
  clinicName?: string;
  phone?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  medicalNotes?: string;
  createdAt: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

export interface ToothWork {
  toothNumber: number;
  procedure: string;
  notes?: string;
}

export interface MaterialUsed {
  name: string;
  quantity: number;
  unitCost: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string; // ISO date
  time: string; // HH:mm
  status: AppointmentStatus;
  chiefComplaint?: string;
  diagnosis?: string;
  teethWork: ToothWork[];
  materialsUsed: MaterialUsed[];
  procedureFee: number;
  additionalExpenses: ExpenseItem[];
  amountPaid: number;
  notes?: string;
  treatmentPlanId?: string;
  createdAt: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  name: string;
  toothNumbers: number[];
  status: 'active' | 'completed';
  notes?: string;
  createdAt: string;
}

export interface ExpenseItem {
  description: string;
  amount: number;
  category: 'material' | 'rental' | 'lab' | 'other';
}

export interface Payment {
  id: string;
  patientId: string;
  appointmentId?: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'transfer' | 'other';
  notes?: string;
}

export interface PatientFile {
  id: string;
  patientId: string;
  appointmentId?: string;
  fileName: string;
  fileType: 'image' | 'pdf' | 'document' | 'other';
  mimeType?: string;
  localPath: string; // private app storage path
  notes?: string;
  createdAt: string;
}

export interface AppData {
  doctor: Doctor;
  patients: Patient[];
  appointments: Appointment[];
  payments: Payment[];
  patientFiles: PatientFile[];
  treatmentPlans: TreatmentPlan[];
}

export interface ExportData extends AppData {
  fileAttachments?: { fileId: string; base64: string; fileName: string }[];
}

// Navigation types
export type RootTabParamList = {
  Dashboard: undefined;
  Patients: undefined;
  Appointments: undefined;
  Billing: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  AddPatient: { patient?: Patient };
  PatientDetail: { patientId: string };
  AddAppointment: { appointment?: Appointment; patientId?: string; date?: string };
  AppointmentDetail: { appointmentId: string };
  AddPayment: { patientId: string; appointmentId?: string };
  Reports: undefined;
  PatientFiles: { patientId: string; appointmentId?: string };
  FileViewer: { fileId: string };
};
