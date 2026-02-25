export { db } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { User } from '../models/User';

export const getAllDietitians = async (): Promise<User[]> => {
  try {
    const { db } = await import('../firebaseConfig');
    const q = query(collection(db, 'users'), where('role', '==', 'dietitian'));
    const querySnapshot = await getDocs(q);
    const dietitians: User[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as User;
    });
    
    return dietitians;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getDietitianById = async (id: string): Promise<User | null> => {
  try {
    const { db } = await import('../firebaseConfig');
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    const data = docSnap.data();
    
    if (data.role !== 'dietitian') {
      return null;
    }
    
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    } as User;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getDietitianPatients = async (dietitianId: string): Promise<any[]> => {
  try {
    const { db } = await import('../firebaseConfig');
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'patient'),
      where('dietitianId', '==', dietitianId)
    );
    const querySnapshot = await getDocs(q);
    
    
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
    
    return patients;
  } catch (error: any) {
    throw new Error(error.message);
  }
};