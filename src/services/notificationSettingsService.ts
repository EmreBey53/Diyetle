import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface NotificationSettings {
  userId: string;
  allNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  newPatientNotification: boolean;
  patientWeightUpdateNotification: boolean;
  patientProgressNotification: boolean;
  newQuestionNotification: boolean;
  questionAnsweredNotification: boolean;
  dailyReminderNotification: boolean;
  appointmentReminderNotification: boolean;
  followUpReminderNotification: boolean;
}

const DEFAULT_SETTINGS: Omit<NotificationSettings, 'userId'> = {
  allNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
  newPatientNotification: true,
  patientWeightUpdateNotification: true,
  patientProgressNotification: true,
  newQuestionNotification: true,
  questionAnsweredNotification: true,
  dailyReminderNotification: false,
  appointmentReminderNotification: true,
  followUpReminderNotification: true,
};

export async function getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const settingsRef = doc(db, 'notificationSettings', userId);
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data() as NotificationSettings;
    } else {
      const defaultSettings: NotificationSettings = {
        userId,
        ...DEFAULT_SETTINGS,
      };
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    throw error;
  }
}

export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const settingsRef = doc(db, 'notificationSettings', userId);
    await updateDoc(settingsRef, settings);
  } catch (error) {
    throw error;
  }
}

export async function isNotificationEnabled(
  userId: string,
  notificationType: keyof Omit<NotificationSettings, 'userId'>
): Promise<boolean> {
  try {
    const settings = await getUserNotificationSettings(userId);
    return settings.allNotifications && settings[notificationType];
  } catch (error) {
    return false;
  }
}

export async function toggleAllNotifications(userId: string, enabled: boolean): Promise<void> {
  try {
    const settingsRef = doc(db, 'notificationSettings', userId);
    const updates: Partial<NotificationSettings> = {
      allNotifications: enabled,
    };

    if (!enabled) {
      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (key !== 'allNotifications') {
          (updates as any)[key] = false;
        }
      });
    }

    await updateDoc(settingsRef, updates);
  } catch (error) {
    throw error;
  }
}
