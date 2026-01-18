// src/models/DietPlan.ts
export interface Food {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  portion?: string;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  foods: Food[];
  totalCalories: number;
  time?: string;
}

export type DietStatus = 'active' | 'expired' | 'archived';

export interface DietPlan {
  id?: string;
  patientId: string;
  patientName: string;
  dietitianId: string;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string;
  expiryDate: Date | string; // YENI: Pazar günü 18:00 - Otomatik hesaplanır
  expiryDay?: number; // YENI: 0-6 (0=Pazar) - Diyetisyen değiştirebilir
  expiryTime?: string; // YENI: "18:00" - Diyetisyen değiştirebilir
  dailyCalorieTarget?: number;
  dailyWaterGoal?: number; // Günlük su hedefi (litre)
  meals: Meal[];
  notes?: string;
  status: DietStatus; // YENI: 'active' | 'expired' | 'archived'
  isActive?: boolean; // DEPRECATED: status kullan
  createdAt: Date | string;
  updatedAt: Date | string;
  expiredAt?: Date | string; // YENI: Expire olduğu tarih
}

// Öğün tipleri için yardımcı fonksiyonlar
export const getMealTypeName = (type: Meal['type']): string => {
  const names = {
    breakfast: 'Kahvaltı',
    lunch: 'Öğle Yemeği',
    dinner: 'Akşam Yemeği',
    snack: 'Ara Öğün',
  };
  return names[type];
};

export const getMealTypeEmoji = (type: Meal['type']): string => {
  const emojis = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
  };
  return emojis[type];
};

// Toplam kalori hesaplama
export const calculateTotalCalories = (meals: Meal[]): number => {
  return meals.reduce((total, meal) => total + meal.totalCalories, 0);
};

/**
 * Bugünden başlayarak istenen haftanın günü saat belirtilen saatte hesapla
 * dayOfWeek: 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
 * time: "18:00" formatında
 */
export const calculateExpiryDate = (startDate: Date | string, dayOfWeek: number = 0, time: string = '18:00'): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Bugün saat 00:00
  
  let date = new Date(today);

  // Eğer bugün istenen gün ise bugünü kullan, değilse sonraki haftanın o günü bulunuz
  if (date.getDay() === dayOfWeek) {
    // Bugün istenen gün
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    
    // Eğer zaman geçmişse (bugün saat 18:00'den sonra), sonraki haftaya git
    const now = new Date();
    if (date < now) {
      date.setDate(date.getDate() + 7);
    }
  } else {
    // Sonraki istenen günü bul
    let daysAhead = dayOfWeek - date.getDay();
    if (daysAhead <= 0) {
      daysAhead += 7;
    }
    date.setDate(date.getDate() + daysAhead);
    
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }

  return date;
};

/**
 * Kalan gün sayısını hesapla
 */
export const getDaysUntilExpiry = (expiryDate: Date | string): number => {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Diyet expire oldu mu kontrol et
 */
export const isExpired = (expiryDate: Date | string): boolean => {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  return new Date() > expiry;
};

/**
 * Diyetin statüsünü belirle
 */
export const getDietStatus = (diet: DietPlan): DietStatus => {
  if (diet.status) return diet.status;
  if (isExpired(diet.expiryDate)) return 'expired';
  return 'active';
};

/**
 * Gün adını döndür (Pazar, Pazartesi, vs.)
 */
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[dayOfWeek];
};

/**
 * Expire tarihini güzel format'ta göster
 */
export const formatExpiryInfo = (expiryDate: Date | string): string => {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const daysLeft = getDaysUntilExpiry(expiry);
  const dayName = getDayName(expiry.getDay());

  if (daysLeft < 0) {
    return `⏰ Süresi doldu`;
  } else if (daysLeft === 0) {
    return `⏰ Bugün sona eriyor (${expiry.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})`;
  } else if (daysLeft === 1) {
    return `⏰ Yarın sona eriyor (${dayName})`;
  } else {
    return `⏰ ${daysLeft} gün kaldı (${dayName})`;
  }
};

/**
 * Status'a göre renk döndür
 */
export const getStatusColor = (status: DietStatus): string => {
  const colors = {
    active: '#4CAF50',
    expired: '#FF6B6B',
    archived: '#999999',
  };
  return colors[status];
};

/**
 * Status'a göre emoji döndür
 */
export const getStatusEmoji = (status: DietStatus): string => {
  const emojis = {
    active: '✅',
    expired: '⏰',
    archived: '📦',
  };
  return emojis[status];
};