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
  days: number[];
  time?: string;
  times?: string[];
  createdAt: Date;
  updatedAt: Date;
}

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

    return reminders;
  } catch (error) {
    throw error;
  }
};

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
    throw error;
  }
};

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

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

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

  } catch (error) {
    throw error;
  }
};

export const deleteReminder = async (reminderId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'reminders', reminderId));
  } catch (error) {
    throw error;
  }
};

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
      const reminderId = snapshot.docs[0].id;
      await updateReminder(reminderId, {
        days,
        time,
        enabled,
      });
    }

  } catch (error) {
    throw error;
  }
};

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
      await createReminder({
        patientId,
        type: 'mealPhoto',
        enabled,
        title: 'Öğün Fotoğrafı',
        description: 'Öğün fotoğrafı çekmeyi unutmayın!',
        days: [0, 1, 2, 3, 4, 5, 6],
        times,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      const reminderId = snapshot.docs[0].id;
      await updateReminder(reminderId, {
        times,
        enabled,
      });
    }

  } catch (error) {
    throw error;
  }
};

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
    throw error;
  }
};

export const getTodayReminders = async (patientId: string): Promise<Reminder[]> => {
  try {
    const reminders = await getPatientReminders(patientId);
    const today = new Date().getDay();

    const todayReminders = reminders.filter(
      (reminder) => reminder.enabled && reminder.days.includes(today)
    );

    return todayReminders;
  } catch (error) {
    throw error;
  }
};

export const toggleReminder = async (reminderId: string, enabled: boolean): Promise<void> => {
  try {
    await updateReminder(reminderId, { enabled });
  } catch (error) {
    throw error;
  }
};