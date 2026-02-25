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
import { Patient, calculateBMI } from '../models/Patient';

const PATIENTS_COLLECTION = 'patients';

export const syncPatientsFromUsers = async (dietitianId: string): Promise<number> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'patient'),
      where('dietitianId', '==', dietitianId)
    );
    const usersSnapshot = await getDocs(usersQuery);

    const patientsQuery = query(
      collection(db, PATIENTS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );
    const patientsSnapshot = await getDocs(patientsQuery);
    const existingUserIds = new Set(
      patientsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean)
    );

    let addedCount = 0;
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (!existingUserIds.has(userId)) {
        const patientData: any = {
          userId: userId,
          dietitianId: dietitianId,
          name: userData.displayName || userData.name || 'İsimsiz',
          email: userData.email || '',
          phone: userData.phone || '',
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(),
          updatedAt: new Date(),
        };

        if (userData.weight) patientData.weight = userData.weight;
        if (userData.height) patientData.height = userData.height;
        if (userData.bmi) patientData.bmi = userData.bmi;

        await addDoc(collection(db, PATIENTS_COLLECTION), patientData);
        addedCount++;
      }
    }

    return addedCount;
  } catch (error: any) {
    return 0;
  }
};

export const getPatientsByDietitian = async (dietitianId: string): Promise<Patient[]> => {
  try {
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );

    const querySnapshot = await getDocs(q);

    const patients: Patient[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Patient;
    });

    patients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return patients;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const patient = {
      ...patientData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), patient);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getPatientProfileByUserId = async (userId: string): Promise<Patient | null> => {
  try {
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const docData = querySnapshot.docs[0];
    const data = docData.data();
    
    return {
      ...data,
      id: docData.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Patient;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getPatientById = async (patientId: string): Promise<Patient | null> => {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Patient;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updatePatient = async (patientId: string, updates: Partial<Patient>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.weight && updates.height) {
      updateData.bmi = calculateBMI(updates.weight, updates.height);
    }

    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    await updateDoc(patientRef, updateData);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deletePatient = async (patientId: string): Promise<void> => {
  try {
    const dietPlansQuery = query(
      collection(db, 'dietPlans'),
      where('patientId', '==', patientId)
    );
    const dietPlansSnapshot = await getDocs(dietPlansQuery);
    const dietPlanDeletes = dietPlansSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(dietPlanDeletes);

    const progressQuery = query(
      collection(db, 'progress'),
      where('patientId', '==', patientId)
    );
    const progressSnapshot = await getDocs(progressQuery);
    const progressDeletes = progressSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(progressDeletes);

    const questionsQuery = query(
      collection(db, 'questions'),
      where('patientId', '==', patientId)
    );
    const questionsSnapshot = await getDocs(questionsQuery);
    const questionDeletes = questionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(questionDeletes);

    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    await deleteDoc(patientRef);

    try {
      const userRef = doc(db, 'users', patientId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await deleteDoc(userRef);
      }
    } catch (error) {
    }

  } catch (error: any) {
    throw new Error(error.message);
  }
};
