import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface AppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementBanner: string;     // Boşsa gösterilmez
  announcementColor: string;      // Hex renk, örn: "#F59E0B"
  minAppVersion: string;          // Zorla güncelleme için, örn: "1.0.0"
  registrationEnabled: boolean;   // false ise kayıt kapalı
}

const DEFAULT_CONFIG: AppConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'Uygulama bakımda. Lütfen daha sonra tekrar deneyin.',
  announcementBanner: '',
  announcementColor: '#3B82F6',
  minAppVersion: '1.0.0',
  registrationEnabled: true,
};

const CONFIG_DOC = 'appConfig/global';

export const getAppConfig = async (): Promise<AppConfig> => {
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'global'));
    if (snap.exists()) {
      return { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const subscribeAppConfig = (
  onUpdate: (config: AppConfig) => void
): (() => void) => {
  const unsubscribe = onSnapshot(
    doc(db, 'appConfig', 'global'),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
      } else {
        onUpdate(DEFAULT_CONFIG);
      }
    },
    () => onUpdate(DEFAULT_CONFIG),
  );
  return unsubscribe;
};

// Admin panelinden çağrılır
export const updateAppConfig = async (updates: Partial<AppConfig>): Promise<void> => {
  await setDoc(doc(db, 'appConfig', 'global'), updates, { merge: true });
};
