// src/services/reminderService.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface Reminder {
  id?: string;
  patientId: string;
  type: 'weight' | 'mealPhoto' | 'custom';
  enabled: boolean;
  title?: string;
  description?: string;
  days: number[]; // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  time?: string; // HH:MM format
  times?: string[]; // Multiple times for meal photos
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hastanın hatırlatıcılarını getir
 */
export const getPatientReminders = async (patientId: string): Promise<Reminder[]> => {
  try {
    const remindersRef = collection(db, 'reminders');
    const q = query(remindersRef, where('patientId', '==', patientId));
    const snapshot = await getDocs(q);

    const reminders: Reminder[] = [];
    snapshot.forEach((doc) => {
      reminders.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as Reminder);
    });

    console.log(`✅ ${reminders.length} hatırlatıcı yüklendi`);
    return reminders;
  } catch (error) {
    console.error('❌ Hatırlatıcılar yükleme hatası:', error);
    throw error;
  }
};

/**
 * Belirli bir hatırlatıcıyı getir
 */
export const getReminder = async (reminderId: string): Promise<Reminder | null> => {
  try {
    const reminderDoc = await getDoc(doc(db, 'reminders', reminderId));

    if (!reminderDoc.exists()) {
      return null;
    }

    return {
      id: reminderDoc.id,
      ...reminderDoc.data(),
      createdAt: reminderDoc.data().createdAt?.toDate() || new Date(),
      updatedAt: reminderDoc.data().updatedAt?.toDate() || new Date(),
    } as Reminder;
  } catch (error) {
    console.error('❌ Hatırlatıcı getirme hatası:', error);
    throw error;
  }
};

/**
 * Yeni hatırlatıcı oluştur
 */
export const createReminder = async (reminder: Omit<Reminder, 'id'>): Promise<string> => {
  try {
    const remindersRef = collection(db, 'reminders');
    const newReminder = {
      ...reminder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = doc(remindersRef);
    await setDoc(docRef, newReminder);

    console.log('✅ Hatırlatıcı oluşturuldu:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Hatırlatıcı oluşturma hatası:', error);
    throw error;
  }
};

/**
 * Hatırlatıcıyı güncelle
 */
export const updateReminder = async (
  reminderId: string,
  updates: Partial<Reminder>
): Promise<void> => {
  try {
    const reminderRef = doc(db, 'reminders', reminderId);
    await updateDoc(reminderRef, {
      ...updates,
      updatedAt: new Date(),
    });

    console.log('✅ Hatırlatıcı güncellendi:', reminderId);
  } catch (error) {
    console.error('❌ Hatırlatıcı güncelleme hatası:', error);
    throw error;
  }
};

/**
 * Hatırlatıcıyı sil
 */
export const deleteReminder = async (reminderId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'reminders', reminderId));
    console.log('✅ Hatırlatıcı silindi:', reminderId);
  } catch (error) {
    console.error('❌ Hatırlatıcı silme hatası:', error);
    throw error;
  }
};

/**
 * Kilo ölçümü hatırlatıcısını oluştur/güncelle
 */
export const setWeightReminder = async (
  patientId: string,
  days: number[],
  time: string,
  enabled: boolean = true
): Promise<void> => {
  try {
    const remindersRef = collection(db, 'reminders');
    const q = query(
      remindersRef,
      where('patientId', '==', patientId),
      where('type', '==', 'weight')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Yeni hatırlatıcı oluştur
      await createReminder({
        patientId,
        type: 'weight',
        enabled,
        title: 'Kilo Ölçümü',
        description: 'Kilonuzu ölçmeyi unutmayın!',
        days,
        time,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Mevcut hatırlatıcıyı güncelle
      const reminderId = snapshot.docs[0].id;
      await updateReminder(reminderId, {
        days,
        time,
        enabled,
      });
    }

    console.log('✅ Kilo ölçümü hatırlatıcısı ayarlandı');
  } catch (error) {
    console.error('❌ Kilo hatırlatıcısı hatası:', error);
    throw error;
  }
};

/**
 * Öğün fotoğrafı hatırlatıcısını oluştur/güncelle
 */
export const setMealPhotoReminder = async (
  patientId: string,
  times: string[],
  enabled: boolean = true
): Promise<void> => {
  try {
    const remindersRef = collection(db, 'reminders');
    const q = query(
      remindersRef,
      where('patientId', '==', patientId),
      where('type', '==', 'mealPhoto')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Yeni hatırlatıcı oluştur
      await createReminder({
        patientId,
        type: 'mealPhoto',
        enabled,
        title: 'Öğün Fotoğrafı',
        description: 'Öğün fotoğrafı çekmeyi unutmayın!',
        days: [0, 1, 2, 3, 4, 5, 6], // Her gün
        times,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Mevcut hatırlatıcıyı güncelle
      const reminderId = snapshot.docs[0].id;
      await updateReminder(reminderId, {
        times,
        enabled,
      });
    }

    console.log('✅ Öğün fotoğrafı hatırlatıcısı ayarlandı');
  } catch (error) {
    console.error('❌ Öğün fotoğrafı hatırlatıcısı hatası:', error);
    throw error;
  }
};

/**
 * Custom hatırlatıcı oluştur
 */
export const createCustomReminder = async (
  patientId: string,
  title: string,
  description: string,
  days: number[],
  time: string
): Promise<string> => {
  try {
    return await createReminder({
      patientId,
      type: 'custom',
      enabled: true,
      title,
      description,
      days,
      time,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('❌ Custom hatırlatıcı oluşturma hatası:', error);
    throw error;
  }
};

/**
 * Bugün için aktif hatırlatıcıları getir (scheduling için)
 */
export const getTodayReminders = async (patientId: string): Promise<Reminder[]> => {
  try {
    const reminders = await getPatientReminders(patientId);
    const today = new Date().getDay(); // 0=Pazar, 6=Cumartesi

    const todayReminders = reminders.filter(
      (reminder) => reminder.enabled && reminder.days.includes(today)
    );

    console.log(`✅ Bugün ${todayReminders.length} hatırlatıcı aktif`);
    return todayReminders;
  } catch (error) {
    console.error('❌ Bugün hatırlatıcıları getirme hatası:', error);
    throw error;
  }
};

/**
 * Hatırlatıcıyı etkinleştir/devre dışı bırak
 */
export const toggleReminder = async (reminderId: string, enabled: boolean): Promise<void> => {
  try {
    await updateReminder(reminderId, { enabled });
    console.log(`✅ Hatırlatıcı ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
  } catch (error) {
    console.error('❌ Hatırlatıcı toggle hatası:', error);
    throw error;
  }
};