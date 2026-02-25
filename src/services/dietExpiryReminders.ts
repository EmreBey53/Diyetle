import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { DietPlan, isExpired } from '../models/DietPlan';
import {
  notifyDietitianAboutExpiringDiet,
  notifyPatientAboutExpiringDiet,
  notifyDietitianDietExpired,
  notifyPatientDietExpired,
} from './notificationService';

export const checkAndExpireDiets = async () => {
  try {

    const snapshot = await getDocs(
      query(collection(db, 'dietPlans'), where('status', '==', 'active'))
    );

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    const now = new Date();
    let expiredCount = 0;

    snapshot.forEach((docSnap) => {
      const diet = docSnap.data() as DietPlan;
      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      if (now >= expiryDate && diet.status === 'active') {
        batch.update(docSnap.ref, {
          status: 'expired',
          expiredAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        });
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      await batch.commit();
    }

    return expiredCount;
  } catch (error) {
    throw error;
  }
};

export const getExpiringDiets = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'dietPlans'),
        where('patientId', '==', patientId),
        where('status', '==', 'active')
      )
    );

    const now = new Date();
    const expiringDiets: DietPlan[] = [];

    snapshot.forEach((docSnap) => {
      const diet = {
        ...docSnap.data(),
        id: docSnap.id,
      } as DietPlan;

      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 2) {
        expiringDiets.push(diet);
      }
    });

    return expiringDiets;
  } catch (error) {
    throw error;
  }
};

export const getDietitianExpiringDiets = async (
  dietitianId: string
): Promise<
  Array<{
    patientId: string;
    patientName: string;
    diet: DietPlan;
    daysUntilExpiry: number;
  }>
> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'dietPlans'),
        where('dietitianId', '==', dietitianId),
        where('status', '==', 'active')
      )
    );

    const now = new Date();
    const expiringDiets: Array<{
      patientId: string;
      patientName: string;
      diet: DietPlan;
      daysUntilExpiry: number;
    }> = [];

    snapshot.forEach((docSnap) => {
      const diet = {
        ...docSnap.data(),
        id: docSnap.id,
      } as DietPlan;

      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 2) {
        expiringDiets.push({
          patientId: diet.patientId,
          patientName: diet.patientName,
          diet,
          daysUntilExpiry,
        });
      }
    });

    return expiringDiets;
  } catch (error) {
    throw error;
  }
};

export const sendExpiryReminders = async (patientId: string, pushToken: string) => {
  try {
    const expiringDiets = await getExpiringDiets(patientId);

    if (expiringDiets.length === 0) {
      return;
    }

    for (const diet of expiringDiets) {
      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (pushToken) {
        await notifyPatientAboutExpiringDiet(pushToken, diet.title, daysUntilExpiry);
      }
    }

  } catch (error) {
  }
};

export const notifyDietitianOfExpiringDiets = async (
  dietitianId: string,
  dietitianToken: string
) => {
  try {
    const expiringDiets = await getDietitianExpiringDiets(dietitianId);

    if (expiringDiets.length === 0) {
      return;
    }

    for (const item of expiringDiets) {
      await notifyDietitianAboutExpiringDiet(
        dietitianToken,
        item.patientName,
        item.diet.title,
        item.daysUntilExpiry
      );
    }

  } catch (error) {
  }
};

export const initializeDietExpiryCheck = async () => {
  try {
    await checkAndExpireDiets();
  } catch (error) {
    // Error silently fail
  }
};