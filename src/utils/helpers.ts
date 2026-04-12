import { Appointment, Payment, Patient } from '../types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getAppointmentTotal(apt: Appointment): number {
  const materialsCost = apt.materialsUsed.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
  const additionalCost = apt.additionalExpenses.reduce((sum, e) => sum + e.amount, 0);
  return apt.procedureFee + materialsCost + additionalCost;
}

export function getPatientBalance(
  patientId: string,
  appointments: Appointment[],
  payments: Payment[]
): { totalCharged: number; totalPaid: number; balance: number } {
  const patientApts = appointments.filter(
    (a) => a.patientId === patientId && a.status !== 'cancelled'
  );
  const totalCharged = patientApts.reduce((sum, a) => sum + getAppointmentTotal(a), 0);
  const aptPayments = patientApts.reduce((sum, a) => sum + a.amountPaid, 0);
  const extraPayments = payments
    .filter((p) => p.patientId === patientId)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = aptPayments + extraPayments;
  return { totalCharged, totalPaid, balance: totalCharged - totalPaid };
}

export function getIncomeForPeriod(
  appointments: Appointment[],
  payments: Payment[],
  startDate: string,
  endDate: string
): { revenue: number; expenses: number; collected: number; outstanding: number } {
  const periodApts = appointments.filter(
    (a) => a.date >= startDate && a.date <= endDate && a.status === 'completed'
  );

  const revenue = periodApts.reduce((sum, a) => sum + a.procedureFee, 0);
  const expenses = periodApts.reduce((sum, a) => {
    const matCost = a.materialsUsed.reduce((s, m) => s + m.quantity * m.unitCost, 0);
    const addCost = a.additionalExpenses.reduce((s, e) => s + e.amount, 0);
    return sum + matCost + addCost;
  }, 0);
  const collected = periodApts.reduce((sum, a) => sum + a.amountPaid, 0);
  const periodPayments = payments.filter((p) => p.date >= startDate && p.date <= endDate);
  const extraCollected = periodPayments.reduce((sum, p) => sum + p.amount, 0);

  const totalCharged = periodApts.reduce((sum, a) => sum + getAppointmentTotal(a), 0);
  const totalCollected = collected + extraCollected;

  return {
    revenue,
    expenses,
    collected: totalCollected,
    outstanding: totalCharged - totalCollected,
  };
}

export function getDayRange(date: string): { start: string; end: string } {
  return { start: date, end: date };
}

export function getWeekRange(date: string): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getMonthRange(date: string): { start: string; end: string } {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getPatientName(patientId: string, patients: Patient[]): string {
  return patients.find((p) => p.id === patientId)?.name ?? 'Unknown Patient';
}

export const DENTAL_PROCEDURES = [
  'Cleaning',
  'Filling',
  'Crown',
  'Root Canal',
  'Extraction',
  'Whitening',
  'Veneer',
  'Bridge',
  'Implant',
  'Denture',
  'Scaling',
  'X-Ray',
  'Consultation',
  'Emergency',
  'Orthodontics',
  'Periodontal Treatment',
  'Other',
];

export const PROCEDURE_AR: Record<string, string> = {
  'Cleaning': 'تنظيف',
  'Filling': 'حشوة',
  'Crown': 'تاج',
  'Root Canal': 'علاج عصب',
  'Extraction': 'خلع',
  'Whitening': 'تبييض',
  'Veneer': 'قشرة',
  'Bridge': 'جسر',
  'Implant': 'زراعة',
  'Denture': 'طقم أسنان',
  'Scaling': 'تقليح',
  'X-Ray': 'أشعة سينية',
  'Consultation': 'استشارة',
  'Emergency': 'طوارئ',
  'Orthodontics': 'تقويم',
  'Periodontal Treatment': 'علاج لثة',
  'Other': 'أخرى',
};

export const COMMON_MATERIALS = [
  'Composite Resin',
  'Amalgam',
  'Ceramic',
  'Gold',
  'Porcelain',
  'Acrylic',
  'Titanium Implant',
  'Dental Cement',
  'Impression Material',
  'Anesthetic',
  'Sutures',
  'Temporary Crown',
  'Rubber Dam',
  'Other',
];

export const MATERIAL_AR: Record<string, string> = {
  'Composite Resin': 'راتنج مركب',
  'Amalgam': 'أملغم',
  'Ceramic': 'سيراميك',
  'Gold': 'ذهب',
  'Porcelain': 'بورسلين',
  'Acrylic': 'أكريليك',
  'Titanium Implant': 'غرسة تيتانيوم',
  'Dental Cement': 'إسمنت أسنان',
  'Impression Material': 'مادة طبعة',
  'Anesthetic': 'مخدر',
  'Sutures': 'خيوط جراحية',
  'Temporary Crown': 'تاج مؤقت',
  'Rubber Dam': 'حاجز مطاطي',
  'Other': 'أخرى',
};

export function translateProcedure(proc: string, lang: string): string {
  if (lang === 'ar') return PROCEDURE_AR[proc] ?? proc;
  return proc;
}

export function translateMaterial(mat: string, lang: string): string {
  if (lang === 'ar') return MATERIAL_AR[mat] ?? mat;
  return mat;
}
