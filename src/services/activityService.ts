import { db } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export interface Activity {
  id: string;
  type: 'patient_added' | 'plan_created' | 'question_answered' | 'progress_updated';
  name: string;
  time: string;
  timestamp: Date;
}

export const getRecentActivities = async (dietitianId: string): Promise<Activity[]> => {
  try {
    const activities: Activity[] = [];
    const now = new Date();

    // Queries omit orderBy to avoid Firestore composite index requirement
    const patientsQuery = query(
      collection(db, 'patients'),
      where('dietitianId', '==', dietitianId)
    );
    const patientsSnapshot = await getDocs(patientsQuery);

    patientsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      activities.push({
        id: `patient_${doc.id}`,
        type: 'patient_added',
        name: data.name || 'Yeni Danışan',
        time: formatTimeAgo(createdAt, now),
        timestamp: createdAt,
      });
    });

    const plansQuery = query(
      collection(db, 'dietPlans'),
      where('dietitianId', '==', dietitianId)
    );
    const plansSnapshot = await getDocs(plansQuery);

    for (const planDoc of plansSnapshot.docs) {
      const planData = planDoc.data();
      const createdAt = planData.createdAt?.toDate ? planData.createdAt.toDate() : new Date(planData.createdAt);

      let patientName = 'Danışan';
      if (planData.patientId) {
        const patientQuery = query(
          collection(db, 'patients'),
          where('userId', '==', planData.patientId)
        );
        const patientSnapshot = await getDocs(patientQuery);
        if (!patientSnapshot.empty) {
          patientName = patientSnapshot.docs[0].data().name || 'Danışan';
        }
      }

      activities.push({
        id: `plan_${planDoc.id}`,
        type: 'plan_created',
        name: `${patientName} için plan oluşturuldu`,
        time: formatTimeAgo(createdAt, now),
        timestamp: createdAt,
      });
    }

    const questionsQuery = query(
      collection(db, 'questions'),
      where('dietitianId', '==', dietitianId),
      where('status', '==', 'answered')
    );
    const questionsSnapshot = await getDocs(questionsQuery);

    for (const questionDoc of questionsSnapshot.docs) {
      const questionData = questionDoc.data();
      const answeredAt = questionData.answeredAt?.toDate ? questionData.answeredAt.toDate() : new Date(questionData.answeredAt);

      let patientName = 'Danışan';
      if (questionData.patientId) {
        const patientQuery = query(
          collection(db, 'patients'),
          where('userId', '==', questionData.patientId)
        );
        const patientSnapshot = await getDocs(patientQuery);
        if (!patientSnapshot.empty) {
          patientName = patientSnapshot.docs[0].data().name || 'Danışan';
        }
      }

      activities.push({
        id: `question_${questionDoc.id}`,
        type: 'question_answered',
        name: `${patientName}'nın sorusuna cevap verildi`,
        time: formatTimeAgo(answeredAt, now),
        timestamp: answeredAt,
      });
    }

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, 10);

  } catch (error: any) {
    throw new Error(error.message || 'Aktiviteler yüklenemedi');
  }
};

function formatTimeAgo(date: Date, now: Date): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'Az önce';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} dakika önce`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} saat önce`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} gün önce`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} hafta önce`;
  }

  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}
