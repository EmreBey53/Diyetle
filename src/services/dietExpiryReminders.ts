// src/services/dietExpiryReminders.ts
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { DietPlan, isExpired } from '../models/DietPlan';
import {
  notifyDietitianAboutExpiringDiet,
  notifyPatientAboutExpiringDiet,
  notifyDietitianDietExpired,
  notifyPatientDietExpired,
} from './notificationService';

/**
 * Aktif diyetleri kontrol et ve süresi dolmuş olanları expire et
 * (Manually çağrılabilir veya app açıldığında)
 */
export const checkAndExpireDiets = async () => {
  try {
    console.log('🔄 Diyet expiry kontrol ediliyor...');

    // Aktif diyetleri getir
    const snapshot = await getDocs(
      query(collection(db, 'dietPlans'), where('status', '==', 'active'))
    );

    if (snapshot.empty) {
      console.log('ℹ️ Aktif diyet planı yok');
      return;
    }

    const batch = writeBatch(db);
    const now = new Date();
    let expiredCount = 0;

    snapshot.forEach((docSnap) => {
      const diet = docSnap.data() as DietPlan;
      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      // Süresi dolmuş mı kontrol et
      if (now >= expiryDate && diet.status === 'active') {
        batch.update(docSnap.ref, {
          status: 'expired',
          expiredAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        });
        expiredCount++;
        console.log(`⏰ Expired: ${diet.title}`);
      }
    });

    if (expiredCount > 0) {
      await batch.commit();
      console.log(`✅ ${expiredCount} diyet expire edildi`);
    }

    return expiredCount;
  } catch (error) {
    console.error('❌ Diyet expiry kontrol hatası:', error);
    throw error;
  }
};

/**
 * Danışanın diyetlerinde süresi yaklaşan olanları bul
 * (2 gün kaldı olanları döndür)
 */
export const getExpiringDiets = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'dietPlans'),
        where('patientId', '==', patientId),
        where('status', '==', 'active')
      )
    );

    const now = new Date();
    const expiringDiets: DietPlan[] = [];

    snapshot.forEach((docSnap) => {
      const diet = {
        ...docSnap.data(),
        id: docSnap.id,
      } as DietPlan;

      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 2 gün veya daha az kaldı mı?
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 2) {
        expiringDiets.push(diet);
      }
    });

    return expiringDiets;
  } catch (error) {
    console.error('❌ Süresi yaklaşan diyetleri getirme hatası:', error);
    throw error;
  }
};

/**
 * Diyetisyenin danışanlarından süresi yaklaşan diyetleri bul
 */
export const getDietitianExpiringDiets = async (
  dietitianId: string
): Promise<
  Array<{
    patientId: string;
    patientName: string;
    diet: DietPlan;
    daysUntilExpiry: number;
  }>
> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'dietPlans'),
        where('dietitianId', '==', dietitianId),
        where('status', '==', 'active')
      )
    );

    const now = new Date();
    const expiringDiets: Array<{
      patientId: string;
      patientName: string;
      diet: DietPlan;
      daysUntilExpiry: number;
    }> = [];

    snapshot.forEach((docSnap) => {
      const diet = {
        ...docSnap.data(),
        id: docSnap.id,
      } as DietPlan;

      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 2 gün veya daha az kaldı mı?
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 2) {
        expiringDiets.push({
          patientId: diet.patientId,
          patientName: diet.patientName,
          diet,
          daysUntilExpiry,
        });
      }
    });

    return expiringDiets;
  } catch (error) {
    console.error('❌ Diyetisyen süresi yaklaşan diyetleri getirme hatası:', error);
    throw error;
  }
};

/**
 * Süresi yaklaşan diyetler hakkında bildirimleri gönder
 * (Diyetisyen & Hasta)
 */
export const sendExpiryReminders = async (patientId: string, pushToken: string) => {
  try {
    const expiringDiets = await getExpiringDiets(patientId);

    if (expiringDiets.length === 0) {
      console.log('ℹ️ Süresi yaklaşan diyet yok');
      return;
    }

    // Her diyet için bildirim gönder
    for (const diet of expiringDiets) {
      const expiryDate = diet.expiryDate instanceof Date 
        ? diet.expiryDate 
        : new Date(diet.expiryDate);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (pushToken) {
        await notifyPatientAboutExpiringDiet(pushToken, diet.title, daysUntilExpiry);
      }
    }

    console.log(`✅ ${expiringDiets.length} diyet hakkında bildirim gönderildi`);
  } catch (error) {
    console.error('❌ Reminder gönderme hatası:', error);
  }
};

/**
 * Diyetisyene süresi yaklaşan danışanları hatırlat
 */
export const notifyDietitianOfExpiringDiets = async (
  dietitianId: string,
  dietitianToken: string
) => {
  try {
    const expiringDiets = await getDietitianExpiringDiets(dietitianId);

    if (expiringDiets.length === 0) {
      console.log('ℹ️ Süresi yaklaşan diyet yok');
      return;
    }

    // Her diyet için bildirim gönder
    for (const item of expiringDiets) {
      await notifyDietitianAboutExpiringDiet(
        dietitianToken,
        item.patientName,
        item.diet.title,
        item.daysUntilExpiry
      );
    }

    console.log(`✅ Diyetisyene ${expiringDiets.length} diyet hakkında bildirim gönderildi`);
  } catch (error) {
    console.error('❌ Diyetisyen notification hatası:', error);
  }
};

/**
 * App başladığında çalıştırılabilecek kontrol
 * (Süresi dolmuş diyetleri expire et)
 */
export const initializeDietExpiryCheck = async () => {
  try {
    console.log('🔄 Diyet expiry sistem başlatılıyor...');
    await checkAndExpireDiets();
    console.log('✅ Diyet expiry kontrol tamamlandı');
  } catch (error) {
    console.error('❌ Diyet expiry initialization hatası:', error);
    // Error silently fail
  }
};