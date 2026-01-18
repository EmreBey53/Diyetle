// src/services/firestoreService.ts
export { db } from '../firebaseConfig'; // RE-EXPORT
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { User } from '../models/User';

// Tüm diyetisyenleri getir
export const getAllDietitians = async (): Promise<User[]> => {
  try {
    console.log('🔍 Firestore\'dan diyetisyenler sorgulanıyor...');
    
    const { db } = await import('../firebaseConfig'); // Local import
    const q = query(collection(db, 'users'), where('role', '==', 'dietitian'));
    const querySnapshot = await getDocs(q);
    console.log('📊 Sorgu sonucu - Döküman sayısı:', querySnapshot.size);
    const dietitians: User[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('👨‍⚕️ Diyetisyen bulundu:', {
        id: doc.id,
        displayName: data.displayName,
        email: data.email,
        role: data.role
      });
      
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as User;
    });
    console.log('✅ Toplam diyetisyen:', dietitians.length);
    console.log('📋 Diyetisyen listesi:', dietitians.map(d => d.displayName));
    
    return dietitians;
  } catch (error: any) {
    console.error('❌ Diyetisyen yükleme hatası:', error);
    throw new Error(error.message);
  }
};

// Belirli bir diyetisyeni getir
export const getDietitianById = async (id: string): Promise<User | null> => {
  try {
    console.log('🔍 Diyetisyen aranıyor, ID:', id);
    
    const { db } = await import('../firebaseConfig'); // Local import
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.log('❌ Diyetisyen bulunamadı, ID:', id);
      return null;
    }
    const data = docSnap.data();
    
    if (data.role !== 'dietitian') {
      console.log('⚠️ Bulunan kullanıcı diyetisyen değil:', data.role);
      return null;
    }
    console.log('✅ Diyetisyen bulundu:', data.displayName);
    
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as User;
  } catch (error: any) {
    console.error('❌ Diyetisyen getirme hatası:', error);
    throw new Error(error.message);
  }
};

// YENI: Diyetisyenin tüm hastalarını getir
export const getDietitianPatients = async (dietitianId: string): Promise<any[]> => {
  try {
    console.log('🔍 Diyetisyenin hastaları sorgulanıyor, ID:', dietitianId);
    
    const { db } = await import('../firebaseConfig'); // Local import
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'patient'),
      where('dietitianId', '==', dietitianId)
    );
    const querySnapshot = await getDocs(q);
    
    console.log('📊 Hasta sayısı:', querySnapshot.size);
    
    const patients = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.displayName || data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        displayName: data.displayName || '',
      };
    });
    
    console.log('✅ Hastalar yüklendi:', patients.length);
    return patients;
  } catch (error: any) {
    console.error('❌ Hastalar yükleme hatası:', error);
    throw new Error(error.message);
  }
};