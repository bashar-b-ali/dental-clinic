import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Appointment } from '../types';

const NOTIFICATIONS_ENABLED_KEY = '@mobo_notifications_enabled';
const REMINDER_MINUTES = 30; // remind 30 min before appointment

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  // Default to false (off) until user enables
  return val === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointment Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

export async function scheduleAppointmentReminder(
  appointment: Appointment,
  patientName: string,
  lang: 'en' | 'ar',
): Promise<void> {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return;

  // Cancel any existing notification for this appointment
  await cancelAppointmentReminder(appointment.id);

  // Parse appointment date and time
  const [year, month, day] = appointment.date.split('-').map(Number);
  const [hour, minute] = appointment.time.split(':').map(Number);

  const appointmentDate = new Date(year, month - 1, day, hour, minute);
  const reminderDate = new Date(appointmentDate.getTime() - REMINDER_MINUTES * 60 * 1000);

  // Don't schedule if the reminder time is already past
  if (reminderDate.getTime() <= Date.now()) return;

  // Don't schedule for cancelled/completed appointments
  if (appointment.status === 'cancelled' || appointment.status === 'completed') return;

  const title = lang === 'ar' ? 'تذكير بالموعد' : 'Appointment Reminder';
  const body = lang === 'ar'
    ? `موعد مع ${patientName} بعد ${REMINDER_MINUTES} دقيقة`
    : `Appointment with ${patientName} in ${REMINDER_MINUTES} minutes`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { appointmentId: appointment.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: Platform.OS === 'android' ? 'appointments' : undefined,
    },
    identifier: `appointment-${appointment.id}`,
  });
}

export async function cancelAppointmentReminder(appointmentId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`appointment-${appointmentId}`);
  } catch {
    // Notification may not exist, that's fine
  }
}

export async function rescheduleAllReminders(
  appointments: Appointment[],
  getPatientName: (patientId: string) => string,
  lang: 'en' | 'ar',
): Promise<void> {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return;

  // Cancel all existing
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Reschedule upcoming scheduled appointments
  for (const apt of appointments) {
    if (apt.status === 'scheduled') {
      await scheduleAppointmentReminder(apt, getPatientName(apt.patientId), lang);
    }
  }
}
