// src/services/questionnaireService.ts
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

/**
 * Save questionnaire and create patient record
 * @param questionnaireData - Questionnaire form data (without id, completedAt, updatedAt)
 * @param displayName - User's display name
 * @param email - User's email
 * @param phone - User's phone number
 * @returns patientId - Created patient's ID
 */
export const saveQuestionnaire = async (
  questionnaireData: Omit<Questionnaire, 'id' | 'completedAt' | 'updatedAt'>,
  displayName?: string,
  email?: string,
  phone?: string
): Promise<string> => {
  try {
    console.log('📋 Questionnaire kaydediliyor...');

    const now = Timestamp.now();

    // 1. Prepare questionnaire data (Firebase doesn't accept undefined values)
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

    console.log('✅ Questionnaire kaydedildi, ID:', questionnaireRef.id);

    // 2. Create or update patient record
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

      console.log('✅ Existing patient updated, ID:', patientId);
    } else {
      // Create new patient
      const patientRef = await addDoc(collection(db, PATIENTS_COLLECTION), patientData);
      patientId = patientRef.id;

      console.log('✅ New patient created, ID:', patientId);

      // 3. Diyetisyene bildirim gönder (yeni hasta kaydoldu)
      try {
        console.log('📤 Diyetisyene yeni hasta bildirimi gönderiliyor...');

        // Dietitian info already fetched in parallel above
        if (dietitianDoc.exists()) {
          const dietitianData = dietitianDoc.data();
          const dietitianPushToken = dietitianData.pushToken;

          if (dietitianPushToken) {
            await notifyDietitianNewPatient(
              dietitianPushToken,
              displayName || 'Yeni Danışan',
              email || ''
            );
            console.log('✅ Diyetisyene bildirim gönderildi');
          } else {
            console.log('⚠️ Diyetisyenin push token\'ı yok, bildirim gönderilemedi');
          }
        } else {
          console.log('⚠️ Diyetisyen bulunamadı');
        }
      } catch (notificationError) {
        // Bildirim hatası critical değil, sadece log at
        console.error('⚠️ Bildirim gönderme hatası (kritik değil):', notificationError);
      }
    }

    return patientId;
  } catch (error: any) {
    console.error('❌ Questionnaire kaydetme hatası:', error);
    throw new Error(error.message || 'Questionnaire kaydedilemedi');
  }
};

/**
 * Get questionnaire by user ID
 */
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
    console.error('❌ Questionnaire yükleme hatası:', error);
    throw new Error(error.message);
  }
};

/**
 * Update questionnaire
 */
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

    console.log('✅ Questionnaire güncellendi');
  } catch (error: any) {
    console.error('❌ Questionnaire güncelleme hatası:', error);
    throw new Error(error.message);
  }
};
