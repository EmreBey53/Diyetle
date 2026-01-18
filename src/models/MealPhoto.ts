export interface MealPhoto {
  id: string;
  patientId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealName: string;
  photoUrl: string;
  storagePath: string;
  detectedLabels: string[]; // Google Vision API sonuçları
  confidence: number; // 0-100 food confidence
  isVerified: boolean; // User confirmed it's food
  calories?: number; // Optional: user entered calories
  notes?: string; // Patient's message/question
  dietitianResponse?: string; // Dietitian's response to patient's message
  respondedAt?: number; // Timestamp when dietitian responded
  uploadedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface VisionResponse {
  isFood: boolean;
  confidence: number;
  labels: string[];
  foodItems: string[];
}

export interface FoodDetectionResult {
  success: boolean;
  message: string;
  data?: VisionResponse;
  error?: string;
}