import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { DietPlan, Meal } from '../models/DietPlan';

const DIET_PLANS_COLLECTION = 'dietPlans';

export const createDietPlan = async (planData: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const plan = {
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, DIET_PLANS_COLLECTION), plan);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getDietPlansByPatient = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const q = query(
      collection(db, DIET_PLANS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);

    const plans: DietPlan[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      
      let expiryDate = data.expiryDate;
      if (!expiryDate) {
        const startDate = data.startDate?.toDate?.() || new Date(data.startDate) || new Date();
        expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 7);
      }
      
      return {
        ...data,
        id: doc.id,
        expiryDate: expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as DietPlan;
    });

    return plans.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getActiveDietPlan = async (patientId: string): Promise<DietPlan | null> => {
  try {
    const q = query(
      collection(db, DIET_PLANS_COLLECTION),
      where('patientId', '==', patientId),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      ...data,
      id: doc.id,
      startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as DietPlan;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getActiveDietPlans = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const allPlans = await getDietPlansByPatient(patientId);
    return allPlans.filter((plan) => plan.isActive === true);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getExpiredDietPlans = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const allPlans = await getDietPlansByPatient(patientId);
    return allPlans.filter((plan) => plan.isActive === false);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateDietPlan = async (planId: string, updates: Partial<DietPlan>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    const planRef = doc(db, DIET_PLANS_COLLECTION, planId);
    await updateDoc(planRef, updateData);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateDietExpiryDate = async (
  planId: string,
  newExpiryDay: number = 0,
  newExpiryTime: string = '18:00'
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let expiryDate = new Date(today);

    if (expiryDate.getDay() === newExpiryDay) {
      const [hours, minutes] = newExpiryTime.split(':').map(Number);
      expiryDate.setHours(hours, minutes, 0, 0);

      // If the time has already passed today, move to next week
      const now = new Date();
      if (expiryDate < now) {
        expiryDate.setDate(expiryDate.getDate() + 7);
      }
    } else {
      let daysAhead = newExpiryDay - expiryDate.getDay();
      if (daysAhead <= 0) {
        daysAhead += 7;
      }
      expiryDate.setDate(expiryDate.getDate() + daysAhead);
      
      const [hours, minutes] = newExpiryTime.split(':').map(Number);
      expiryDate.setHours(hours, minutes, 0, 0);
    }

    const planRef = doc(db, DIET_PLANS_COLLECTION, planId);
    const updateData = {
      expiryDate: expiryDate,
      expiryDay: newExpiryDay,
      expiryTime: newExpiryTime,
      updatedAt: new Date(),
    };

    await updateDoc(planRef, updateData);

  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deleteDietPlan = async (planId: string): Promise<void> => {
  try {
    const planRef = doc(db, DIET_PLANS_COLLECTION, planId);
    await deleteDoc(planRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getDietPlanById = async (planId: string): Promise<DietPlan | null> => {
  try {
    const docRef = doc(db, DIET_PLANS_COLLECTION, planId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    
    let expiryDate = data.expiryDate;
    if (!expiryDate) {
      const startDate = data.startDate?.toDate?.() || new Date(data.startDate) || new Date();
      expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 7);
    }

    return {
      ...data,
      id: docSnap.id,
      expiryDate: expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate),
      startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as DietPlan;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getDietitianPatientsWithExpiryInfo = async (dietitianId: string): Promise<Array<{
  patientId: string;
  patientName: string;
  activeDiets: DietPlan[];
  daysUntilExpiry?: number;
}>> => {
  try {
    const q = query(
      collection(db, DIET_PLANS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );

    const querySnapshot = await getDocs(q);

    const patientsMap = new Map();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      let expiryDate = data.expiryDate;

      if (expiryDate && typeof expiryDate === 'object' && expiryDate.toDate) {
        expiryDate = expiryDate.toDate();
      } else if (typeof expiryDate === 'string') {
        expiryDate = new Date(expiryDate);
      }
      
      if (!expiryDate) {
        const startDate = data.startDate?.toDate?.() || new Date(data.startDate) || new Date();
        expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 7);
      }
      
      const daysLeft = Math.ceil(
        (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const diet = {
        ...data,
        id: docSnap.id,
        expiryDate: expiryDate instanceof Date ? expiryDate : new Date(expiryDate),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as DietPlan;

      const isActive = data.isActive !== false && data.status !== 'expired';
      
      if (isActive) {
        const patientKey = `${data.patientId}_${data.patientName}`;
        if (!patientsMap.has(patientKey)) {
          patientsMap.set(patientKey, {
            patientId: data.patientId,
            patientName: data.patientName,
            activeDiets: [],
            daysUntilExpiry: daysLeft,
          });
        }

        patientsMap.get(patientKey).activeDiets.push(diet);
      } else {
      }
    });

    const result = Array.from(patientsMap.values());
    
    return result;
  } catch (error: any) {
    throw new Error(error.message);
  }
};