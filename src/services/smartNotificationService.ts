// src/services/smartNotificationService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { logAuditEvent } from './auditService';

export interface SmartNotification {
  id?: string;
  userId: string;
  type: 'meal_reminder' | 'water_reminder' | 'exercise_reminder' | 'appointment' | 'emergency' | 'achievement' | 'diet_expiry' | 'chat_message';
  title: string;
  body: string;
  scheduledTime: Timestamp;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  priority: 'low' | 'normal' | 'high' | 'critical';
  isPersonalized: boolean;
  personalizedData?: any;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  createdAt: Timestamp;
  sentAt?: Timestamp;
  expoPushToken?: string;
}

export interface NotificationPreferences {
  userId: string;
  mealReminders: boolean;
  waterReminders: boolean;
  exerciseReminders: boolean;
  appointments: boolean;
  achievements: boolean;
  emergencyAlerts: boolean;
  chatMessages: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  preferredLanguage: 'tr' | 'en';
}

// Push token kaydetme
export const registerForPushNotifications = async (userId: string) => {
  try {
    if (!Device.isDevice) {
      console.log('📱 Fiziksel cihaz gerekli');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Bildirim izni reddedildi');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Push token alındı:', token);

    // Token'ı Firebase'e kaydet
    await addDoc(collection(db, 'push_tokens'), {
      userId,
      token,
      platform: Platform.OS,
      createdAt: Timestamp.now(),
      isActive: true,
    });

    // iOS için ek ayarlar
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('chat', [
        {
          identifier: 'reply',
          buttonTitle: 'Yanıtla',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'mark_read',
          buttonTitle: 'Okundu',
          options: { opensAppToForeground: false },
        },
      ]);
    }

    return token;
  } catch (error) {
    console.error('❌ Push token kaydetme hatası:', error);
    return null;
  }
};

// Akıllı bildirim oluşturma
export const createSmartNotification = async (notification: Omit<SmartNotification, 'id' | 'createdAt' | 'status'>) => {
  try {
    const newNotification: Omit<SmartNotification, 'id'> = {
      ...notification,
      createdAt: Timestamp.now(),
      status: 'scheduled',
    };

    const docRef = await addDoc(collection(db, 'smart_notifications'), newNotification);
    
    // Expo notification'ı zamanla
    await scheduleExpoNotification(newNotification, docRef.id);
    
    await logAuditEvent({
      userId: notification.userId,
      userRole: 'patient',
      action: 'notification_scheduled',
      resource: 'notification',
      resourceId: docRef.id,
      details: { type: notification.type, priority: notification.priority },
      severity: 'low',
    });

    console.log('✅ Akıllı bildirim oluşturuldu:', notification.type);
    return docRef.id;
  } catch (error) {
    console.error('❌ Akıllı bildirim oluşturma hatası:', error);
    throw error;
  }
};

// Chat mesajı bildirimi
export const sendChatNotification = async (
  recipientId: string, 
  senderName: string, 
  message: string,
  chatRoomId: string
) => {
  try {
    console.log(`💬 Chat bildirimi hazırlanıyor:`, {
      recipientId,
      senderName,
      messagePreview: message.substring(0, 30) + '...',
      chatRoomId
    });

    // Veritabanına kaydet
    await createSmartNotification({
      userId: recipientId,
      type: 'chat_message',
      title: `💬 ${senderName}`,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      scheduledTime: Timestamp.now(),
      isRecurring: false,
      priority: 'normal',
      isPersonalized: false,
      personalizedData: { chatRoomId, senderId: senderName },
    });

    console.log('✅ Chat bildirimi veritabanına kaydedildi');

    // Anında bildirim gönder
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 ${senderName}`,
        body: message.length > 50 ? message.substring(0, 50) + '...' : message,
        data: { 
          type: 'chat_message', 
          chatRoomId,
          senderName,
          recipientId
        },
        ...(Platform.OS === 'ios' && { categoryIdentifier: 'chat' }),
        sound: 'default',
        badge: 1,
      },
      trigger: null, // Anında gönder
    });

    console.log('✅ Push notification gönderildi, ID:', notificationId);
    console.log('💬 Chat bildirimi başarıyla tamamlandı');
  } catch (error) {
    console.error('❌ Chat bildirimi hatası:', error);
    throw error;
  }
};

// Randevu hatırlatıcısı
export const sendAppointmentReminder = async (
  userId: string,
  appointmentTime: Date,
  doctorName: string,
  reminderType: '24h' | '2h' | '15min'
) => {
  try {
    const reminderTexts = {
      '24h': '24 saat sonra',
      '2h': '2 saat sonra', 
      '15min': '15 dakika sonra'
    };

    await createSmartNotification({
      userId,
      type: 'appointment',
      title: '📅 Randevu Hatırlatması',
      body: `${doctorName} ile randevunuz ${reminderTexts[reminderType]} başlayacak`,
      scheduledTime: Timestamp.now(),
      isRecurring: false,
      priority: 'high',
      isPersonalized: true,
      personalizedData: { appointmentTime, doctorName, reminderType },
    });

    console.log('📅 Randevu hatırlatıcısı gönderildi');
  } catch (error) {
    console.error('❌ Randevu hatırlatıcısı hatası:', error);
  }
};

// Kişiselleştirilmiş öneriler
export const createPersonalizedReminder = async (userId: string, userProfile: any) => {
  try {
    // Parametre kontrolü
    if (!userId) {
      console.warn('⚠️ createPersonalizedReminder: userId eksik');
      return;
    }

    // userProfile kontrolü ve varsayılan değerler
    const safeProfile = {
      bmi: userProfile?.bmi || 25,
      age: userProfile?.age || 30,
      weight: userProfile?.weight || 70,
      height: userProfile?.height || 170,
      activityLevel: userProfile?.activityLevel || 'moderate',
      ...userProfile
    };

    const now = new Date();
    const recommendations = generatePersonalizedRecommendations(safeProfile);
    
    for (const rec of recommendations) {
      const scheduledTime = new Date(now.getTime() + rec.delayMinutes * 60000);
      
      await createSmartNotification({
        userId,
        type: rec.type,
        title: rec.title,
        body: rec.body,
        scheduledTime: Timestamp.fromDate(scheduledTime),
        isRecurring: rec.isRecurring,
        recurringPattern: rec.recurringPattern,
        priority: rec.priority,
        isPersonalized: true,
        personalizedData: rec.data,
      });
    }
    
    console.log('✅ Kişiselleştirilmiş hatırlatıcılar oluşturuldu');
  } catch (error) {
    console.error('❌ Kişiselleştirilmiş hatırlatıcı hatası:', error);
  }
};

// Acil durum bildirimi
export const sendEmergencyNotification = async (userId: string, message: string, severity: 'high' | 'critical') => {
  try {
    await createSmartNotification({
      userId,
      type: 'emergency',
      title: '🚨 Acil Durum',
      body: message,
      scheduledTime: Timestamp.now(),
      isRecurring: false,
      priority: severity,
      isPersonalized: false,
    });

    // Anında gönder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Acil Durum',
        body: message,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sound: 'default',
        data: { type: 'emergency', severity },
      },
      trigger: null, // Anında gönder
    });

    await logAuditEvent({
      userId,
      userRole: 'patient',
      action: 'emergency_notification_sent',
      resource: 'notification',
      details: { message, severity },
      severity: 'critical',
    });

    console.log('🚨 Acil durum bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Acil durum bildirimi hatası:', error);
  }
};

// Expo notification zamanlama
const scheduleExpoNotification = async (notification: Omit<SmartNotification, 'id'>, notificationId: string) => {
  try {
    const triggerDate = notification.scheduledTime.toDate();
    const secondsFromNow = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));
    
    const notificationContent: any = {
      title: notification.title,
      body: notification.body,
      data: {
        notificationId,
        type: notification.type,
        ...notification.personalizedData
      },
      priority: getPriorityLevel(notification.priority),
      sound: notification.priority === 'critical' ? 'default' : true,
      badge: 1,
    };

    // iOS için kategori ayarla
    if (Platform.OS === 'ios' && notification.type === 'chat_message') {
      notificationContent.categoryIdentifier = 'chat';
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: secondsFromNow > 0 ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow, 
        repeats: false 
      } : null,
    });
  } catch (error) {
    console.error('❌ Expo notification zamanlama hatası:', error);
  }
};

// Kişiselleştirilmiş öneriler oluşturma
const generatePersonalizedRecommendations = (userProfile: any) => {
  const recommendations: Array<{
    type: 'meal_reminder' | 'water_reminder' | 'exercise_reminder' | 'appointment' | 'emergency' | 'achievement' | 'diet_expiry';
    title: string;
    body: string;
    delayMinutes: number;
    isRecurring: boolean;
    recurringPattern?: 'daily' | 'weekly' | 'monthly';
    priority: 'low' | 'normal' | 'high' | 'critical';
    data: any;
  }> = [];
  
  // Güvenli değer kontrolü
  const bmi = userProfile?.bmi || 25;
  const age = userProfile?.age || 30;
  const weight = userProfile?.weight || 70;
  
  // BMI'ye göre öneriler
  if (bmi > 25) {
    recommendations.push({
      type: 'exercise_reminder',
      title: '🏃‍♀️ Hareket Zamanı!',
      body: 'Günlük 30 dakika yürüyüş yapmayı unutmayın.',
      delayMinutes: 60,
      isRecurring: true,
      recurringPattern: 'daily',
      priority: 'normal',
      data: { targetBMI: 24, currentBMI: bmi },
    });
  }
  
  // Yaşa göre öneriler
  if (age > 50) {
    recommendations.push({
      type: 'water_reminder',
      title: '💧 Su İçme Hatırlatması',
      body: 'Günde en az 2.5 litre su içmeyi hedefleyin.',
      delayMinutes: 120,
      isRecurring: true,
      recurringPattern: 'daily',
      priority: 'normal',
      data: { ageGroup: '50+', recommendedWater: 2500 },
    });
  }

  // Genel öneriler (her zaman ekle)
  recommendations.push({
    type: 'meal_reminder',
    title: '🍽️ Öğün Hatırlatması',
    body: 'Düzenli öğün saatlerinizi korumayı unutmayın.',
    delayMinutes: 30,
    isRecurring: true,
    recurringPattern: 'daily',
    priority: 'normal',
    data: { reminderType: 'general' },
  });
  
  return recommendations;
};

const getPriorityLevel = (priority: string) => {
  switch (priority) {
    case 'critical': return Notifications.AndroidNotificationPriority.MAX;
    case 'high': return Notifications.AndroidNotificationPriority.HIGH;
    case 'normal': return Notifications.AndroidNotificationPriority.DEFAULT;
    case 'low': return Notifications.AndroidNotificationPriority.LOW;
    default: return Notifications.AndroidNotificationPriority.DEFAULT;
  }
};