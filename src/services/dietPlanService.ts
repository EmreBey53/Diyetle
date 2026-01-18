// src/services/dietPlanService.ts
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { DietPlan, Meal } from '../models/DietPlan';

const DIET_PLANS_COLLECTION = 'dietPlans';

// Diyet planı oluştur
export const createDietPlan = async (planData: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const plan = {
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, DIET_PLANS_COLLECTION), plan);
    console.log('✅ Diyet planı oluşturuldu, ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('❌ Diyet planı oluşturma hatası:', error);
    throw new Error(error.message);
  }
};

// Danışanın diyet planlarını getir
export const getDietPlansByPatient = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const q = query(
      collection(db, DIET_PLANS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);

    const plans: DietPlan[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      
      // expiryDate yoksa otomatik set et (1 hafta sonra)
      let expiryDate = data.expiryDate;
      if (!expiryDate) {
        const startDate = data.startDate?.toDate?.() || new Date(data.startDate) || new Date();
        expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 7);
      }
      
      return {
        ...data,
        id: doc.id,
        expiryDate: expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as DietPlan;
    });

    // JavaScript'te sırala (en yeni en üstte)
    return plans.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error: any) {
    console.error('❌ Diyet planları yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Aktif diyet planını getir (single)
export const getActiveDietPlan = async (patientId: string): Promise<DietPlan | null> => {
  try {
    const q = query(
      collection(db, DIET_PLANS_COLLECTION),
      where('patientId', '==', patientId),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      ...data,
      id: doc.id,
      startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as DietPlan;
  } catch (error: any) {
    console.error('❌ Aktif diyet planı yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Aktif diyetleri getir (array)
export const getActiveDietPlans = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const allPlans = await getDietPlansByPatient(patientId);
    return allPlans.filter((plan) => plan.isActive === true);
  } catch (error: any) {
    console.error('❌ Aktif diyet planları yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Süresi dolmuş diyetleri getir
export const getExpiredDietPlans = async (patientId: string): Promise<DietPlan[]> => {
  try {
    const allPlans = await getDietPlansByPatient(patientId);
    return allPlans.filter((plan) => plan.isActive === false);
  } catch (error: any) {
    console.error('❌ Süresi dolmuş diyet planları yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Diyet planı güncelle
export const updateDietPlan = async (planId: string, updates: Partial<DietPlan>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    const planRef = doc(db, DIET_PLANS_COLLECTION, planId);
    await updateDoc(planRef, updateData);
    console.log('✅ Diyet planı güncellendi');
  } catch (error: any) {
    console.error('❌ Diyet planı güncelleme hatası:', error);
    throw new Error(error.message);
  }
};

// Diyet süresi değiştir - FIXED
export const updateDietExpiryDate = async (
  planId: string,
  newExpiryDay: number = 0,
  newExpiryTime: string = '18:00'
): Promise<void> => {
  try {
    console.log('🔄 [updateDietExpiryDate] Başladı - planId:', planId);
    console.log('📅 [updateDietExpiryDate] Seçilen Gün:', newExpiryDay);
    console.log('⏰ [updateDietExpiryDate] Seçilen Saat:', newExpiryTime);

    // Yeni tarihini hesapla
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let expiryDate = new Date(today);

    // Eğer bugün istenen gün ise bugünü kullan, değilse sonraki haftanın o günü bulunuz
    if (expiryDate.getDay() === newExpiryDay) {
      // Bugün istenen gün
      const [hours, minutes] = newExpiryTime.split(':').map(Number);
      expiryDate.setHours(hours, minutes, 0, 0);
      
      // Eğer zaman geçmişse, sonraki haftaya git
      const now = new Date();
      if (expiryDate < now) {
        expiryDate.setDate(expiryDate.getDate() + 7);
      }
    } else {
      // Sonraki istenen günü bul
      let daysAhead = newExpiryDay - expiryDate.getDay();
      if (daysAhead <= 0) {
        daysAhead += 7;
      }
      expiryDate.setDate(expiryDate.getDate() + daysAhead);
      
      const [hours, minutes] = newExpiryTime.split(':').map(Number);
      expiryDate.setHours(hours, minutes, 0, 0);
    }

    console.log('📅 [updateDietExpiryDate] Hesaplanan expiryDate:', expiryDate);

    // Firebase'e kaydet
    const planRef = doc(db, DIET_PLANS_COLLECTION, planId);
    const updateData = {
      expiryDate: expiryDate,
      expiryDay: newExpiryDay,
      expiryTime: newExpiryTime,
      updatedAt: new Date(),
    };

    console.log('💾 [updateDietExpiryDate] Firebase\'ye kaydediliyor:', updateData);

    await updateDoc(planRef, updateData);

    console.log('✅ [updateDietExpiryDate] Firebase\'ye başarıyla kaydedildi!');
  } catch (error: any) {
    console.error('❌ [updateDietExpiryDate] Hata:', error);
    throw new Error(error.message);
  }
};

// Diyet planı sil
export const deleteDietPlan = async (planId: string): Promise<void> => {
  try {
    const planRef = doc(db, DIET_PLANS_COLLECTION, planId);
    await deleteDoc(planRef);
    console.log('✅ Diyet planı silindi');
  } catch (error: any) {
    console.error('❌ Diyet planı silme hatası:', error);
    throw new Error(error.message);
  }
};

// Diyet planı detayını getir
export const getDietPlanById = async (planId: string): Promise<DietPlan | null> => {
  try {
    const docRef = doc(db, DIET_PLANS_COLLECTION, planId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    
    // expiryDate yoksa otomatik set et
    let expiryDate = data.expiryDate;
    if (!expiryDate) {
      const startDate = data.startDate?.toDate?.() || new Date(data.startDate) || new Date();
      expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 7);
    }
    
    return {
      ...data,
      id: docSnap.id,
      expiryDate: expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate),
      startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as DietPlan;
  } catch (error: any) {
    console.error('❌ Diyet planı getirme hatası:', error);
    throw new Error(error.message);
  }
};

// Diyetisyenin danışanlarını expiry info ile getir - FIXED
export const getDietitianPatientsWithExpiryInfo = async (dietitianId: string): Promise<Array<{
  patientId: string;
  patientName: string;
  activeDiets: DietPlan[];
  daysUntilExpiry?: number;
}>> => {
  try {
    console.log('🔄 getDietitianPatientsWithExpiryInfo başladı - dietitianId:', dietitianId);
    
    // TÜM diyetleri getir
    const q = query(
      collection(db, DIET_PLANS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );

    const querySnapshot = await getDocs(q);
    console.log('📊 Toplam diyet sayısı:', querySnapshot.size);

    const patientsMap = new Map();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // expiryDate yoksa otomatik set et
      let expiryDate = data.expiryDate;
      
      // Firestore Timestamp'i Date'e çevir
      if (expiryDate && typeof expiryDate === 'object' && expiryDate.toDate) {
        expiryDate = expiryDate.toDate();
      } else if (typeof expiryDate === 'string') {
        expiryDate = new Date(expiryDate);
      }
      
      // Hala yoksa otomatik set et
      if (!expiryDate) {
        const startDate = data.startDate?.toDate?.() || new Date(data.startDate) || new Date();
        expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 7);
      }
      
      // KALAN GÜNÜ HESAPLA
      const daysLeft = Math.ceil(
        (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const diet = {
        ...data,
        id: docSnap.id,
        expiryDate: expiryDate instanceof Date ? expiryDate : new Date(expiryDate),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as DietPlan;

      // SADECE aktif diyetleri ekle
      const isActive = data.isActive !== false && data.status !== 'expired';
      
      if (isActive) {
        const patientKey = `${data.patientId}_${data.patientName}`;
        if (!patientsMap.has(patientKey)) {
          patientsMap.set(patientKey, {
            patientId: data.patientId,
            patientName: data.patientName,
            activeDiets: [],
            daysUntilExpiry: daysLeft,
          });
        }

        patientsMap.get(patientKey).activeDiets.push(diet);
        console.log(`✅ Aktif diyet bulundu: ${data.patientName} - ${diet.title} (${daysLeft} gün)`);
      } else {
        console.log(`⏭️ Pasif/Süresi dolmuş diyet atlandı: ${data.patientName} - ${data.title}`);
      }
    });

    const result = Array.from(patientsMap.values());
    console.log('📋 Sonuç - danışan sayısı:', result.length);
    
    return result;
  } catch (error: any) {
    console.error('❌ Diyetisyen danışanları getirme hatası:', error);
    throw new Error(error.message);
  }
};