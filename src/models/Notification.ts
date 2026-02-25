export interface Notification {
  id: string;
  userId: string; // Bildirimi alacak kullanıcı
  type: 'meal_photo' | 'photo_response' | 'diet_expiring' | 'diet_expired' | 'new_patient' | 'new_question' | 'question_response' | 'water_reminder' | 'new_diet' | 'diet_assigned';
  title: string;
  body: string;
  data?: {
    patientId?: string;
    patientName?: string;
    mealType?: string;
    mealName?: string;
    message?: string;
    dietTitle?: string;
    daysUntilExpiry?: number;
    dietitianName?: string;
    response?: string;
    questionId?: string;
    waterGoal?: number;
    currentWater?: number;
    dietPlanId?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: number;
  updatedAt: number;
}
