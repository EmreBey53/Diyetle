// src/services/questionService.ts
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
  orderBy,
  getDoc,
} from 'firebase/firestore';
import { Question } from '../models/Question';
import { sendPushNotification } from './notificationService';
import { scheduleLocalNotification } from './notificationService';

const QUESTIONS_COLLECTION = 'questions';

// Soru oluştur (Danışan)
export const createQuestion = async (
  questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'isAnswered'>
): Promise<string> => {
  try {
    const question = {
      ...questionData,
      isAnswered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), question);
    console.log('✅ Soru oluşturuldu, ID:', docRef.id);

    // Diyetisyene bildirim gönder
    try {
      const dietitianDoc = await getDoc(doc(db, 'users', questionData.dietitianId));
      if (dietitianDoc.exists()) {
        const dietitianData = dietitianDoc.data();
        const pushToken = dietitianData?.pushToken;

        if (pushToken) {
          await sendPushNotification(
            pushToken,
            `💬 Yeni Soru: ${questionData.patientName}`,
            questionData.question.length > 100
              ? questionData.question.substring(0, 100) + '...'
              : questionData.question,
            {
              type: 'new_question',
              questionId: docRef.id,
              patientId: questionData.patientId,
              patientName: questionData.patientName,
            }
          );
          console.log('✅ Diyetisyene bildirim gönderildi');
        } else {
          console.log('⚠️ Diyetisyenin push token\'ı bulunamadı');
        }
      }
    } catch (notifError) {
      console.error('⚠️ Bildirim gönderme hatası (görmezden gelindi):', notifError);
      // Bildirim hatası ana işlemi etkilemesin
    }

    return docRef.id;
  } catch (error: any) {
    console.error('❌ Soru oluşturma hatası:', error);
    throw new Error(error.message);
  }
};

// Danışanın sorularını getir
export const getQuestionsByPatient = async (patientId: string): Promise<Question[]> => {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);
    const questions: Question[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        answeredAt: data.answeredAt?.toDate ? data.answeredAt.toDate() : data.answeredAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Question;
    });

    // Client-side sorting (en yeni önce)
    questions.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime();
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime();
      return dateB - dateA;
    });

    return questions;
  } catch (error: any) {
    console.error('❌ Sorular yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Diyetisyenin sorularını getir
export const getQuestionsByDietitian = async (dietitianId: string): Promise<Question[]> => {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );

    const querySnapshot = await getDocs(q);
    const questions: Question[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        answeredAt: data.answeredAt?.toDate ? data.answeredAt.toDate() : data.answeredAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Question;
    });

    // Client-side sorting (cevapsızlar önce, sonra en yeni)
    questions.sort((a, b) => {
      if (a.isAnswered !== b.isAnswered) {
        return a.isAnswered ? 1 : -1;
      }
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime();
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime();
      return dateB - dateA;
    });

    return questions;
  } catch (error: any) {
    console.error('❌ Sorular yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Soruyu cevapla (Diyetisyen)
export const answerQuestion = async (questionId: string, answer: string): Promise<void> => {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, questionId);

    // Önce soru bilgilerini al
    const questionDoc = await getDoc(questionRef);
    if (!questionDoc.exists()) {
      throw new Error('Soru bulunamadı');
    }

    const questionData = questionDoc.data() as Question;

    // Cevabı kaydet
    await updateDoc(questionRef, {
      answer: answer,
      isAnswered: true,
      answeredAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Soru cevaplandı');

    // Danışana bildirim gönder
    try {
      // Danışan profilini bul (patients koleksiyonunda)
      const patientsQuery = query(
        collection(db, 'patients'),
        where('__name__', '==', questionData.patientId)
      );
      const patientsSnapshot = await getDocs(patientsQuery);

      if (!patientsSnapshot.empty) {
        const patientData = patientsSnapshot.docs[0].data();
        const pushToken = patientData?.pushToken;

        if (pushToken) {
          await sendPushNotification(
            pushToken,
            `✅ Sorunuz Cevaplandı!`,
            answer.length > 100 ? answer.substring(0, 100) + '...' : answer,
            {
              type: 'question_answered',
              questionId: questionId,
              question: questionData.question,
              answer: answer,
            }
          );
          console.log('✅ Danışana bildirim gönderildi');
        } else {
          console.log('⚠️ Danışanın push token\'ı bulunamadı');
        }
      }
    } catch (notifError) {
      console.error('⚠️ Bildirim gönderme hatası (görmezden gelindi):', notifError);
      // Bildirim hatası ana işlemi etkilemesin
    }
  } catch (error: any) {
    console.error('❌ Cevap kaydetme hatası:', error);
    throw new Error(error.message);
  }
};

// Soru sil
export const deleteQuestion = async (questionId: string): Promise<void> => {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(questionRef);
    console.log('✅ Soru silindi');
  } catch (error: any) {
    console.error('❌ Soru silme hatası:', error);
    throw new Error(error.message);
  }
};

// Soru detayını getir
export const getQuestionById = async (questionId: string): Promise<Question | null> => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      answeredAt: data.answeredAt?.toDate ? data.answeredAt.toDate() : data.answeredAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Question;
  } catch (error: any) {
    console.error('❌ Soru getirme hatası:', error);
    throw new Error(error.message);
  }
};