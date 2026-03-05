import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';
import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { Notification } from '../models/Notification';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

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
      return null;
    }

    try {
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: '7900e061-56da-44bc-a397-0695b2db0c3e',
      });
      token = expoPushToken.data;
    } catch (error: any) {
      return null;
    }
  } else {
  }

  return token;
};

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

  } catch (error) {
  }
};

export const scheduleLocalNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { data: 'test' },
    },
    trigger: null,
  });
};

// Her sabah 08:00'de günlük özet bildirimi planla
export const scheduleDailySummaryNotification = async (
  mealCount: number,
  waterGoal: number,
  hasAppointmentToday: boolean,
): Promise<void> => {
  try {
    // Önce varsa eski günlük özet bildirimini iptal et
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'daily_summary') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    const parts: string[] = [];
    if (mealCount > 0) parts.push(`🍽 Bugün ${mealCount} öğünün var`);
    if (waterGoal > 0) parts.push(`💧 ${waterGoal}L su içmeyi unutma`);
    if (hasAppointmentToday) parts.push('📅 Bugün randevun var!');
    if (parts.length === 0) parts.push('Sağlıklı bir gün geçir!');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌞 Günaydın! Bugünkü özetiniz',
        body: parts.join(' • '),
        data: { type: 'daily_summary' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
  } catch {
    // Bildirim planlanamadıysa sessizce geç
  }
};

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
    return result;
  } catch (error) {
    throw error;
  }
};

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

  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(dietitianUserId, 'meal_photo', title, body, notificationData);
    await sendPushNotification(dietitianToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(patientUserId, 'photo_response', title, body, notificationData);
    await sendPushNotification(patientToken, title, body, notificationData);
  } catch (error) {
  }
};

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

  } catch (error) {
  }
};

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

  } catch (error) {
  }
};

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

  } catch (error) {
  }
};

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

  } catch (error) {
  }
};


export const setupNotificationListeners = () => {
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    if (notification.request.content.data.type === 'diet_expiring') {
    } else if (notification.request.content.data.type === 'diet_expired') {
    }
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data.type === 'diet_expiring' || data.type === 'diet_expired') {
    }
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};

const NOTIFICATIONS_COLLECTION = 'notifications';

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
  } catch (error) {
  }
};

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

    return notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
  } catch (error) {
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notifRef, {
      read: true,
      updatedAt: Date.now(),
    });
  } catch (error) {
  }
};

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
  } catch (error) {
  }
};

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
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(dietitianUserId, 'new_question', title, body, notificationData);
    await sendPushNotification(dietitianToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(patientUserId, 'question_response', title, body, notificationData);
    await sendPushNotification(patientToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(patientUserId, 'water_reminder', title, body, notificationData);
    await sendPushNotification(patientToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(patientUserId, 'new_diet', title, body, notificationData);
    await sendPushNotification(patientToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(patientUserId, 'diet_expiring', title, body, notificationData);
    await sendPushNotification(patientToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(patientUserId, 'diet_expired', title, body, notificationData);
    await sendPushNotification(patientToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(dietitianUserId, 'diet_expiring', title, body, notificationData);
    await sendPushNotification(dietitianToken, title, body, notificationData);
  } catch (error) {
  }
};

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

    await saveNotificationToFirestore(dietitianUserId, 'diet_expired', title, body, notificationData);
    await sendPushNotification(dietitianToken, title, body, notificationData);
  } catch (error) {
  }
};