import { getPatientsByDietitian } from './patientService';
import { Patient } from '../models/Patient';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface DashboardStats {
  totalPatients: number;
  averageBMI: number;
  highBMICount: number;
  recentPatientsCount: number;
  patients: Patient[];
}

let cachedStats: { [dietitianId: string]: { data: DashboardStats; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000;

export const getDashboardStats = async (dietitianId: string): Promise<DashboardStats> => {
  try {
    const cached = cachedStats[dietitianId];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }


    const patients = await getPatientsByDietitian(dietitianId);
    const totalPatients = patients.length;
    const patientsWithBMI = patients.filter(p => p.bmi);
    const averageBMI = patientsWithBMI.length > 0
      ? patientsWithBMI.reduce((sum, p) => sum + (p.bmi || 0), 0) / patientsWithBMI.length
      : 0;
    const highBMICount = patients.filter(p => p.bmi && p.bmi > 30).length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentPatientsCount = patients.filter(p => {
      const createdDate = typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt;
      return createdDate >= oneWeekAgo;
    }).length;
    
    const stats: DashboardStats = {
      totalPatients,
      averageBMI: parseFloat(averageBMI.toFixed(1)),
      highBMICount,
      recentPatientsCount,
      patients,
    };

    cachedStats[dietitianId] = {
      data: stats,
      timestamp: Date.now()
    };

    return stats;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getPatientAdditionTrend = async (
  dietitianId: string,
  period: 'weekly' | 'monthly'
): Promise<{ labels: string[]; data: number[] }> => {
  try {
    const patients = await getPatientsByDietitian(dietitianId);

    if (period === 'weekly') {
      const labels = ['Pz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      const data = new Array(7).fill(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      patients.forEach((patient) => {
        const createdDate = typeof patient.createdAt === 'string'
          ? new Date(patient.createdAt)
          : patient.createdAt;
        const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff < 7) {
          const dayIndex = 6 - daysDiff;
          data[dayIndex]++;
        }
      });

      return { labels, data };
    } else {
      const labels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      const data = new Array(12).fill(0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      patients.forEach((patient) => {
        const createdDate = typeof patient.createdAt === 'string'
          ? new Date(patient.createdAt)
          : patient.createdAt;
        const patientMonth = createdDate.getMonth();
        const patientYear = createdDate.getFullYear();

        const monthsDiff = (currentYear - patientYear) * 12 + (currentMonth - patientMonth);

        if (monthsDiff >= 0 && monthsDiff < 12) {
          data[patientMonth]++;
        }
      });

      return { labels, data };
    }
  } catch (error: any) {
    return { labels: [], data: [] };
  }
};

export const getBMITrend = async (
  dietitianId: string,
  period: 'weekly' | 'monthly'
): Promise<{ labels: string[]; data: number[] }> => {
  try {
    // Fetch all progress records for this dietitian's patients (without orderBy to avoid index requirement)
    const progressQuery = query(
      collection(db, 'progress'),
      where('dietitianId', '==', dietitianId)
    );
    const progressSnapshot = await getDocs(progressQuery);

    if (period === 'weekly') {
      const labels = ['Pz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      const bmiSums = new Array(7).fill(0);
      const bmiCounts = new Array(7).fill(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      progressSnapshot.forEach((doc) => {
        const progressData = doc.data();
        const progressDate = progressData.date?.toDate ? progressData.date.toDate() : new Date(progressData.date);
        const daysDiff = Math.floor((today.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff < 7 && progressData.bmi) {
          const dayIndex = 6 - daysDiff;
          bmiSums[dayIndex] += progressData.bmi;
          bmiCounts[dayIndex]++;
        }
      });

      const data = bmiSums.map((sum, index) =>
        bmiCounts[index] > 0 ? parseFloat((sum / bmiCounts[index]).toFixed(1)) : 0
      );

      return { labels, data };
    } else {
      const labels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      const bmiSums = new Array(12).fill(0);
      const bmiCounts = new Array(12).fill(0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      progressSnapshot.forEach((doc) => {
        const progressData = doc.data();
        const progressDate = progressData.date?.toDate ? progressData.date.toDate() : new Date(progressData.date);
        const progressMonth = progressDate.getMonth();
        const progressYear = progressDate.getFullYear();

        const monthsDiff = (currentYear - progressYear) * 12 + (currentMonth - progressMonth);

        if (monthsDiff >= 0 && monthsDiff < 12 && progressData.bmi) {
          bmiSums[progressMonth] += progressData.bmi;
          bmiCounts[progressMonth]++;
        }
      });

      const data = bmiSums.map((sum, index) =>
        bmiCounts[index] > 0 ? parseFloat((sum / bmiCounts[index]).toFixed(1)) : 0
      );

      return { labels, data };
    }
  } catch (error: any) {
    return { labels: [], data: [] };
  }
};