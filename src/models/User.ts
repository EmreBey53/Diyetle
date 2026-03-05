export type UserRole = 'dietitian' | 'patient' | 'admin';

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;

  // Push notification token
  pushToken?: string;

  // Profile customization
  profileEmoji?: string; // Emoji like 😊, 🌟, etc.
  profileImage?: string; // URL to uploaded image or preset avatar

  // Diyetisyene özel
  dietitianId?: string; // Eğer hasta ise, hangi diyetisyene bağlı

  // Hasta özel bilgiler (opsiyonel)
  phone?: string;
  age?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  gender?: 'male' | 'female';

  // Diyetisyen profil alanları
  isApproved?: boolean;        // Admin onayı (false = beklemede, true = onaylı)
  specialization?: string;     // Uzmanlık alanı
  bio?: string;                // Kısa biyografi
  city?: string;               // Şehir
  experience?: number;         // Deneyim yılı
  sessionFee?: number;         // Seans ücreti (TL)
  education?: string;          // Eğitim bilgisi
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