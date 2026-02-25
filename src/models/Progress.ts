export interface Progress {
  id?: string;
  patientId: string;
  patientName: string;
  weight: number; // kg
  height: number; // cm
  bmi: number;
  notes?: string;
  recordDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const calculateBMI = (weight: number, height: number): number => {
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Zayıf';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Fazla Kilolu';
  return 'Obez';
};

export const getBMICategoryColor = (bmi: number): string => {
  if (bmi < 18.5) return '#2196F3'; // Mavi
  if (bmi < 25) return '#4CAF50'; // Yeşil
  if (bmi < 30) return '#FF9800'; // Turuncu
  return '#F44336'; // Kırmızı
};