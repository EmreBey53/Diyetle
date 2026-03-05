import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: 'diet' | 'water' | 'exercise' | 'mood' | 'streak' | 'milestone' | 'photo';
  condition: (s: UserStats) => boolean;
  getProgress?: (s: UserStats) => { value: number; text: string };
}

export interface UserStats {
  dietPlanCount: number;
  exerciseLogCount: number;
  moodEntryCount: number;
  consecutiveMoodDays: number;
  totalExerciseMinutes: number;
  waterLogCount: number;
  mealPhotoCount: number;
  appointmentCount: number;
}

export const ALL_BADGES: BadgeDef[] = [
  // ── Diyet rozetleri ──────────────────────────────────────────────────────
  {
    id: 'first_diet',
    emoji: '🥗',
    title: 'İlk Adım',
    description: 'İlk diyet planına sahip oldun!',
    category: 'diet',
    condition: (s) => s.dietPlanCount >= 1,
    getProgress: (s) => ({ value: Math.min(s.dietPlanCount, 1) * 100, text: `${s.dietPlanCount}/1 diyet planı` }),
  },
  {
    id: 'diet_veteran',
    emoji: '🏆',
    title: 'Diyet Ustası',
    description: '3 farklı diyet planı tamamladın!',
    category: 'diet',
    condition: (s) => s.dietPlanCount >= 3,
    getProgress: (s) => ({ value: Math.min(s.dietPlanCount / 3 * 100, 100), text: `${s.dietPlanCount}/3 diyet planı` }),
  },

  // ── Su takibi rozetleri ──────────────────────────────────────────────────
  {
    id: 'first_water',
    emoji: '💧',
    title: 'Su Takipçisi',
    description: 'İlk su takibini yaptın!',
    category: 'water',
    condition: (s) => s.waterLogCount >= 1,
    getProgress: (s) => ({ value: Math.min(s.waterLogCount, 1) * 100, text: `${s.waterLogCount}/1 gün` }),
  },
  {
    id: 'water_7',
    emoji: '🌊',
    title: 'Hidrasyon Uzmanı',
    description: '7 gün su takibi yaptın!',
    category: 'water',
    condition: (s) => s.waterLogCount >= 7,
    getProgress: (s) => ({ value: Math.min(s.waterLogCount / 7 * 100, 100), text: `${s.waterLogCount}/7 gün` }),
  },
  {
    id: 'water_30',
    emoji: '🏞️',
    title: 'Su Büyücüsü',
    description: '30 gün su takibi yaptın!',
    category: 'water',
    condition: (s) => s.waterLogCount >= 30,
    getProgress: (s) => ({ value: Math.min(s.waterLogCount / 30 * 100, 100), text: `${s.waterLogCount}/30 gün` }),
  },

  // ── Egzersiz rozetleri ───────────────────────────────────────────────────
  {
    id: 'first_exercise',
    emoji: '🏃',
    title: 'Hareket Başlıyor',
    description: 'İlk egzersiz kaydını yaptın!',
    category: 'exercise',
    condition: (s) => s.exerciseLogCount >= 1,
    getProgress: (s) => ({ value: Math.min(s.exerciseLogCount, 1) * 100, text: `${s.exerciseLogCount}/1 egzersiz` }),
  },
  {
    id: 'exercise_10',
    emoji: '💪',
    title: 'Aktif Yaşam',
    description: '10 egzersiz kaydı yaptın!',
    category: 'exercise',
    condition: (s) => s.exerciseLogCount >= 10,
    getProgress: (s) => ({ value: Math.min(s.exerciseLogCount / 10 * 100, 100), text: `${s.exerciseLogCount}/10 egzersiz` }),
  },
  {
    id: 'exercise_30',
    emoji: '🔥',
    title: 'Spor Tutkunu',
    description: '30 egzersiz kaydı yaptın!',
    category: 'exercise',
    condition: (s) => s.exerciseLogCount >= 30,
    getProgress: (s) => ({ value: Math.min(s.exerciseLogCount / 30 * 100, 100), text: `${s.exerciseLogCount}/30 egzersiz` }),
  },
  {
    id: 'exercise_minutes_100',
    emoji: '⚡',
    title: '100 Dakika',
    description: 'Toplam 100 dakika egzersiz yaptın!',
    category: 'exercise',
    condition: (s) => s.totalExerciseMinutes >= 100,
    getProgress: (s) => ({ value: Math.min(s.totalExerciseMinutes / 100 * 100, 100), text: `${s.totalExerciseMinutes}/100 dk` }),
  },
  {
    id: 'exercise_minutes_500',
    emoji: '🌟',
    title: '500 Dakika',
    description: 'Toplam 500 dakika egzersiz yaptın!',
    category: 'exercise',
    condition: (s) => s.totalExerciseMinutes >= 500,
    getProgress: (s) => ({ value: Math.min(s.totalExerciseMinutes / 500 * 100, 100), text: `${s.totalExerciseMinutes}/500 dk` }),
  },
  {
    id: 'exercise_minutes_1000',
    emoji: '🏅',
    title: '1000 Dakika',
    description: 'Toplam 1000 dakika egzersiz yaptın!',
    category: 'exercise',
    condition: (s) => s.totalExerciseMinutes >= 1000,
    getProgress: (s) => ({ value: Math.min(s.totalExerciseMinutes / 1000 * 100, 100), text: `${s.totalExerciseMinutes}/1000 dk` }),
  },

  // ── Ruh hali rozetleri ───────────────────────────────────────────────────
  {
    id: 'first_mood',
    emoji: '😊',
    title: 'Kendini Tanı',
    description: 'İlk ruh hali kaydını yaptın!',
    category: 'mood',
    condition: (s) => s.moodEntryCount >= 1,
    getProgress: (s) => ({ value: Math.min(s.moodEntryCount, 1) * 100, text: `${s.moodEntryCount}/1 gün` }),
  },
  {
    id: 'mood_7',
    emoji: '💖',
    title: '7 Günlük Farkındalık',
    description: '7 gün ruh halini kaydettirdin!',
    category: 'mood',
    condition: (s) => s.moodEntryCount >= 7,
    getProgress: (s) => ({ value: Math.min(s.moodEntryCount / 7 * 100, 100), text: `${s.moodEntryCount}/7 gün` }),
  },
  {
    id: 'mood_streak_7',
    emoji: '🎯',
    title: 'Tutarlı Takip',
    description: '7 gün arka arkaya ruh hali kaydı!',
    category: 'streak',
    condition: (s) => s.consecutiveMoodDays >= 7,
    getProgress: (s) => ({ value: Math.min(s.consecutiveMoodDays / 7 * 100, 100), text: `${s.consecutiveMoodDays}/7 gün serisi` }),
  },
  {
    id: 'mood_30',
    emoji: '🧘',
    title: 'Zihin Ustası',
    description: '30 gün ruh halini kaydettirdin!',
    category: 'mood',
    condition: (s) => s.moodEntryCount >= 30,
    getProgress: (s) => ({ value: Math.min(s.moodEntryCount / 30 * 100, 100), text: `${s.moodEntryCount}/30 gün` }),
  },
  {
    id: 'mood_streak_30',
    emoji: '🌙',
    title: 'Farkındalık Ustası',
    description: '30 gün arka arkaya ruh hali kaydı!',
    category: 'streak',
    condition: (s) => s.consecutiveMoodDays >= 30,
    getProgress: (s) => ({ value: Math.min(s.consecutiveMoodDays / 30 * 100, 100), text: `${s.consecutiveMoodDays}/30 gün serisi` }),
  },

  // ── Öğün fotoğrafı rozetleri ─────────────────────────────────────────────
  {
    id: 'first_photo',
    emoji: '📸',
    title: 'Fotoğrafçı',
    description: 'İlk öğün fotoğrafını gönderdin!',
    category: 'photo',
    condition: (s) => s.mealPhotoCount >= 1,
    getProgress: (s) => ({ value: Math.min(s.mealPhotoCount, 1) * 100, text: `${s.mealPhotoCount}/1 fotoğraf` }),
  },
  {
    id: 'photo_10',
    emoji: '🎞️',
    title: 'Yemek Bloggeri',
    description: '10 öğün fotoğrafı gönderdin!',
    category: 'photo',
    condition: (s) => s.mealPhotoCount >= 10,
    getProgress: (s) => ({ value: Math.min(s.mealPhotoCount / 10 * 100, 100), text: `${s.mealPhotoCount}/10 fotoğraf` }),
  },

  // ── Randevu / Kilometre taşı rozetleri ──────────────────────────────────
  {
    id: 'first_appointment',
    emoji: '🗓️',
    title: 'İlk Randevu',
    description: 'İlk randevunu tamamladın!',
    category: 'milestone',
    condition: (s) => s.appointmentCount >= 1,
    getProgress: (s) => ({ value: Math.min(s.appointmentCount, 1) * 100, text: `${s.appointmentCount}/1 randevu` }),
  },
  {
    id: 'appointments_3',
    emoji: '🤝',
    title: 'Düzenli Danışan',
    description: '3 randevu tamamladın!',
    category: 'milestone',
    condition: (s) => s.appointmentCount >= 3,
    getProgress: (s) => ({ value: Math.min(s.appointmentCount / 3 * 100, 100), text: `${s.appointmentCount}/3 randevu` }),
  },
  {
    id: 'all_features',
    emoji: '🌈',
    title: 'Tam Paket',
    description: 'Egzersiz, ruh hali ve diyet takibini kullandın!',
    category: 'milestone',
    condition: (s) => s.exerciseLogCount >= 1 && s.moodEntryCount >= 1 && s.dietPlanCount >= 1,
    getProgress: (s) => {
      const done = [s.exerciseLogCount >= 1, s.moodEntryCount >= 1, s.dietPlanCount >= 1].filter(Boolean).length;
      return { value: done / 3 * 100, text: `${done}/3 özellik` };
    },
  },
];

export const CATEGORY_LABELS: Record<BadgeDef['category'], string> = {
  diet: '🥗 Diyet Görevleri',
  water: '💧 Su Tüketimi Görevleri',
  exercise: '🏃 Egzersiz Görevleri',
  mood: '😊 Ruh Hali Görevleri',
  streak: '🔥 Seri Görevleri',
  milestone: '🌟 Kilometre Taşları',
  photo: '📸 Öğün Fotoğrafı Görevleri',
};

export const fetchUserStats = async (userId: string): Promise<UserStats> => {
  const [exerciseLogs, moodEntries, dietPlans, mealPhotos, appointments, waterLogs] = await Promise.all([
    getDocs(query(collection(db, 'exercise_logs'), where('userId', '==', userId))),
    getDocs(query(collection(db, 'mood_entries'), where('userId', '==', userId))),
    getDocs(query(collection(db, 'dietPlans'), where('patientId', '==', userId))).catch(() => null),
    getDocs(query(collection(db, 'mealPhotos'), where('patientId', '==', userId))).catch(() => null),
    getDocs(query(collection(db, 'appointments'), where('patientId', '==', userId))).catch(() => null),
    getDocs(query(collection(db, 'water_intake'), where('userId', '==', userId))).catch(() => null),
  ]);

  const exLogs = exerciseLogs.docs.map((d) => d.data());
  const totalMinutes = exLogs.reduce((s, l) => s + (l.duration || 0), 0);

  const completedAppointments = appointments
    ? appointments.docs.filter((d) => d.data().status === 'completed').length
    : 0;

  // Arka arkaya ruh hali günleri
  const moodDates = moodEntries.docs
    .map((d) => d.data().date as string)
    .sort((a, b) => b.localeCompare(a));

  let consecutive = 0;
  if (moodDates.length > 0) {
    const today = new Date();
    let checkDate = new Date(today);
    for (const dateStr of moodDates) {
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round((checkDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 1) {
        consecutive++;
        checkDate = d;
      } else {
        break;
      }
    }
  }

  // Su takibi: benzersiz günleri say
  const waterDaySet = new Set<string>();
  if (waterLogs) {
    waterLogs.docs.forEach((d) => {
      const data = d.data();
      if (data.date) waterDaySet.add(data.date);
    });
  }

  return {
    dietPlanCount: dietPlans?.docs.length ?? 0,
    exerciseLogCount: exerciseLogs.docs.length,
    moodEntryCount: moodEntries.docs.length,
    consecutiveMoodDays: consecutive,
    totalExerciseMinutes: totalMinutes,
    waterLogCount: waterDaySet.size,
    mealPhotoCount: mealPhotos?.docs.length ?? 0,
    appointmentCount: completedAppointments,
  };
};

export const checkAndAwardBadges = async (userId: string): Promise<BadgeDef[]> => {
  try {
    const [stats, earnedDocs] = await Promise.all([
      fetchUserStats(userId),
      getDocs(query(collection(db, 'achievements'), where('userId', '==', userId))),
    ]);

    const earned = new Set(earnedDocs.docs.map((d) => d.data().badgeId as string));
    const toAward = ALL_BADGES.filter((b) => !earned.has(b.id) && b.condition(stats));

    for (const badge of toAward) {
      try {
        await addDoc(collection(db, 'achievements'), {
          userId,
          badgeId: badge.id,
          earnedAt: Timestamp.now(),
        });
      } catch { /* devam */ }
    }

    return toAward;
  } catch {
    return [];
  }
};
