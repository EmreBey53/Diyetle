// src/services/achievementService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { sendEmergencyNotification } from './smartNotificationService';

export interface Achievement {
  id?: string;
  userId: string;
  type: 'weight_loss' | 'consistency' | 'water_intake' | 'exercise' | 'diet_compliance' | 'milestone';
  title: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt: Timestamp;
  isShared: boolean;
  category: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UserBadge {
  id?: string;
  userId: string;
  achievementId: string;
  earnedAt: Timestamp;
  isDisplayed: boolean;
}

export interface Challenge {
  id?: string;
  title: string;
  description: string;
  type: 'individual' | 'group';
  category: 'weight_loss' | 'water_intake' | 'exercise' | 'diet';
  targetValue: number;
  targetUnit: string;
  duration: number; // gün
  startDate: Timestamp;
  endDate: Timestamp;
  participants: string[];
  rewards: {
    points: number;
    badge?: string;
    title?: string;
  };
  isActive: boolean;
}

// Başarı rozetleri tanımları
const ACHIEVEMENT_DEFINITIONS = {
  FIRST_WEEK: {
    type: 'consistency',
    title: '🎯 İlk Hafta',
    description: '7 gün boyunca düzenli takip yaptınız!',
    icon: 'calendar-outline',
    points: 50,
    category: 'bronze',
  },
  WATER_MASTER: {
    type: 'water_intake',
    title: '💧 Su Ustası',
    description: '30 gün boyunca günlük su hedefini tutturdunuz!',
    icon: 'water-outline',
    points: 200,
    category: 'gold',
  },
  WEIGHT_WARRIOR: {
    type: 'weight_loss',
    title: '⚖️ Kilo Savaşçısı',
    description: '5 kg kilo verdiniz!',
    icon: 'fitness-outline',
    points: 300,
    category: 'gold',
  },
  EXERCISE_ENTHUSIAST: {
    type: 'exercise',
    title: '🏃‍♀️ Egzersiz Tutkunu',
    description: '50 egzersiz seansı tamamladınız!',
    icon: 'barbell-outline',
    points: 250,
    category: 'silver',
  },
};

// Başarı kontrolü ve rozet verme
export const checkAndAwardAchievements = async (userId: string, activityType: string, value: number) => {
  try {
    const userStats = await getUserStats(userId);
    const newAchievements = [];

    // İlk hafta kontrolü
    if (activityType === 'daily_tracking' && userStats.consecutiveDays === 7) {
      newAchievements.push(ACHIEVEMENT_DEFINITIONS.FIRST_WEEK);
    }

    // Su içme ustası kontrolü
    if (activityType === 'water_intake' && userStats.waterStreakDays >= 30) {
      newAchievements.push(ACHIEVEMENT_DEFINITIONS.WATER_MASTER);
    }

    // Kilo verme kontrolü
    if (activityType === 'weight_loss' && value >= 5) {
      newAchievements.push(ACHIEVEMENT_DEFINITIONS.WEIGHT_WARRIOR);
    }

    // Egzersiz tutkunu kontrolü
    if (activityType === 'exercise' && userStats.totalExerciseSessions >= 50) {
      newAchievements.push(ACHIEVEMENT_DEFINITIONS.EXERCISE_ENTHUSIAST);
    }

    // Yeni başarıları kaydet
    for (const achievement of newAchievements) {
      await awardAchievement(userId, achievement);
    }

    return newAchievements;
  } catch (error) {
    console.error('❌ Başarı kontrolü hatası:', error);
    return [];
  }
};

// Rozet verme
const awardAchievement = async (userId: string, achievementDef: any) => {
  try {
    // Daha önce verilmiş mi kontrol et
    const existing = await checkExistingAchievement(userId, achievementDef.type);
    if (existing) return;

    const achievement: Omit<Achievement, 'id'> = {
      userId,
      type: achievementDef.type,
      title: achievementDef.title,
      description: achievementDef.description,
      icon: achievementDef.icon,
      points: achievementDef.points,
      unlockedAt: Timestamp.now(),
      isShared: false,
      category: achievementDef.category,
    };

    const docRef = await addDoc(collection(db, 'achievements'), achievement);

    // Kullanıcıya bildirim gönder
    await sendEmergencyNotification(
      userId,
      `🎉 Tebrikler! "${achievementDef.title}" rozetini kazandınız!`,
      'high'
    );

    console.log('🏆 Yeni rozet verildi:', achievementDef.title);
    return docRef.id;
  } catch (error) {
    console.error('❌ Rozet verme hatası:', error);
  }
};

// Grup challenge oluşturma
export const createGroupChallenge = async (challenge: Omit<Challenge, 'id' | 'participants' | 'isActive'>) => {
  try {
    const newChallenge: Omit<Challenge, 'id'> = {
      ...challenge,
      participants: [],
      isActive: true,
    };

    const docRef = await addDoc(collection(db, 'challenges'), newChallenge);
    console.log('✅ Grup challenge oluşturuldu');
    return docRef.id;
  } catch (error) {
    console.error('❌ Grup challenge oluşturma hatası:', error);
    throw error;
  }
};

// Challenge'a katılma
export const joinChallenge = async (challengeId: string, userId: string) => {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    // Mevcut katılımcıları al ve yeni kullanıcıyı ekle
    const challengeDoc = await getDocs(query(collection(db, 'challenges'), where('__name__', '==', challengeId)));
    if (!challengeDoc.empty) {
      const currentParticipants = challengeDoc.docs[0].data().participants || [];
      if (!currentParticipants.includes(userId)) {
        await updateDoc(challengeRef, {
          participants: [...currentParticipants, userId]
        });
      }
    }

    console.log('✅ Challenge\'a katılım sağlandı');
  } catch (error) {
    console.error('❌ Challenge katılım hatası:', error);
    throw error;
  }
};

// Kullanıcı istatistiklerini getir (basitleştirilmiş)
const getUserStats = async (userId: string) => {
  // Bu fonksiyon gerçek implementasyonda daha karmaşık olacak
  return {
    consecutiveDays: 7,
    waterStreakDays: 30,
    totalExerciseSessions: 50,
    totalWeightLoss: 5,
  };
};

// Mevcut başarı kontrolü
const checkExistingAchievement = async (userId: string, type: string) => {
  const q = query(
    collection(db, 'achievements'),
    where('userId', '==', userId),
    where('type', '==', type)
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};