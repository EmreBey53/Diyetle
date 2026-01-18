// src/services/smartNotificationService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService';

export interface SmartNotification {
  id?: string;
  userId: string;
  type: 'meal_reminder' | 'water_reminder' | 'exercise_reminder' | 'appointment' | 'emergency' | 'achievement' | 'diet_expiry';
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
}

export interface NotificationPreferences {
  userId: string;
  mealReminders: boolean;
  waterReminders: boolean;
  exerciseReminders: boolean;
  appointments: boolean;
  achievements: boolean;
  emergencyAlerts: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  preferredLanguage: 'tr' | 'en';
}

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

// Kişiselleştirilmiş öneriler
export const createPersonalizedReminder = async (userId: string, userProfile: any) => {
  try {
    const now = new Date();
    const recommendations = generatePersonalizedRecommendations(userProfile);
    
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
    const trigger = notification.scheduledTime.toDate();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: { notificationId, type: notification.type },
        priority: getPriorityLevel(notification.priority),
        sound: notification.priority === 'critical' ? 'default' : undefined,
      },
      trigger,
    });
  } catch (error) {
    console.error('❌ Expo notification zamanlama hatası:', error);
  }
};

// Kişiselleştirilmiş öneriler oluşturma
const generatePersonalizedRecommendations = (userProfile: any) => {
  const recommendations = [];
  const now = new Date();
  
  // BMI'ye göre öneriler
  if (userProfile.bmi > 25) {
    recommendations.push({
      type: 'exercise_reminder',
      title: '🏃‍♀️ Hareket Zamanı!',
      body: 'Günlük 30 dakika yürüyüş yapmayı unutmayın.',
      delayMinutes: 60,
      isRecurring: true,
      recurringPattern: 'daily',
      priority: 'normal',
      data: { targetBMI: 24, currentBMI: userProfile.bmi },
    });
  }
  
  // Yaşa göre öneriler
  if (userProfile.age > 50) {
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