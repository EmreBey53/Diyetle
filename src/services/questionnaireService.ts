import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { Questionnaire } from '../models/Questionnaire';
import { notifyDietitianNewPatient } from './notificationService';

const QUESTIONNAIRES_COLLECTION = 'questionnaires';
const PATIENTS_COLLECTION = 'patients';

export const saveQuestionnaire = async (
  questionnaireData: Omit<Questionnaire, 'id' | 'completedAt' | 'updatedAt'>,
  displayName?: string,
  email?: string,
  phone?: string
): Promise<string> => {
  try {

    const now = Timestamp.now();

    const questionnaireToSave: any = {
      userId: questionnaireData.userId,
      dietitianId: questionnaireData.dietitianId,
      height: questionnaireData.height,
      weight: questionnaireData.weight,
      goals: questionnaireData.goals,
      dietaryRestrictions: questionnaireData.dietaryRestrictions,
      healthConditions: questionnaireData.healthConditions,
      foodAllergies: questionnaireData.foodAllergies,
      completedAt: now,
      updatedAt: now,
    };

    // Optional fields - only add if they have values
    if (questionnaireData.targetWeight) questionnaireToSave.targetWeight = questionnaireData.targetWeight;
    if (questionnaireData.activityLevel) questionnaireToSave.activityLevel = questionnaireData.activityLevel;
    if (questionnaireData.notes) questionnaireToSave.notes = questionnaireData.notes;

    // Save questionnaire to Firestore & Get dietitian info in parallel
    const [questionnaireRef, dietitianDoc] = await Promise.all([
      addDoc(collection(db, QUESTIONNAIRES_COLLECTION), questionnaireToSave),
      getDoc(doc(db, 'users', questionnaireData.dietitianId))
    ]);


    const patientData: any = {
      userId: questionnaireData.userId,
      dietitianId: questionnaireData.dietitianId,
      name: displayName || 'Hasta',
      email: email || '',
      status: 'active',
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };

    // Optional fields - only add if they have values (Firebase doesn't accept undefined)
    if (phone) patientData.phone = phone;
    if (questionnaireData.height) patientData.height = questionnaireData.height;
    if (questionnaireData.weight) patientData.weight = questionnaireData.weight;
    if (questionnaireData.targetWeight) patientData.targetWeight = questionnaireData.targetWeight;
    if (questionnaireData.goals && questionnaireData.goals.length > 0) patientData.goals = questionnaireData.goals;
    if (questionnaireData.dietaryRestrictions && questionnaireData.dietaryRestrictions.length > 0) {
      patientData.dietaryRestrictions = questionnaireData.dietaryRestrictions;
    }
    if (questionnaireData.healthConditions && questionnaireData.healthConditions.length > 0) {
      patientData.healthConditions = questionnaireData.healthConditions;
    }
    if (questionnaireData.foodAllergies && questionnaireData.foodAllergies.length > 0) {
      patientData.foodAllergies = questionnaireData.foodAllergies;
    }
    if (questionnaireData.activityLevel) patientData.activityLevel = questionnaireData.activityLevel;
    if (questionnaireData.notes) patientData.notes = questionnaireData.notes;

    // Check if patient already exists
    const patientQuery = query(
      collection(db, PATIENTS_COLLECTION),
      where('userId', '==', questionnaireData.userId)
    );
    const existingPatients = await getDocs(patientQuery);

    let patientId: string;

    if (!existingPatients.empty) {
      // Update existing patient
      const existingPatient = existingPatients.docs[0];
      patientId = existingPatient.id;

      await updateDoc(doc(db, PATIENTS_COLLECTION, patientId), {
        ...patientData,
        updatedAt: now.toDate(),
      });

    } else {
      // Create new patient
      const patientRef = await addDoc(collection(db, PATIENTS_COLLECTION), patientData);
      patientId = patientRef.id;


      try {
        if (dietitianDoc.exists()) {
          const dietitianData = dietitianDoc.data();
          const dietitianPushToken = dietitianData.pushToken;

          if (dietitianPushToken) {
            await notifyDietitianNewPatient(
              dietitianPushToken,
              displayName || 'Yeni Danışan',
              email || ''
            );
          } else {
          }
        } else {
        }
      } catch (notificationError) {
      }
    }

    return patientId;
  } catch (error: any) {
    throw new Error(error.message || 'Questionnaire kaydedilemedi');
  }
};

export const getQuestionnaireByUserId = async (userId: string): Promise<Questionnaire | null> => {
  try {
    const q = query(
      collection(db, QUESTIONNAIRES_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // Get the most recent questionnaire
    const docs = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      completedAt: doc.data().completedAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Questionnaire[];

    docs.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

    return docs[0];
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateQuestionnaire = async (
  questionnaireId: string,
  updates: Partial<Omit<Questionnaire, 'id' | 'completedAt' | 'userId'>>
): Promise<void> => {
  try {
    const now = Timestamp.now();

    await updateDoc(doc(db, QUESTIONNAIRES_COLLECTION, questionnaireId), {
      ...updates,
      updatedAt: now,
    });

  } catch (error: any) {
    throw new Error(error.message);
  }
};
