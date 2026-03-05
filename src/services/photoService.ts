import {
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { storage, db } from '../firebaseConfig';
import { MealPhoto, FoodDetectionResult } from '../models/MealPhoto';
import { notifyDietitianMealPhoto, notifyPatientPhotoResponse } from './notificationService';
import { ENV } from '../config/env';
import { checkNetworkStatus } from '../utils/networkUtils';

const PHOTOS_COLLECTION = 'mealPhotos';
const STORAGE_PATH = 'meal-photos';

// PERMISSION FUNCTIONS
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

export const requestGalleryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};

// GOOGLE GEMINI FLASH — Ücretsiz görsel analiz (500 istek/gün)
export const analyzeFoodImage = async (
  base64Image: string
): Promise<FoodDetectionResult> => {
  try {
    // Network kontrolü
    const networkState = await checkNetworkStatus();
    if (!networkState.isConnected) {
      return {
        success: false,
        message: 'İnternet bağlantısı yok.',
        error: 'No network connection',
        data: { isFood: false, confidence: 0, labels: [], foodItems: [] },
      };
    }

    const apiKey = ENV.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Bu fotoğrafa bak ve şu soruları yanıtla (sadece JSON formatında, başka hiçbir şey yazma):
{
  "isFood": true/false,
  "confidence": 0-100 arası sayı,
  "foodItems": ["yemek adı 1", "yemek adı 2"],
  "description": "kısa Türkçe açıklama"
}

Kurallar:
- isFood: Fotoğrafta yenebilir bir yiyecek/içecek varsa true, yoksa false
- confidence: Ne kadar emin olduğun (0-100)
- foodItems: Tespit ettiğin yiyeceklerin Türkçe adları (max 5 madde)
- description: 1 cümlelik Türkçe açıklama`;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const result = await response.json();
    const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON bloğunu parse et (markdown code block veya düz JSON)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error('Gemini yanıtı parse edilemedi');
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    const isFood: boolean = parsed.isFood === true;
    const confidence: number = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
    const foodItems: string[] = Array.isArray(parsed.foodItems) ? parsed.foodItems : [];
    const description: string = parsed.description || '';

    return {
      success: true,
      message: isFood
        ? `Yemek tespit edildi: ${description}`
        : `Yemek fotoğrafı değil: ${description}`,
      data: {
        isFood,
        confidence,
        labels: foodItems,
        foodItems,
      },
    };

  } catch (error: any) {
    const isNetworkError = error.message?.includes('network') ||
      error.message?.includes('fetch') || error.message?.includes('connection');

    return {
      success: false,
      message: isNetworkError
        ? 'İnternet bağlantısı sorunu.'
        : 'Görsel analizi şu an kullanılamıyor.',
      error: error.message,
      data: { isFood: false, confidence: 0, labels: [], foodItems: [] },
    };
  }
};

// UPLOAD PHOTO - OPTIMIZED VERSION WITH FIREBASE STORAGE AND ERROR HANDLING
export const uploadMealPhoto = async (
  patientId: string,
  uri: string,
  base64Image: string,
  mealType: string,
  mealName: string,
  detectedLabels: string[],
  confidence: number,
  message?: string
): Promise<string> => {
  try {

    // Network durumunu kontrol et
    const networkState = await checkNetworkStatus();
    if (!networkState.isConnected) {
      throw new Error('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    }

    const timestamp = Date.now();
    const fileName = `${patientId}_${mealType}_${timestamp}.jpg`;
    const storagePath = `${STORAGE_PATH}/${patientId}/${fileName}`;

    let photoUrl = '';
    let finalStoragePath = '';

    // Base64'ü direkt Firebase Storage'a yükle (fetch/blob yok → Expo URI sorunları bypass)
    try {
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, base64Image, 'base64', { contentType: 'image/jpeg' });
      photoUrl = await getDownloadURL(storageRef);
      finalStoragePath = storagePath;
    } catch (storageError: any) {
      throw new Error('Fotoğraf yüklenemedi. İnternet bağlantınızı kontrol edin.');
    }

    // Firestore'a metadata kaydet
    const photoData = {
      patientId,
      mealType,
      mealName,
      photoUrl,
      storagePath: finalStoragePath,
      detectedLabels,
      confidence,
      isVerified: true,
      calories: 0,
      notes: message || '',
      uploadedAt: timestamp,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, PHOTOS_COLLECTION), photoData);


    // Get patient info to send notification to dietitian
    try {
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (patientDoc.exists()) {
        const patientData = patientDoc.data();
        const dietitianId = patientData.dietitianId;

        // Get dietitian push token
        const dietitianDoc = await getDoc(doc(db, 'users', dietitianId));
        if (dietitianDoc.exists()) {
          const dietitianData = dietitianDoc.data();
          const dietitianToken = dietitianData.pushToken;

          if (dietitianToken) {
            // Send notification to dietitian
            await notifyDietitianMealPhoto(
              dietitianToken,
              dietitianId, // dietitianUserId
              patientId,
              patientData.name || 'Danışan',
              mealType,
              mealName,
              message
            );
          } else {
          }
        }
      }
    } catch (notificationError) {
    }

    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// GET PATIENT PHOTOS
export const getPatientMealPhotos = async (
  patientId: string
): Promise<MealPhoto[]> => {
  try {

    const q = query(
      collection(db, PHOTOS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);
    const photos: MealPhoto[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        mealType: data.mealType,
        mealName: data.mealName,
        photoUrl: data.photoBase64 ? `data:image/jpeg;base64,${data.photoBase64}` : data.photoUrl,
        storagePath: data.storagePath,
        detectedLabels: data.detectedLabels || [],
        confidence: data.confidence || 0,
        isVerified: data.isVerified || true,
        calories: data.calories || 0,
        notes: data.notes || '',
        uploadedAt: data.uploadedAt,
        createdAt: data.createdAt?.toMillis?.() || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      } as MealPhoto;
    });

    return photos.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// GET PHOTOS BY MEAL TYPE
export const getPhotosByMealType = async (
  patientId: string,
  mealType: string
): Promise<MealPhoto[]> => {
  try {
    const q = query(
      collection(db, PHOTOS_COLLECTION),
      where('patientId', '==', patientId),
      where('mealType', '==', mealType)
    );

    const querySnapshot = await getDocs(q);
    const photos: MealPhoto[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        mealType: data.mealType,
        mealName: data.mealName,
        photoUrl: data.photoBase64 ? `data:image/jpeg;base64,${data.photoBase64}` : data.photoUrl,
        storagePath: data.storagePath,
        detectedLabels: data.detectedLabels || [],
        confidence: data.confidence || 0,
        isVerified: data.isVerified || true,
        calories: data.calories || 0,
        notes: data.notes || '',
        uploadedAt: data.uploadedAt,
        createdAt: data.createdAt?.toMillis?.() || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      } as MealPhoto;
    });

    return photos.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// DELETE PHOTO
export const deleteMealPhoto = async (
  photoId: string,
  storagePath: string
): Promise<void> => {
  try {

    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);

    await deleteDoc(doc(db, PHOTOS_COLLECTION, photoId));

  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get patient photos for dietitian
export const getDietitianPatientPhotos = async (
  dietitianId: string,
  patientId: string
): Promise<MealPhoto[]> => {
  try {

    const q = query(
      collection(db, PHOTOS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);

    const photos: MealPhoto[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        patientId: data.patientId,
        mealType: data.mealType,
        mealName: data.mealName,
        photoUrl: data.photoBase64 ? `data:image/jpeg;base64,${data.photoBase64}` : data.photoUrl,
        storagePath: data.storagePath,
        detectedLabels: data.detectedLabels || [],
        confidence: data.confidence || 0,
        isVerified: data.isVerified || true,
        calories: data.calories || 0,
        notes: data.notes || '',
        uploadedAt: data.uploadedAt,
        createdAt: data.createdAt?.toMillis?.() || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      } as MealPhoto;
    });

    return photos.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// UPDATE PHOTO
export const updateMealPhoto = async (
  photoId: string,
  updates: Partial<MealPhoto>
): Promise<void> => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    await updateDoc(photoRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// DIETITIAN RESPONSE TO MEAL PHOTO
export const addDietitianResponseToPhoto = async (
  photoId: string,
  response: string
): Promise<void> => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    await updateDoc(photoRef, {
      dietitianResponse: response,
      respondedAt: Date.now(),
      updatedAt: Timestamp.now(),
    });

    // Get photo data to access patientId and mealName
    const photoDoc = await getDoc(photoRef);
    if (photoDoc.exists()) {
      const photoData = photoDoc.data();
      const patientId = photoData.patientId;
      const mealName = photoData.mealName;

      // Get patient document to find userId
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (patientDoc.exists()) {
        const patientData = patientDoc.data();
        const userId = patientData.userId;
        const dietitianId = patientData.dietitianId;

        // Get user document to get push token
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const patientToken = userData.pushToken;

          // Get dietitian document to get name
          const dietitianDoc = await getDoc(doc(db, 'users', dietitianId));
          if (dietitianDoc.exists()) {
            const dietitianData = dietitianDoc.data();
            const dietitianName = dietitianData.displayName || 'Diyetisyeniniz';

            // Send notification to patient if token exists
            if (patientToken) {
              try {
                await notifyPatientPhotoResponse(
                  patientToken,
                  userId,
                  dietitianName,
                  mealName,
                  response
                );
              } catch (notifError) {
              }
            } else {
            }
          }
        }
      }
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};