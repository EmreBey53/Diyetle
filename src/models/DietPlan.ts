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
  expiryDate: Date | string;
  expiryDay?: number;
  expiryTime?: string;
  dailyCalorieTarget?: number;
  dailyWaterGoal?: number;
  meals: Meal[];
  notes?: string;
  status: DietStatus;
  isActive?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiredAt?: Date | string;
}

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

export const calculateTotalCalories = (meals: Meal[]): number => {
  return meals.reduce((total, meal) => total + meal.totalCalories, 0);
};

export const calculateExpiryDate = (startDate: Date | string, dayOfWeek: number = 0, time: string = '18:00'): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let date = new Date(today);

  if (date.getDay() === dayOfWeek) {
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, move to next week
    const now = new Date();
    if (date < now) {
      date.setDate(date.getDate() + 7);
    }
  } else {
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

export const getDaysUntilExpiry = (expiryDate: Date | string): number => {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const isExpired = (expiryDate: Date | string): boolean => {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  return new Date() > expiry;
};

export const getDietStatus = (diet: DietPlan): DietStatus => {
  if (diet.status) return diet.status;
  if (isExpired(diet.expiryDate)) return 'expired';
  return 'active';
};

export const getDayName = (dayOfWeek: number): string => {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[dayOfWeek];
};

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

export const getStatusColor = (status: DietStatus): string => {
  const colors = {
    active: '#4CAF50',
    expired: '#FF6B6B',
    archived: '#999999',
  };
  return colors[status];
};

export const getStatusEmoji = (status: DietStatus): string => {
  const emojis = {
    active: '✅',
    expired: '⏰',
    archived: '📦',
  };
  return emojis[status];
};