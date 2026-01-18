// src/services/notificationSettingsService.ts
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface NotificationSettings {
  userId: string;

  // Genel Ayarlar
  allNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Danışan Bildirimleri
  newPatientNotification: boolean;
  patientWeightUpdateNotification: boolean;
  patientProgressNotification: boolean;

  // Mesaj Bildirimleri
  newQuestionNotification: boolean;
  questionAnsweredNotification: boolean;

  // Hatırlatma Bildirimleri
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

/**
 * Kullanıcının bildirim ayarlarını getir
 */
export async function getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const settingsRef = doc(db, 'notificationSettings', userId);
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data() as NotificationSettings;
    } else {
      // Ayarlar yoksa varsayılan ayarları oluştur
      const defaultSettings: NotificationSettings = {
        userId,
        ...DEFAULT_SETTINGS,
      };
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
}

/**
 * Kullanıcının bildirim ayarlarını güncelle
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const settingsRef = doc(db, 'notificationSettings', userId);
    await updateDoc(settingsRef, settings);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

/**
 * Belirli bir bildirim türünün açık olup olmadığını kontrol et
 */
export async function isNotificationEnabled(
  userId: string,
  notificationType: keyof Omit<NotificationSettings, 'userId'>
): Promise<boolean> {
  try {
    const settings = await getUserNotificationSettings(userId);
    return settings.allNotifications && settings[notificationType];
  } catch (error) {
    console.error('Error checking notification enabled:', error);
    return false;
  }
}

/**
 * Tüm bildirimleri aç/kapat
 */
export async function toggleAllNotifications(userId: string, enabled: boolean): Promise<void> {
  try {
    const settingsRef = doc(db, 'notificationSettings', userId);
    const updates: Partial<NotificationSettings> = {
      allNotifications: enabled,
    };

    // Eğer kapatılıyorsa tüm diğer ayarları da kapat
    if (!enabled) {
      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (key !== 'allNotifications') {
          (updates as any)[key] = false;
        }
      });
    }

    await updateDoc(settingsRef, updates);
  } catch (error) {
    console.error('Error toggling all notifications:', error);
    throw error;
  }
}
