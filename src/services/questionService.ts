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
        } else {
        }
      }
    } catch (notifError) {
    }

    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

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

    questions.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime();
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime();
      return dateB - dateA;
    });

    return questions;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

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
    throw new Error(error.message);
  }
};

export const answerQuestion = async (questionId: string, answer: string): Promise<void> => {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const questionDoc = await getDoc(questionRef);
    if (!questionDoc.exists()) {
      throw new Error('Soru bulunamadı');
    }

    const questionData = questionDoc.data() as Question;

    await updateDoc(questionRef, {
      answer: answer,
      isAnswered: true,
      answeredAt: new Date(),
      updatedAt: new Date(),
    });

    try {
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
        } else {
        }
      }
    } catch (notifError) {
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deleteQuestion = async (questionId: string): Promise<void> => {
  try {
    const questionRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(questionRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

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
    throw new Error(error.message);
  }
};