// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';
import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { Notification } from '../models/Notification';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Push notification token al
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Diyet expiry için ayrı channel
    await Notifications.setNotificationChannelAsync('diet-expiry', {
      name: 'Diyet Bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification izni verilmedi!');
      return null;
    }

    try {
      // ProjectId ile token al (EAS Build için gerekli)
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: '7900e061-56da-44bc-a397-0695b2db0c3e',
      });
      token = expoPushToken.data;
      console.log('✅ Push Token:', token);
    } catch (error: any) {
      console.error('❌ Token alma hatası:', error);
      return null;
    }
  } else {
    console.log('⚠️ Emulator\'de push notification çalışmaz!');
  }

  return token;
};

// Kullanıcı token'ını kaydet
export const saveUserToken = async (
  userId: string,
  token: string,
  userType: 'dietitian' | 'patient'
) => {
  try {
    const collection = userType === 'dietitian' ? 'users' : 'patients';
    const userRef = doc(db, collection, userId);

    await updateDoc(userRef, {
      pushToken: token,
      updatedAt: new Date(),
    });

    console.log('✅ Push token kaydedildi:', collection, userId);
  } catch (error) {
    console.error('❌ Token kaydetme hatası:', error);
  }
};

// Lokal bildirim gönder (test için)
export const scheduleLocalNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { data: 'test' },
    },
    trigger: null, // Hemen tetikle
  });
};

// Push Notification Gönder (Expo Push API ile)
export const sendPushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: any
) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data || {},
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('✅ Push notification gönderildi:', result);
    return result;
  } catch (error) {
    console.error('❌ Push notification hatası:', error);
    throw error;
  }
};

/**
 * YENİ HASTA KAYIT BİLDİRİMİ
 */

/**
 * Diyetisyene: Yeni hasta kaydoldu bildirimi gönder
 */
export const notifyDietitianNewPatient = async (
  dietitianToken: string,
  patientName: string,
  patientEmail: string
) => {
  try {
    const title = '🎉 Yeni Danışan!';
    const body = `${patientName} sisteme kaydoldu ve sizi diyetisyen olarak seçti. Profil bilgilerini inceleyebilirsiniz.`;

    await sendPushNotification(dietitianToken, title, body, {
      type: 'new_patient',
      patientName,
      patientEmail,
    });

    console.log('✅ Diyetisyene yeni hasta bildirimi gönderildi:', patientName);
  } catch (error) {
    console.error('❌ Yeni hasta bildirimi hatası:', error);
  }
};

/**
 * Diyetisyene: Danışan yemek fotoğrafı yükledi bildirimi gönder
 */
export const notifyDietitianMealPhoto = async (
  dietitianToken: string,
  dietitianUserId: string,
  patientId: string,
  patientName: string,
  mealType: string,
  mealName: string,
  message?: string
) => {
  try {
    const mealTypeEmojis: Record<string, string> = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🍎',
    };

    const mealTypeLabels: Record<string, string> = {
      breakfast: 'Kahvaltı',
      lunch: 'Öğle Yemeği',
      dinner: 'Akşam Yemeği',
      snack: 'Ara Öğün',
    };

    const emoji = mealTypeEmojis[mealType] || '📸';
    const label = mealTypeLabels[mealType] || 'Öğün';

    const title = `${emoji} Yeni Öğün Fotoğrafı`;
    let body = `${patientName} ${label} fotoğrafı yükledi: ${mealName}`;

    if (message) {
      body += `\n💬 Mesaj: ${message}`;
    }

    const notificationData = {
      type: 'meal_photo',
      patientId,
      patientName,
      mealType,
      mealName,
      message: message || '',
    };

    // Firestore'a bildirim kaydet
    await saveNotificationToFirestore(dietitianUserId, 'meal_photo', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(dietitianToken, title, body, notificationData);

    console.log('✅ Diyetisyene yemek fotoğrafı bildirimi gönderildi:', patientName);
  } catch (error) {
    console.error('❌ Yemek fotoğrafı bildirimi hatası:', error);
  }
};

/**
 * Danışana: Diyetisyen fotoğrafa cevap verdi bildirimi gönder
 */
export const notifyPatientPhotoResponse = async (
  patientToken: string,
  patientUserId: string,
  dietitianName: string,
  mealName: string,
  response: string
) => {
  try {
    const title = '✅ Diyetisyeninizden Cevap Geldi';
    const body = `${dietitianName}, "${mealName}" fotoğrafınıza cevap verdi:\n${response.substring(0, 60)}${response.length > 60 ? '...' : ''}`;

    const notificationData = {
      type: 'photo_response',
      dietitianName,
      mealName,
      response,
    };

    // Firestore'a bildirim kaydet
    await saveNotificationToFirestore(patientUserId, 'photo_response', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(patientToken, title, body, notificationData);

    console.log('✅ Danışana fotoğraf cevabı bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Fotoğraf cevabı bildirimi hatası:', error);
  }
};

/**
 * DIYET EXPIRY NOTIFICATIONS
 */

/**
 * Diyetisyene: Danışanın diyeti pazar günü bitecek (Cumartesi gönder)
 */
export const notifyDietitianAboutExpiringDiet = async (
  dietitianToken: string,
  patientName: string,
  dietTitle: string,
  daysUntilExpiry: number
) => {
  try {
    let title = '⏰ Diyet Süresi Bitiyor';
    let body = '';

    if (daysUntilExpiry === 1) {
      body = `${patientName}'in "${dietTitle}" diyeti YARIM GÜN içinde (pazar 18:00) bitecek`;
    } else if (daysUntilExpiry === 2) {
      body = `${patientName}'in "${dietTitle}" diyeti YARıN (pazar 18:00) bitecek`;
    } else {
      body = `${patientName}'in "${dietTitle}" diyeti pazar günü akşam 18:00'de bitecek`;
    }

    await sendPushNotification(dietitianToken, title, body, {
      type: 'diet_expiring',
      patientName,
      dietTitle,
      daysUntilExpiry,
    });

    console.log('✅ Diyetisyene expiry bildirimi gönderildi:', patientName);
  } catch (error) {
    console.error('❌ Diyetisyen bildirimi hatası:', error);
  }
};

/**
 * Hastaya: Diyetin pazar günü bitecek (Cumartesi gönder)
 */
export const notifyPatientAboutExpiringDiet = async (
  patientToken: string,
  dietTitle: string,
  daysUntilExpiry: number
) => {
  try {
    let title = '🥗 Diyet Süresi Bitiyor';
    let body = '';

    if (daysUntilExpiry === 1) {
      body = `"${dietTitle}" diyetin YARIM GÜN içinde (pazar 18:00) bitecek. Yeni diyet için diyetisyenle iletişime geç.`;
    } else if (daysUntilExpiry === 2) {
      body = `"${dietTitle}" diyetin YARıN (pazar 18:00) bitecek. Yeni diyet için diyetisyenle iletişime geç.`;
    } else {
      body = `"${dietTitle}" diyetin pazar günü akşam 18:00'de bitecek. Yeni diyet için diyetisyenle iletişime geç.`;
    }

    await sendPushNotification(patientToken, title, body, {
      type: 'diet_expiring',
      dietTitle,
      daysUntilExpiry,
    });

    console.log('✅ Hastaya expiry bildirimi gönderildi:', dietTitle);
  } catch (error) {
    console.error('❌ Hasta bildirimi hatası:', error);
  }
};

/**
 * Diyetisyene: Danışanın diyeti süresi doldu
 */
export const notifyDietitianDietExpired = async (
  dietitianToken: string,
  patientName: string,
  dietTitle: string
) => {
  try {
    const title = '❌ Diyet Süresi Doldu';
    const body = `${patientName}'in "${dietTitle}" diyeti süresi doldu. Yeni diyet oluşturmayı unutmayın!`;

    await sendPushNotification(dietitianToken, title, body, {
      type: 'diet_expired',
      patientName,
      dietTitle,
    });

    console.log('✅ Diyetisyene expired bildirimi gönderildi:', patientName);
  } catch (error) {
    console.error('❌ Diyetisyen expired bildirimi hatası:', error);
  }
};

/**
 * Hastaya: Diyetin süresi doldu
 */
export const notifyPatientDietExpired = async (
  patientToken: string,
  dietTitle: string
) => {
  try {
    const title = '📋 Diyetin Süresi Doldu';
    const body = `"${dietTitle}" diyetin süresi doldu. Lütfen diyetisyeninizle iletişime geçin.`;

    await sendPushNotification(patientToken, title, body, {
      type: 'diet_expired',
      dietTitle,
    });

    console.log('✅ Hastaya expired bildirimi gönderildi:', dietTitle);
  } catch (error) {
    console.error('❌ Hasta expired bildirimi hatası:', error);
  }
};

/**
 * Scheduled: Danışanlara diyet expiry bildirimi gönder (Cumartesi günü çalışacak)
 * Her cumartesi saat 09:00'da çalıştırılmalı
 */
export const sendDietExpiryReminders = async () => {
  try {
    console.log('🔄 Diyet expiry reminders başlatılıyor...');

    // Cloud Function veya backend task tarafından çalıştırılacak
    // Bu fonksiyon, tüm active diyetleri kontrol edecek
    // 2 gün kaldı ise (cumartesi) bildirim gönderecek

    const response = await fetch('YOUR_BACKEND_URL/api/notifications/diet-expiry-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Reminders gönderme hatası');
    }

    console.log('✅ Diyet expiry reminders gönderildi');
  } catch (error) {
    console.error('❌ Diyet reminders hatası:', error);
  }
};

/**
 * Scheduled: Süresi dolmuş diyetleri expire et (Pazar 18:00)
 * Cloud Function tarafından çalıştırılacak
 */
export const expireDietsAndNotify = async () => {
  try {
    console.log('🔄 Süresi dolmuş diyetler expire ediliyor...');

    // Cloud Function tarafından çalıştırılacak
    const response = await fetch('YOUR_BACKEND_URL/api/notifications/expire-diets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Expire işlemi hatası');
    }

    console.log('✅ Diyetler expire edildi ve bildirimler gönderildi');
  } catch (error) {
    console.error('❌ Expire işlemi hatası:', error);
  }
};

// Bildirim dinleyicilerini kur
export const setupNotificationListeners = () => {
  // Bildirim geldiğinde
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📩 Bildirim geldi:', notification);

    // Diyet expiry bildirimi ise özel işlem yap
    if (notification.request.content.data.type === 'diet_expiring') {
      console.log('🥗 Diyet expiry bildirimi alındı');
    } else if (notification.request.content.data.type === 'diet_expired') {
      console.log('⏰ Diyet expired bildirimi alındı');
    }
  });

  // Bildirime tıklandığında
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Bildirime tıklandı:', response);

    const data = response.notification.request.content.data;

    // Bildirim türüne göre yönlendirme yapılabilir
    if (data.type === 'diet_expiring' || data.type === 'diet_expired') {
      // Diyet planı ekranına yönlendir
      // navigation.navigate('PatientDietPlan'); // veya 'DietitianPatients'
    }
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};

/**
 * FIRESTORE NOTIFICATION FUNCTIONS
 */

const NOTIFICATIONS_COLLECTION = 'notifications';

// Firestore'a bildirim kaydet
export const saveNotificationToFirestore = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    const notificationData: Omit<Notification, 'id'> = {
      userId,
      type: type as any,
      title,
      body,
      data: data || {},
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
    console.log('✅ Bildirim Firestore\'a kaydedildi:', userId);
  } catch (error) {
    console.error('❌ Firestore bildirim kaydetme hatası:', error);
  }
};

// Kullanıcının bildirimlerini getir
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));

    // Client-side'da sırala ve limit uygula
    return notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
  } catch (error) {
    console.error('❌ Bildirimler yükleme hatası:', error);
    return [];
  }
};

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notifRef, {
      read: true,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('❌ Bildirim okundu işaretleme hatası:', error);
  }
};

// Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map((document) =>
      updateDoc(doc(db, NOTIFICATIONS_COLLECTION, document.id), {
        read: true,
        updatedAt: Date.now(),
      })
    );

    await Promise.all(updatePromises);
    console.log('✅ Tüm bildirimler okundu işaretlendi');
  } catch (error) {
    console.error('❌ Tüm bildirimleri okundu işaretleme hatası:', error);
  }
};

// Tüm bildirimleri sil
export const deleteAllNotifications = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map((document) =>
      deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, document.id))
    );

    await Promise.all(deletePromises);
    console.log('✅ Tüm bildirimler silindi');
  } catch (error) {
    console.error('❌ Tüm bildirimleri silme hatası:', error);
  }
};

/**
 * QUESTION/MESSAGE NOTIFICATIONS
 */

/**
 * Diyetisyene: Yeni soru geldi bildirimi
 */
export const notifyDietitianNewQuestion = async (
  dietitianToken: string,
  dietitianUserId: string,
  patientName: string,
  questionText: string,
  questionId: string
) => {
  try {
    const title = '❓ Yeni Soru Geldi';
    const body = `${patientName} size bir soru gönderdi: "${questionText.substring(0, 60)}${questionText.length > 60 ? '...' : ''}"`;

    const notificationData = {
      type: 'new_question',
      patientName,
      questionText,
      questionId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(dietitianUserId, 'new_question', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(dietitianToken, title, body, notificationData);

    console.log('✅ Diyetisyene yeni soru bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Yeni soru bildirimi hatası:', error);
  }
};

/**
 * Danışana: Diyetisyen soruya cevap verdi bildirimi
 */
export const notifyPatientQuestionResponse = async (
  patientToken: string,
  patientUserId: string,
  dietitianName: string,
  questionText: string,
  response: string,
  questionId: string
) => {
  try {
    const title = '✅ Sorunuz Cevaplandı';
    const body = `${dietitianName}, sorunuza cevap verdi: "${response.substring(0, 60)}${response.length > 60 ? '...' : ''}"`;

    const notificationData = {
      type: 'question_response',
      dietitianName,
      questionText,
      response,
      questionId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(patientUserId, 'question_response', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(patientToken, title, body, notificationData);

    console.log('✅ Danışana soru cevabı bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Soru cevabı bildirimi hatası:', error);
  }
};

/**
 * WATER REMINDER NOTIFICATIONS
 */

/**
 * Danışana: Su içme hatırlatıcısı
 */
export const notifyWaterReminder = async (
  patientToken: string,
  patientUserId: string,
  currentWater: number,
  waterGoal: number
) => {
  try {
    const remaining = waterGoal - currentWater;
    const title = '💧 Su İçme Zamanı!';
    let body = '';

    if (currentWater === 0) {
      body = `Bugün henüz su içmediniz. Günlük hedefiniz ${waterGoal}L. Haydi, bir bardak su için!`;
    } else if (remaining > 0) {
      body = `Hedefinize ulaşmak için ${remaining.toFixed(1)}L daha su içmeniz gerekiyor. Devam edin! 💪`;
    } else {
      body = `Tebrikler! Bugünkü su hedefini tamamladınız! 🎉`;
    }

    const notificationData = {
      type: 'water_reminder',
      currentWater,
      waterGoal,
      remaining,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(patientUserId, 'water_reminder', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(patientToken, title, body, notificationData);

    console.log('✅ Su içme hatırlatıcısı gönderildi');
  } catch (error) {
    console.error('❌ Su hatırlatıcısı hatası:', error);
  }
};

/**
 * NEW DIET PLAN NOTIFICATIONS
 */

/**
 * Danışana: Yeni diyet planı atandı bildirimi
 */
export const notifyPatientNewDiet = async (
  patientToken: string,
  patientUserId: string,
  dietitianName: string,
  dietTitle: string,
  dietPlanId: string
) => {
  try {
    const title = '🥗 Yeni Diyet Planınız Hazır!';
    const body = `${dietitianName} size yeni bir diyet planı oluşturdu: "${dietTitle}". Şimdi inceleyin!`;

    const notificationData = {
      type: 'new_diet',
      dietitianName,
      dietTitle,
      dietPlanId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(patientUserId, 'new_diet', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(patientToken, title, body, notificationData);

    console.log('✅ Danışana yeni diyet bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Yeni diyet bildirimi hatası:', error);
  }
};

/**
 * Danışana: Diyet süresi yaklaşıyor bildirimi (Firestore'a kaydet)
 */
export const notifyPatientDietExpiringSoon = async (
  patientToken: string,
  patientUserId: string,
  dietTitle: string,
  daysUntilExpiry: number,
  dietPlanId: string
) => {
  try {
    let title = '⏰ Diyet Süresi Bitiyor';
    let body = '';

    if (daysUntilExpiry === 1) {
      body = `"${dietTitle}" diyetiniz YARIN sona erecek. Diyetisyeninizle iletişime geçin.`;
    } else if (daysUntilExpiry === 2) {
      body = `"${dietTitle}" diyetiniz ${daysUntilExpiry} gün içinde sona erecek. Diyetisyeninizle iletişime geçin.`;
    } else {
      body = `"${dietTitle}" diyetiniz ${daysUntilExpiry} gün içinde sona erecek.`;
    }

    const notificationData = {
      type: 'diet_expiring',
      dietTitle,
      daysUntilExpiry,
      dietPlanId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(patientUserId, 'diet_expiring', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(patientToken, title, body, notificationData);

    console.log('✅ Danışana diyet expiring bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Diyet expiring bildirimi hatası:', error);
  }
};

/**
 * Danışana: Diyet süresi doldu bildirimi (Firestore'a kaydet)
 */
export const notifyPatientDietExpiredWithFirestore = async (
  patientToken: string,
  patientUserId: string,
  dietTitle: string,
  dietPlanId: string
) => {
  try {
    const title = '📋 Diyetiniz Sona Erdi';
    const body = `"${dietTitle}" diyetinizin süresi doldu. Yeni diyet planı için diyetisyeninizle görüşün.`;

    const notificationData = {
      type: 'diet_expired',
      dietTitle,
      dietPlanId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(patientUserId, 'diet_expired', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(patientToken, title, body, notificationData);

    console.log('✅ Danışana diyet expired bildirimi (Firestore) gönderildi');
  } catch (error) {
    console.error('❌ Diyet expired bildirimi hatası:', error);
  }
};

/**
 * Diyetisyene: Danışanın diyeti süresi yaklaşıyor (Firestore'a kaydet)
 */
export const notifyDietitianDietExpiringSoon = async (
  dietitianToken: string,
  dietitianUserId: string,
  patientName: string,
  dietTitle: string,
  daysUntilExpiry: number,
  dietPlanId: string
) => {
  try {
    let title = '⏰ Diyet Süresi Bitiyor';
    let body = '';

    if (daysUntilExpiry === 1) {
      body = `${patientName} adlı danışanınızın "${dietTitle}" diyeti YARIN sona erecek.`;
    } else {
      body = `${patientName} adlı danışanınızın "${dietTitle}" diyeti ${daysUntilExpiry} gün içinde sona erecek.`;
    }

    const notificationData = {
      type: 'diet_expiring',
      patientName,
      dietTitle,
      daysUntilExpiry,
      dietPlanId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(dietitianUserId, 'diet_expiring', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(dietitianToken, title, body, notificationData);

    console.log('✅ Diyetisyene diyet expiring bildirimi gönderildi');
  } catch (error) {
    console.error('❌ Diyetisyen diyet expiring bildirimi hatası:', error);
  }
};

/**
 * Diyetisyene: Danışanın diyeti süresi doldu (Firestore'a kaydet)
 */
export const notifyDietitianDietExpiredWithFirestore = async (
  dietitianToken: string,
  dietitianUserId: string,
  patientName: string,
  dietTitle: string,
  dietPlanId: string
) => {
  try {
    const title = '❌ Diyet Süresi Doldu';
    const body = `${patientName} adlı danışanınızın "${dietTitle}" diyetinin süresi doldu. Yeni plan oluşturmayı unutmayın.`;

    const notificationData = {
      type: 'diet_expired',
      patientName,
      dietTitle,
      dietPlanId,
    };

    // Firestore'a kaydet
    await saveNotificationToFirestore(dietitianUserId, 'diet_expired', title, body, notificationData);

    // Push notification gönder
    await sendPushNotification(dietitianToken, title, body, notificationData);

    console.log('✅ Diyetisyene diyet expired bildirimi (Firestore) gönderildi');
  } catch (error) {
    console.error('❌ Diyetisyen diyet expired bildirimi hatası:', error);
  }
};