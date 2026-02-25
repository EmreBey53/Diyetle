export interface Questionnaire {
  id?: string;
  userId: string;
  patientId?: string;
  dietitianId: string;
  height: number;
  weight: number;
  targetWeight?: number;
  goals: string[];
  dietaryRestrictions: string[];
  healthConditions: string[];
  foodAllergies: string[];
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
  notes?: string;
  completedAt: Date;
  updatedAt: Date;
}

// Option types for UI
export interface QuestionnaireOption {
  id: string;
  label: string;
  icon: string;
}

export const GOAL_OPTIONS: QuestionnaireOption[] = [
  { id: 'lose-weight', label: 'Kilo vermek', icon: '⚖️' },
  { id: 'gain-weight', label: 'Kilo almak', icon: '💪' },
  { id: 'healthy-lifestyle', label: 'Sağlıklı yaşam', icon: '🌿' },
  { id: 'muscle-gain', label: 'Kas geliştirme', icon: '🏋️' },
  { id: 'energy-boost', label: 'Enerji artırma', icon: '⚡' },
  { id: 'digestion', label: 'Sindirim iyileştirme', icon: '🫀' },
  { id: 'habit-change', label: 'Beslenme alışkanlığı değiştirme', icon: '🔄' },
];

export const DIETARY_RESTRICTION_OPTIONS: QuestionnaireOption[] = [
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'vegetarian', label: 'Vejetaryen', icon: '🥗' },
  { id: 'gluten-free', label: 'Gluten-free', icon: '🌾' },
  { id: 'lactose-free', label: 'Laktozu azalt', icon: '🥛' },
  { id: 'sugar-free', label: 'Şeker-free', icon: '🍬' },
  { id: 'low-fat', label: 'Düşük yağ', icon: '🧈' },
  { id: 'halal', label: 'Halal', icon: '☪️' },
  { id: 'kosher', label: 'Kosher', icon: '✡️' },
  { id: 'none', label: 'Hiçbiri', icon: '✅' },
];

export const HEALTH_CONDITION_OPTIONS: QuestionnaireOption[] = [
  { id: 'diabetes', label: 'Diyabet', icon: '💉' },
  { id: 'hypertension', label: 'Yüksek tansiyon', icon: '❤️' },
  { id: 'high-cholesterol', label: 'Yüksek kolesterol', icon: '🩸' },
  { id: 'obesity', label: 'Obezite', icon: '⚖️' },
  { id: 'heart-disease', label: 'Kalp hastalığı', icon: '💔' },
  { id: 'thyroid', label: 'Tiroid problemi', icon: '🦋' },
  { id: 'kidney', label: 'Böbrek hastalığı', icon: '🫘' },
  { id: 'liver', label: 'Karaciğer hastalığı', icon: '🫁' },
  { id: 'cancer', label: 'Kanser öyküsü', icon: '🎗️' },
  { id: 'none', label: 'Hiçbiri', icon: '✅' },
];

export const FOOD_ALLERGY_OPTIONS: QuestionnaireOption[] = [
  { id: 'hazelnut', label: 'Fındık', icon: '🌰' },
  { id: 'peanut', label: 'Fıstık', icon: '🥜' },
  { id: 'dairy', label: 'Süt ürünleri', icon: '🥛' },
  { id: 'eggs', label: 'Yumurta', icon: '🥚' },
  { id: 'fish', label: 'Balık', icon: '🐟' },
  { id: 'shellfish', label: 'Kabuklu deniz ürünleri', icon: '🦐' },
  { id: 'wheat', label: 'Buğday', icon: '🌾' },
  { id: 'soy', label: 'Soya', icon: '🫘' },
  { id: 'sesame', label: 'Susam', icon: '🫚' },
  { id: 'none', label: 'Hiçbiri', icon: '✅' },
];

export const ACTIVITY_LEVEL_OPTIONS: QuestionnaireOption[] = [
  { id: 'sedentary', label: 'Hareketsiz (Spor yapmıyor)', icon: '��️' },
  { id: 'light', label: 'Hafif (Haftada 1-2 gün egzersiz)', icon: '🚶' },
  { id: 'moderate', label: 'Orta (Haftada 3-4 gün egzersiz)', icon: '🏃' },
  { id: 'active', label: 'Aktif (Haftada 5-6 gün egzersiz)', icon: '🏋️' },
  { id: 'veryActive', label: 'Çok aktif (Günlük egzersiz)', icon: '🤸' },
];

// Aliases for backward compatibility
export const DIETARY_RESTRICTIONS = DIETARY_RESTRICTION_OPTIONS;
export const HEALTH_CONDITIONS = HEALTH_CONDITION_OPTIONS;
export const FOOD_ALLERGIES = FOOD_ALLERGY_OPTIONS;
export const ACTIVITY_LEVELS = ACTIVITY_LEVEL_OPTIONS;

// QuestionnaireResponse type (same as Questionnaire but used in screens)
export type QuestionnaireResponse = Questionnaire;