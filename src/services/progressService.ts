import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { Progress, calculateBMI } from '../models/Progress';

const PROGRESS_COLLECTION = 'progress';

export const createProgress = async (
  progressData: Omit<Progress, 'id' | 'createdAt' | 'updatedAt' | 'bmi'>
): Promise<string> => {
  try {
    const bmi = calculateBMI(progressData.weight, progressData.height);
    
    const progress: any = {
      patientId: progressData.patientId,
      patientName: progressData.patientName,
      weight: progressData.weight,
      height: progressData.height,
      bmi,
      recordDate: progressData.recordDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (progressData.notes) {
      progress.notes = progressData.notes;
    }

    const docRef = await addDoc(collection(db, PROGRESS_COLLECTION), progress);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getProgressByPatient = async (patientId: string): Promise<Progress[]> => {
  try {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);
    const progressData: Progress[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        recordDate: data.recordDate?.toDate ? data.recordDate.toDate() : data.recordDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Progress;
    });

    progressData.sort((a, b) => {
      const dateA = typeof a.recordDate === 'string' ? new Date(a.recordDate).getTime() : a.recordDate.getTime();
      const dateB = typeof b.recordDate === 'string' ? new Date(b.recordDate).getTime() : b.recordDate.getTime();
      return dateB - dateA;
    });

    return progressData;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deleteProgress = async (progressId: string): Promise<void> => {
  try {
    const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
    await deleteDoc(progressRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getLatestProgress = async (patientId: string): Promise<Progress | null> => {
  try {
    const progressData = await getProgressByPatient(patientId);
    return progressData.length > 0 ? progressData[0] : null;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export interface ProgressStats {
  totalRecords: number;
  currentWeight: number | null;
  startWeight: number | null;
  weightChange: number | null;
  currentBMI: number | null;
  startBMI: number | null;
  bmiChange: number | null;
}

export const getProgressStats = async (patientId: string): Promise<ProgressStats> => {
  try {
    const progressData = await getProgressByPatient(patientId);
    
    if (progressData.length === 0) {
      return {
        totalRecords: 0,
        currentWeight: null,
        startWeight: null,
        weightChange: null,
        currentBMI: null,
        startBMI: null,
        bmiChange: null,
      };
    }

    // En yeni ve en eski kayıt (sort edilmiş halde)
    const latest = progressData[0];
    const oldest = progressData[progressData.length - 1];

    return {
      totalRecords: progressData.length,
      currentWeight: latest.weight,
      startWeight: oldest.weight,
      weightChange: Number((latest.weight - oldest.weight).toFixed(1)),
      currentBMI: latest.bmi,
      startBMI: oldest.bmi,
      bmiChange: Number((latest.bmi - oldest.bmi).toFixed(1)),
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};