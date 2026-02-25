import Constants from 'expo-constants';

interface EnvConfig {
  GOOGLE_VISION_API_KEY: string;
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  APP_ENV: string;
}

const getEnvVar = (key: string, fallback?: string): string => {
  const expoConfig = Constants.expoConfig as any;
  const manifest = Constants.manifest as any;

  const value = expoConfig?.extra?.[key] ||
                process.env[key] ||
                manifest?.extra?.[key];

  if (!value && !fallback) {
  }

  return value || fallback || '';
};

export const ENV: EnvConfig = {
  GOOGLE_VISION_API_KEY: getEnvVar('GOOGLE_VISION_API_KEY', 'AIzaSyC8mLx_LQdMJrOzLtDyJLrqzIW-fT69rJo'),
  FIREBASE_API_KEY: getEnvVar('FIREBASE_API_KEY', 'AIzaSyAA9Ah1D2ZSlI4TXl9PA2x7f4I8stqNsVo'),
  FIREBASE_AUTH_DOMAIN: getEnvVar('FIREBASE_AUTH_DOMAIN', 'diyetle-43a12.firebaseapp.com'),
  FIREBASE_PROJECT_ID: getEnvVar('FIREBASE_PROJECT_ID', 'diyetle-43a12'),
  FIREBASE_STORAGE_BUCKET: getEnvVar('FIREBASE_STORAGE_BUCKET', 'diyetle-43a12.firebasestorage.app'),
  FIREBASE_MESSAGING_SENDER_ID: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', '727199954922'),
  FIREBASE_APP_ID: getEnvVar('FIREBASE_APP_ID', '1:727199954922:web:fca8a5a13c6eade9126493'),
  APP_ENV: getEnvVar('APP_ENV', 'development'),
};

