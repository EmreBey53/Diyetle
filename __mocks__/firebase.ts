export const getFirestore = jest.fn(() => ({}));
export const collection = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const getDocs = jest.fn();
export const addDoc = jest.fn();
export const updateDoc = jest.fn();
export const setDoc = jest.fn();
export const deleteDoc = jest.fn();
export const getDoc = jest.fn();
export const doc = jest.fn();
export const orderBy = jest.fn();
export const limit = jest.fn();
export const writeBatch = jest.fn(() => ({
  delete: jest.fn(),
  commit: jest.fn(async () => {}),
}));
export const Timestamp = {
  now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 })),
  fromDate: jest.fn((d: Date) => ({ toDate: () => d, seconds: d.getTime() / 1000 })),
};
export const arrayUnion = jest.fn();
export const arrayRemove = jest.fn();
export const onSnapshot = jest.fn();
export const getAuth = jest.fn(() => ({ currentUser: null }));
export const signInWithEmailAndPassword = jest.fn();
export const createUserWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const updateProfile = jest.fn();
export const initializeApp = jest.fn(() => ({}));
