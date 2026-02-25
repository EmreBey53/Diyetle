import {
  ref,
  uploadBytes,
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
  updateDoc,r
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { storage, db } from '../firebaseConfig';
import { MealPhoto, FoodDetectionResult } from '../models/MealPhoto';
import { notifyDietitianMealPhoto, notifyPatientPhotoResponse } from './notificationService';
import { ENV } from '../config/env';
import { checkNetworkStatus, retryWithBackoff } from '../utils/networkUtils';

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

// GOOGLE VISION API - SECURE VERSION WITH NETWORK HANDLING
export const analyzeFoodImage = async (
  base64Image: string
): Promise<FoodDetectionResult> => {
  try {

    // Network durumunu kontrol et
    const networkState = await checkNetworkStatus();
    if (!networkState.isConnected) {
      return {
        success: false,
        message: 'İnternet bağlantısı yok. Fotoğraf yine de gönderilebilir.',
        error: 'No network connection',
        data: {
          isFood: true, // Offline fallback
          confidence: 50,
          labels: ['offline'],
          foodItems: ['yemek'],
        },
      };
    }

    // API key'i environment'dan al
    const apiKey = ENV.GOOGLE_VISION_API_KEY;

    // Retry mekanizması ile API çağrısı
    const result = await retryWithBackoff(async () => {

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: 'LABEL_DETECTION',
                    maxResults: 10,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vision API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // API error kontrolü
      if (data.responses?.[0]?.error) {
        throw new Error(`Vision API Error: ${data.responses[0].error.message}`);
      }

      return data;
    }, 3, 1000);

    const labels = result.responses[0]?.labelAnnotations || [];


    const foodKeywords = [
      'food',
      'dish',
      'meal',
      'cuisine',
      'ingredient',
      'drink',
      'beverage',
      'fruit',
      'vegetable',
      'meat',
      'fish',
      'bread',
      'pasta',
      'rice',
      'salad',
      'soup',
      'dessert',
      'snack',
      'breakfast',
      'lunch',
      'dinner',
      'plate',
      'bowl',
      'cup',
    ];

    const detectedLabels = labels.map((l: any) => l.description.toLowerCase());
    const foodLabels = detectedLabels.filter((label: string) =>
      foodKeywords.some((keyword) => label.includes(keyword))
    );

    let foodConfidence = 0;
    if (foodLabels.length > 0) {
      const matchedScores = labels
        .filter((l: any) =>
          foodKeywords.some((keyword) =>
            l.description.toLowerCase().includes(keyword)
          )
        )
        .map((l: any) => l.score * 100);
      foodConfidence = Math.max(...matchedScores, 0);
    }

    const isFood = foodConfidence > 30;


    return {
      success: true,
      message: isFood
        ? `Yemek tespit edildi (${foodConfidence.toFixed(0)}% emin)`
        : 'Bu bir yemek fotoğrafı değil gibi görünüyor',
      data: {
        isFood,
        confidence: Math.round(foodConfidence),
        labels: detectedLabels,
        foodItems: foodLabels,
      },
    };

  } catch (error: any) {
    
    // Network hatası mı kontrol et
    const isNetworkError = error.message?.includes('network') || 
                          error.message?.includes('fetch') ||
                          error.message?.includes('connection');
    
    return {
      success: false,
      message: isNetworkError 
        ? 'İnternet bağlantısı sorunu. Fotoğraf yine de gönderilebilir.'
        : 'Resim analiz edilirken hata oluştu. Lütfen tekrar deneyin.',
      error: error.message,
      data: {
        isFood: true, // Fallback
        confidence: 50,
        labels: ['error'],
        foodItems: ['yemek'],
      },
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

    // Firebase Storage'a yükleme işlemini retry ile yap
    try {
      await retryWithBackoff(async () => {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, blob);
        
        photoUrl = await getDownloadURL(storageRef);
        finalStoragePath = storagePath;
        
      }, 3, 2000);
      
    } catch (storageError: any) {
      // Storage başarısız olursa base64 kullan (fallback)
      photoUrl = `data:image/jpeg;base64,${base64Image}`;
      finalStoragePath = '';
    }

    // Firestore'a metadata kaydet
    const photoData = {
      patientId,
      mealType,
      mealName,
      photoUrl,
      storagePath: finalStoragePath,
      // Base64'ü sadece Storage başarısız olursa kaydet
      ...(finalStoragePath === '' && { photoBase64: base64Image }),
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