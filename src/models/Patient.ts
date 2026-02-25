export interface Patient {
  id?: string; // Firestore document ID
  userId: string; // Auth user ID (danışanın kendi user ID'si)
  dietitianId: string; // Hangi diyetisyene bağlı
  name: string;
  email: string;
  phone?: string;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  targetWeight?: number; // Target weight kg
  bmi?: number;
  gender?: 'male' | 'female';
  photoURL?: string;
  pushToken?: string; // Push notification token
  goals?: string[]; // Hedefler
  dietaryRestrictions?: string[]; // Diyet kısıtlamaları
  healthConditions?: string[]; // Sağlık durumları
  foodAllergies?: string[]; // Gıda alerjileri
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'; // Aktivite seviyesi
  notes?: string; // Notlar
  status?: 'active' | 'inactive'; // Hasta durumu
  dailyWaterGoal?: number; // Günlük su tüketim hedefi (litre) - Diyetisyen tarafından belirlenir
  createdAt: Date;
  updatedAt: Date;
}

// BMI hesaplama
export const calculateBMI = (weight: number, height: number): number => {
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

// BMI durumu
export const getBMIStatus = (bmi: number): string => {
  if (bmi < 18.5) return 'Zayıf';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Fazla Kilolu';
  return 'Obez';
};

// BMI rengi
export const getBMIColor = (bmi: number): string => {
  if (bmi < 18.5) return '#FFA500'; // Turuncu
  if (bmi < 25) return '#4CAF50'; // Yeşil
  if (bmi < 30) return '#FF9800'; // Koyu turuncu
  return '#F44336'; // Kırmızı
};