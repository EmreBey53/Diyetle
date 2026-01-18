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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService';
import { EncryptionService } from './encryptionService';

// Kullanıcı kayıt (Email ile - Gmail kabul eder)
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
    // Firebase Auth'a kaydet
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    // Profil güncelle
    await updateProfile(firebaseUser, { displayName });
    // Firestore'a kullanıcı bilgilerini kaydet
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
    // EĞER PATIENT İSE: patients collection'a da ekle
    if (role === 'patient' && dietitianId) {
      const patientData: any = {
        userId: firebaseUser.uid,
        dietitianId: dietitianId,
        name: displayName,
        email: firebaseUser.email!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Weight, height ve BMI sadece varsa ekle (undefined değerleri Firebase kabul etmez)
      if (weight) patientData.weight = weight;
      if (height) patientData.height = height;
      if (weight && height) patientData.bmi = calculateBMI(weight, height);

      await addDoc(collection(db, 'patients'), patientData);
      console.log('✅ Patient collection\'a da eklendi');
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

// Kullanıcı giriş
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Firestore'dan kullanıcı bilgilerini al
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      throw new Error('Kullanıcı bilgileri bulunamadı!');
    }
    
    const userData = userDoc.data() as User;
    
    // Başarılı giriş audit log
    await logAuditEvent({
      userId: firebaseUser.uid,
      userRole: userData.role,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      resource: 'auth',
      resourceId: firebaseUser.uid,
      details: { email, loginTime: new Date() },
      severity: 'low',
    });

    // Güvenli depolama
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
    // Başarısız giriş audit log
    await logAuditEvent({
      userId: 'unknown',
      userRole: 'patient',
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      resource: 'auth',
      details: { email, error: error.message },
      severity: 'medium',
    });

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('E-posta veya şifre hatalı!');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Geçersiz e-posta adresi!');
    }
    throw new Error(error.message);
  }
};

// Kullanıcı çıkış
export const logoutUser = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      // Çıkış audit log
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
    
    // Güvenli depolamayı temizle
    await EncryptionService.secureStore('user_session', '');
    
    // Remember Me verisini temizle
    await clearCredentials();
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Mevcut kullanıcı bilgilerini al
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as User;
};

// Kullanıcı profil görselini güncelle
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
      // Clear profileImage when emoji is selected
      updateData.profileImage = null;
    }

    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
      // Clear profileEmoji when avatar is selected
      updateData.profileEmoji = null;
    }

    await setDoc(userRef, updateData, { merge: true });
  } catch (error: any) {
    throw new Error('Profil güncelleme hatası: ' + error.message);
  }
};

// ==================== REMEMBER ME FUNCTIONS ====================

/**
 * Kullanıcı bilgilerini AsyncStorage'a kaydet (Beni Hatırla)
 */
export const saveCredentials = async (
  email: string,
  password: string,
  rememberMe: boolean
) => {
  try {
    if (rememberMe) {
      await AsyncStorage.setItem(
        'rememberedUser',
        JSON.stringify({
          email,
          password,
          rememberMe: true,
          savedAt: new Date().toISOString(),
        })
      );
      console.log('💾 Giriş bilgileri kaydedildi');
    } else {
      await AsyncStorage.removeItem('rememberedUser');
    }
  } catch (error) {
    console.error('❌ Kayıt hatası:', error);
  }
};

/**
 * AsyncStorage'dan kaydedilmiş kullanıcı bilgilerini getir
 */
export const getCredentials = async () => {
  try {
    const data = await AsyncStorage.getItem('rememberedUser');
    if (data) {
      const credentials = JSON.parse(data);
      console.log('✅ Kaydedilmiş giriş bulundu');
      return credentials;
    }
    return null;
  } catch (error) {
    console.error('❌ Getirme hatası:', error);
    return null;
  }
};

/**
 * Logout'ta kaydedilmiş bilgileri sil
 */
export const clearCredentials = async () => {
  try {
    await AsyncStorage.removeItem('rememberedUser');
    console.log('🗑️ Kaydedilmiş bilgiler silindi');
  } catch (error) {
    console.error('❌ Silme hatası:', error);
  }
};

/**
 * Otomatik login (Beni Hatırla ise)
 */
export const autoLogin = async (): Promise<User | null> => {
  try {
    const credentials = await getCredentials();
    
    if (credentials && credentials.rememberMe) {
      console.log('🔐 Otomatik giriş yapılıyor...');
      const user = await loginUser(credentials.email, credentials.password);
      console.log('✅ Otomatik giriş başarılı!');
      return user;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Otomatik giriş hatası:', error);
    // Hatalı bilgilerse sil
    await clearCredentials();
    return null;
  }
};