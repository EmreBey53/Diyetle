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
  updateDoc,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { storage, db } from '../firebaseConfig';
import { MealPhoto, FoodDetectionResult } from '../models/MealPhoto';
import { notifyDietitianMealPhoto, notifyPatientPhotoResponse } from './notificationService';

const PHOTOS_COLLECTION = 'mealPhotos';
const STORAGE_PATH = 'meal-photos';

// PERMISSION FUNCTIONS
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Camera permission hatası:', error);
    return false;
  }
};

export const requestGalleryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Gallery permission hatası:', error);
    return false;
  }
};

// GOOGLE VISION API
export const analyzeFoodImage = async (
  base64Image: string
): Promise<FoodDetectionResult> => {
  try {
    console.log('🔍 Resim Google Vision API ile analiz ediliyor...');

    const apiKey = 'AIzaSyC8mLx_LQdMJrOzLtDyJLrqzIW-fT69rJo';

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
      throw new Error('Vision API hatası');
    }

    const data = await response.json();
    const labels = data.responses[0]?.labelAnnotations || [];

    console.log('📋 Detected Labels:', labels.map((l: any) => l.description));

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

    console.log('✅ Food Detection Sonuç:');
    console.log('   - Is Food:', isFood);
    console.log('   - Confidence:', foodConfidence.toFixed(2) + '%');

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
    console.error('❌ Vision API hatası:', error);
    return {
      success: false,
      message: 'Resim analiz edilirken hata oluştu. Lütfen tekrar deneyin.',
      error: error.message,
    };
  }
};

// UPLOAD PHOTO - DEBUG VERSION
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
    console.log('📤 Fotoğraf Firestore\'a kaydediliyor...');

    const timestamp = Date.now();

    // Firestore'a metadata + base64 kaydet
    const photoData = {
      patientId,
      mealType,
      mealName,
      photoBase64: base64Image, // ← Base64'i direkt kaydet
      photoUrl: '', // Boş bırak şimdilik
      storagePath: '',
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

    console.log('✅ Fotoğraf Firestore\'a kaydedildi:', docRef.id);

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
            console.log('✅ Diyetisyene bildirim gönderildi');
          } else {
            console.log('⚠️ Diyetisyen push token\'ı yok');
          }
        }
      }
    } catch (notificationError) {
      console.error('⚠️ Bildirim gönderme hatası (kritik değil):', notificationError);
    }

    return docRef.id;
  } catch (error: any) {
    console.error('❌ Fotoğraf kaydetme hatası:', error);
    throw new Error(error.message);
  }
};

// GET PATIENT PHOTOS
export const getPatientMealPhotos = async (
  patientId: string
): Promise<MealPhoto[]> => {
  try {
    console.log('📸 Hasta fotoğrafları yükleniyor...');

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

    console.log('✅ Fotoğraflar yüklendi:', photos.length);
    return photos.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error: any) {
    console.error('❌ Fotoğraf yükleme hatası:', error);
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
    console.error('❌ Hata:', error);
    throw new Error(error.message);
  }
};

// DELETE PHOTO
export const deleteMealPhoto = async (
  photoId: string,
  storagePath: string
): Promise<void> => {
  try {
    console.log('🗑️ Fotoğraf siliniyor...');

    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);

    await deleteDoc(doc(db, PHOTOS_COLLECTION, photoId));

    console.log('✅ Fotoğraf silindi');
  } catch (error: any) {
    console.error('❌ Silme hatası:', error);
    throw new Error(error.message);
  }
};

// Get patient photos for dietitian
export const getDietitianPatientPhotos = async (
  dietitianId: string,
  patientId: string
): Promise<MealPhoto[]> => {
  try {
    console.log('📸 Hasta fotoğrafları yükleniyor (Diyetisyen)...');

    const q = query(
      collection(db, PHOTOS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);
    console.log(`📊 Bulunan fotoğraf sayısı: ${querySnapshot.docs.length}`);

    const photos: MealPhoto[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log(`📸 Fotoğraf ID: ${doc.id}, photoBase64 var mı: ${!!data.photoBase64}, photoUrl var mı: ${!!data.photoUrl}`);

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

    console.log(`✅ İşlenen fotoğraf sayısı: ${photos.length}`);
    return photos.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error: any) {
    console.error('❌ Fotoğraflar yükleme hatası:', error);
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
    console.log('✅ Fotoğraf güncellendi');
  } catch (error: any) {
    console.error('❌ Güncelleme hatası:', error);
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
    console.log('✅ Diyetisyen cevabı eklendi');

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
                console.log('✅ Danışana bildirim gönderildi');
              } catch (notifError) {
                console.error('⚠️ Bildirim gönderme hatası (kritik değil):', notifError);
              }
            } else {
              console.log('⚠️ Danışan push token\'ı yok');
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Cevap ekleme hatası:', error);
    throw new Error(error.message);
  }
};