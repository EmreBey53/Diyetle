// src/models/WaterIntake.ts
export interface WaterIntake {
  id?: string;
  patientId: string;
  date: string; // YYYY-MM-DD format
  amount: number; // Litre cinsinden
  goal: number; // Günlük hedef (litre)
  entries: WaterEntry[]; // Gün içindeki su tüketim girdileri
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WaterEntry {
  time: Date | string;
  amount: number; // Litre cinsinden (genelde 0.2L = 1 bardak)
}

// Bugünün tarihini YYYY-MM-DD formatında döndür
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Su tüketim yüzdesini hesapla
export const getWaterPercentage = (amount: number, goal: number): number => {
  if (goal === 0) return 0;
  return Math.min(Math.round((amount / goal) * 100), 100);
};

// Su tüketim durumunu döndür
export const getWaterStatus = (amount: number, goal: number): string => {
  const percentage = getWaterPercentage(amount, goal);
  if (percentage >= 100) return 'Hedef tamamlandı! 🎉';
  if (percentage >= 75) return 'Neredeyse tamamlandı! 💧';
  if (percentage >= 50) return 'Yarı yoldasınız 💪';
  if (percentage >= 25) return 'İyi başlangıç 👍';
  return 'Devam edin! 💧';
};
