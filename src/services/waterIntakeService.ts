import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { WaterIntake, WaterEntry, getTodayDateString } from '../models/WaterIntake';

const db = getFirestore();

const COLLECTION_NAME = 'waterIntake';

export const getTodayWaterIntake = async (patientId: string): Promise<WaterIntake | null> => {
  try {
    const today = getTodayDateString();
    const q = query(
      collection(db, COLLECTION_NAME),
      where('patientId', '==', patientId),
      where('date', '==', today),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docData = snapshot.docs[0];
    const data = docData.data();
    return {
      id: docData.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as WaterIntake;
  } catch (error) {
    throw error;
  }
};

export const addWaterIntake = async (
  patientId: string,
  amount: number,
  goal: number
): Promise<WaterIntake> => {
  try {
    const today = getTodayDateString();
    const existing = await getTodayWaterIntake(patientId);

    const newEntry: WaterEntry = {
      time: new Date(),
      amount,
    };

    if (existing && existing.id) {
      const newAmount = existing.amount + amount;
      const updatedData = {
        amount: newAmount,
        goal,
        entries: [...existing.entries, newEntry],
        updatedAt: Timestamp.now(),
      };

      const docRef = doc(db, COLLECTION_NAME, existing.id);
      await updateDoc(docRef, updatedData);

      return {
        ...existing,
        ...updatedData,
        updatedAt: new Date(),
      } as WaterIntake;
    } else {
      const newIntake: Omit<WaterIntake, 'id'> = {
        patientId,
        date: today,
        amount,
        goal,
        entries: [newEntry],
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newIntake);

      return {
        id: docRef.id,
        ...newIntake,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as WaterIntake;
    }
  } catch (error) {
    throw error;
  }
};

export const removeWaterIntake = async (
  patientId: string,
  amount: number,
  goal: number
): Promise<WaterIntake | null> => {
  try {
    const existing = await getTodayWaterIntake(patientId);

    if (!existing || !existing.id) {
      return null;
    }

    const newAmount = Math.max(0, existing.amount - amount);

    const updatedData = {
      amount: newAmount,
      goal,
      updatedAt: Timestamp.now(),
    };

    const docRef = doc(db, COLLECTION_NAME, existing.id);
    await updateDoc(docRef, updatedData);

    return {
      ...existing,
      ...updatedData,
      updatedAt: new Date(),
    } as WaterIntake;
  } catch (error) {
    throw error;
  }
};

export const getWaterIntakeHistory = async (
  patientId: string,
  startDate: string,
  endDate: string
): Promise<WaterIntake[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('patientId', '==', patientId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docData => {
      const data = docData.data();
      return {
        id: docData.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as WaterIntake;
    });
  } catch (error) {
    throw error;
  }
};

export const getWaterIntakeStats = async (patientId: string): Promise<{
  average: number;
  goalAchievedDays: number;
  totalDays: number;
}> => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const history = await getWaterIntakeHistory(patientId, startDate, endDate);

    if (history.length === 0) {
      return { average: 0, goalAchievedDays: 0, totalDays: 0 };
    }

    const totalAmount = history.reduce((sum, record) => sum + record.amount, 0);
    const average = totalAmount / history.length;
    const goalAchievedDays = history.filter(record => record.amount >= record.goal).length;

    return {
      average: Number(average.toFixed(1)),
      goalAchievedDays,
      totalDays: history.length,
    };
  } catch (error) {
    throw error;
  }
};
