import Constants from 'expo-constants';

interface EnvConfig {
  HF_API_TOKEN: string;
  GEMINI_API_KEY: string;
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  APP_ENV: string;
  RESEND_API_KEY: string;
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
  HF_API_TOKEN: getEnvVar('HF_API_TOKEN', ''),
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY', 'AIzaSyDhKp7kwbYG2d2KPBe4sSpkSieOJJLpLOU'),
  FIREBASE_API_KEY: getEnvVar('FIREBASE_API_KEY', 'AIzaSyAA9Ah1D2ZSlI4TXl9PA2x7f4I8stqNsVo'),
  FIREBASE_AUTH_DOMAIN: getEnvVar('FIREBASE_AUTH_DOMAIN', 'diyetle-43a12.firebaseapp.com'),
  FIREBASE_PROJECT_ID: getEnvVar('FIREBASE_PROJECT_ID', 'diyetle-43a12'),
  FIREBASE_STORAGE_BUCKET: getEnvVar('FIREBASE_STORAGE_BUCKET', 'diyetle-43a12.firebasestorage.app'),
  FIREBASE_MESSAGING_SENDER_ID: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', '727199954922'),
  FIREBASE_APP_ID: getEnvVar('FIREBASE_APP_ID', '1:727199954922:web:fca8a5a13c6eade9126493'),
  APP_ENV: getEnvVar('APP_ENV', 'development'),
  RESEND_API_KEY: getEnvVar('RESEND_API_KEY', 're_6tJ1LfaE_Nx97KRFADp2kpQgrtdhPAnbN'),
};

