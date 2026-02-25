jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: any, col: string, id: string) => ({ path: `${col}/${id}` })),
  setDoc: jest.fn(async () => {}),
  getDoc: jest.fn(),
  addDoc: jest.fn(async () => ({ id: 'new_doc_id' })),
  collection: jest.fn((_db: any, col: string) => ({ id: col })),
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(async () => {}),
  updateProfile: jest.fn(async () => {}),
}));

jest.mock('../src/services/auditService', () => ({
  logAuditEvent: jest.fn(async () => {}),
  AUDIT_ACTIONS: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGOUT: 'logout',
  },
}));

jest.mock('../src/services/encryptionService', () => ({
  EncryptionService: {
    secureStore: jest.fn(async () => {}),
    secureRetrieve: jest.fn(async () => null),
    secureDelete: jest.fn(async () => {}),
  },
}));

jest.mock('../src/models/Patient', () => ({
  calculateBMI: jest.fn((w: number, h: number) =>
    parseFloat((w / ((h / 100) ** 2)).toFixed(1))
  ),
}));

jest.mock('../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

import { loginUser, logoutUser, registerUser } from '../src/services/authService';
import { EncryptionService } from '../src/services/encryptionService';
import * as firestoreModule from 'firebase/firestore';
import * as authModule from 'firebase/auth';

const mockUserFirebase = { uid: 'uid123', email: 'test@example.com' };
const mockUserDocData = {
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'patient' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loginUser', () => {
  it('başarılı girişte kullanıcı döner', async () => {
    (authModule.signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUserFirebase });
    (firestoreModule.getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => true, data: () => mockUserDocData });

    const user = await loginUser('test@example.com', 'password123');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('patient');
  });

  it('başarılı girişte session SecureStore\'a kaydedilir', async () => {
    (authModule.signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUserFirebase });
    (firestoreModule.getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => true, data: () => mockUserDocData });

    await loginUser('test@example.com', 'password123');

    expect(EncryptionService.secureStore).toHaveBeenCalledWith(
      'user_session',
      expect.stringContaining('uid123')
    );
  });

  it('Firestore\'da kullanıcı yoksa hata fırlatır', async () => {
    (authModule.signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUserFirebase });
    (firestoreModule.getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await expect(loginUser('test@example.com', 'password123'))
      .rejects.toThrow('Kullanıcı bilgileri bulunamadı!');
  });

  it('hatalı şifrede Türkçe hata mesajı döner', async () => {
    (authModule.signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/wrong-password', message: 'wrong',
    });
    await expect(loginUser('test@example.com', 'wrong')).rejects.toThrow('E-posta veya şifre hatalı!');
  });

  it('geçersiz email hatası Türkçe döner', async () => {
    (authModule.signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-email', message: 'invalid',
    });
    await expect(loginUser('bad', 'pass')).rejects.toThrow('Geçersiz e-posta adresi!');
  });
});

describe('logoutUser', () => {
  it('signOut çağrılır', async () => {
    await logoutUser();
    expect(authModule.signOut).toHaveBeenCalled();
  });

  it('SecureStore\'dan session silinir', async () => {
    await logoutUser();
    expect(EncryptionService.secureDelete).toHaveBeenCalledWith('user_session');
  });
});

describe('registerUser', () => {
  it('e-posta zaten kullanımdaysa Türkçe hata döner', async () => {
    (authModule.createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    });
    await expect(registerUser('x@x.com', 'pass', 'Ad', 'patient'))
      .rejects.toThrow('Bu e-posta adresi zaten kullanımda!');
  });

  it('zayıf şifre hatası Türkçe döner', async () => {
    (authModule.createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/weak-password',
    });
    await expect(registerUser('x@x.com', '1', 'Ad', 'patient'))
      .rejects.toThrow('Şifre en az 6 karakter olmalıdır!');
  });

  it('geçersiz email Türkçe döner', async () => {
    (authModule.createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-email',
    });
    await expect(registerUser('bad', 'pass', 'Ad', 'patient'))
      .rejects.toThrow('Geçersiz e-posta adresi!');
  });
});

describe('Güvenlik kontrolleri', () => {
  it('authService AsyncStorage import etmez', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(path.resolve(__dirname, '../src/services/authService.ts'), 'utf-8');
    expect(content).not.toContain('AsyncStorage');
    expect(content).not.toContain('rememberedUser');
    expect(content).not.toContain('saveCredentials');
  });

  it('authService şifre objede saklamaz', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(path.resolve(__dirname, '../src/services/authService.ts'), 'utf-8');
    expect(content).not.toMatch(/JSON\.stringify\(\{[^}]*password[^}]*\}\)/s);
  });
});
