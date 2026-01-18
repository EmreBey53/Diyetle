// src/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAA9Ah1D2ZSlI4TXl9PA2x7f4I8stqNsVo",
  authDomain: "diyetle-43a12.firebaseapp.com",
  projectId: "diyetle-43a12",
  storageBucket: "diyetle-43a12.firebasestorage.app",
  messagingSenderId: "727199954922",
  appId: "1:727199954922:web:fca8a5a13c6eade9126493"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;