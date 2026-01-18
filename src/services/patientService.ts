// src/services/patientService.ts
import { db, auth } from '../firebaseConfig';
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
import { Patient, calculateBMI } from '../models/Patient';

const PATIENTS_COLLECTION = 'patients';

// Diyetisyenin danışanlarını getir
export const getPatientsByDietitian = async (dietitianId: string): Promise<Patient[]> => {
  try {
    console.log('📥 Danışanlar yükleniyor, diyetisyen:', dietitianId);
    
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('dietitianId', '==', dietitianId)
    );

    const querySnapshot = await getDocs(q);
    console.log('📊 Bulunan danışan sayısı:', querySnapshot.size);

    const patients: Patient[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Patient;
    });

    // Tarihe göre sırala (en yeni önce)
    patients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return patients;
  } catch (error: any) {
    console.error('❌ Danışan yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Danışan ekle
export const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const patient = {
      ...patientData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), patient);
    console.log('✅ Danışan eklendi, ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('❌ Danışan ekleme hatası:', error);
    throw new Error(error.message);
  }
};

// Danışanın kendi profilini getir (userId ile)
export const getPatientProfileByUserId = async (userId: string): Promise<Patient | null> => {
  try {
    console.log('📥 Danışan profili yükleniyor, userId:', userId);
    
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('⚠️ Profil bulunamadı');
      return null;
    }

    const docData = querySnapshot.docs[0];
    const data = docData.data();
    
    return {
      ...data,
      id: docData.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Patient;
  } catch (error: any) {
    console.error('❌ Profil yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Danışan detayını getir
export const getPatientById = async (patientId: string): Promise<Patient | null> => {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as Patient;
  } catch (error: any) {
    console.error('❌ Danışan getirme hatası:', error);
    throw new Error(error.message);
  }
};

// Danışan güncelle
export const updatePatient = async (patientId: string, updates: Partial<Patient>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    // BMI hesapla (eğer kilo/boy varsa)
    if (updates.weight && updates.height) {
      updateData.bmi = calculateBMI(updates.weight, updates.height);
    }

    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    await updateDoc(patientRef, updateData);
    console.log('✅ Danışan güncellendi');
  } catch (error: any) {
    console.error('❌ Danışan güncelleme hatası:', error);
    throw new Error(error.message);
  }
};

// Danışanı VE TÜM VERİLERİNİ sil
export const deletePatient = async (patientId: string): Promise<void> => {
  try {
    console.log('🗑️ Danışan siliniyor:', patientId);

    // 1. Diyet planlarını sil
    const dietPlansQuery = query(
      collection(db, 'dietPlans'),
      where('patientId', '==', patientId)
    );
    const dietPlansSnapshot = await getDocs(dietPlansQuery);
    const dietPlanDeletes = dietPlansSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(dietPlanDeletes);
    console.log('✅ Diyet planları silindi:', dietPlansSnapshot.size);

    // 2. İlerleme kayıtlarını sil
    const progressQuery = query(
      collection(db, 'progress'),
      where('patientId', '==', patientId)
    );
    const progressSnapshot = await getDocs(progressQuery);
    const progressDeletes = progressSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(progressDeletes);
    console.log('✅ İlerleme kayıtları silindi:', progressSnapshot.size);

    // 3. Soruları sil
    const questionsQuery = query(
      collection(db, 'questions'),
      where('patientId', '==', patientId)
    );
    const questionsSnapshot = await getDocs(questionsQuery);
    const questionDeletes = questionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(questionDeletes);
    console.log('✅ Sorular silindi:', questionsSnapshot.size);

    // 4. Patients collection'dan sil
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    await deleteDoc(patientRef);
    console.log('✅ Patient kaydı silindi');

    // 5. Users collection'dan sil (eğer varsa)
    try {
      const userRef = doc(db, 'users', patientId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await deleteDoc(userRef);
        console.log('✅ User kaydı silindi');
      }
    } catch (error) {
      console.log('⚠️ User kaydı bulunamadı (normal olabilir)');
    }

    console.log('✅ Danışan VE TÜM VERİLERİ başarıyla silindi!');
  } catch (error: any) {
    console.error('❌ Danışan silme hatası:', error);
    throw new Error(error.message);
  }
};
