import { auth, db } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { User, UserRole } from '../models/User';
import { calculateBMI } from '../models/Patient';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService';
import { EncryptionService } from './encryptionService';

export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  dietitianId?: string,
  weight?: number,
  height?: number
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    await updateProfile(firebaseUser, { displayName });
    const userData: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(role === 'patient' && dietitianId && { dietitianId }),
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    if (role === 'patient' && dietitianId) {
      const patientData: any = {
        userId: firebaseUser.uid,
        dietitianId: dietitianId,
        name: displayName,
        email: firebaseUser.email!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (weight) patientData.weight = weight;
      if (height) patientData.height = height;
      if (weight && height) patientData.bmi = calculateBMI(weight, height);

      await addDoc(collection(db, 'patients'), patientData);
    }
    return userData;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Bu e-posta adresi zaten kullanımda!');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Şifre en az 6 karakter olmalıdır!');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Geçersiz e-posta adresi!');
    }
    throw new Error(error.message);
  }
};

export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      throw new Error('Kullanıcı bilgileri bulunamadı!');
    }

    const userData = userDoc.data() as User;

    await logAuditEvent({
      userId: firebaseUser.uid,
      userRole: userData.role,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      resource: 'auth',
      resourceId: firebaseUser.uid,
      details: { email, loginTime: new Date() },
      severity: 'low',
    });

    await EncryptionService.secureStore('user_session', JSON.stringify({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      role: userData.role,
    }));

    return {
      ...userData,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };
  } catch (error: any) {
    await logAuditEvent({
      userId: 'unknown',
      userRole: 'patient',
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      resource: 'auth',
      details: { email, error: error.message },
      severity: 'medium',
    });

    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('E-posta veya şifre hatalı!');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Geçersiz e-posta adresi formatı!');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('Bu hesap devre dışı bırakılmış!');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Çok fazla başarısız deneme! Lütfen bir süre bekleyin.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    } else if (error.message && !error.code) {
      throw error;
    }
    throw new Error('Giriş yapılamadı. Lütfen tekrar deneyin.');
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() as User : null;

      await logAuditEvent({
        userId: currentUser.uid,
        userRole: userData?.role || 'patient',
        action: AUDIT_ACTIONS.LOGOUT,
        resource: 'auth',
        resourceId: currentUser.uid,
        details: { logoutTime: new Date() },
        severity: 'low',
      });
    }

    await signOut(auth);
    await EncryptionService.secureDelete('user_session');
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as User;
};

export const updateUserProfileImage = async (
  userId: string,
  profileEmoji?: string,
  profileImage?: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (profileEmoji !== undefined) {
      updateData.profileEmoji = profileEmoji;
      updateData.profileImage = null;
    }

    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
      updateData.profileEmoji = null;
    }

    await setDoc(userRef, updateData, { merge: true });
  } catch (error: any) {
    throw new Error('Profil güncelleme hatası: ' + error.message);
  }
};
