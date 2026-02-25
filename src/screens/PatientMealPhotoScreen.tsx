import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  FlatList,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { analyzeFoodImage, uploadMealPhoto, getPatientMealPhotos, deleteMealPhoto } from '../services/photoService';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { MealPhoto } from '../models/MealPhoto';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { type: MealType; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Kahvaltı' },
  { type: 'lunch', emoji: '☀️', label: 'Öğle Yemeği' },
  { type: 'dinner', emoji: '🌙', label: 'Akşam Yemeği' },
  { type: 'snack', emoji: '🍎', label: 'Ara Öğün' },
];

const uriToBase64 = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw error;
  }
};

export default function PatientMealPhotoScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [mealName, setMealName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MealPhoto | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [tempBase64, setTempBase64] = useState<string>('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.id) {
        // Get patient profile by userId to get the patientId (document ID)
        const profile = await getPatientProfileByUserId(user.id);
        setPatientProfile(profile);
        
        // Patient profile varsa onun ID'sini kullan, yoksa user ID'yi kullan
        const patientIdToUse = profile?.id || user.id;
        await loadPhotos(patientIdToUse);
      }
    } catch (error) {
    }
  };

  const loadPhotos = async (patientId: string) => {
    try {
      setLoading(true);
      const photosList = await getPatientMealPhotos(patientId);
      setPhotos(photosList);
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraflar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { requestGalleryPermission } = await import('../services/photoService');
      const hasPermission = await requestGalleryPermission();

      if (!hasPermission) {
        Alert.alert('Hata', 'Galeri erişimi için izin gereklidir');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);

        // Base64 varsa kullan, yoksa URI'den çevir
        let base64Data = asset.base64;

        if (!base64Data) {
          base64Data = await uriToBase64(asset.uri);
        }

        // Base64'ü geçici olarak sakla ve mesaj modalını aç
        setTempBase64(base64Data || '');
        setMessageText('');
        setShowMessageModal(true);
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf seçilirken hata oluştu');
    }
  };

  const takePhoto = async () => {
    try {
      const { requestCameraPermission } = await import('../services/photoService');
      const hasPermission = await requestCameraPermission();

      if (!hasPermission) {
        Alert.alert('Hata', 'Kamera erişimi için izin gereklidir');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);

        // Base64 varsa kullan, yoksa URI'den çevir
        let base64Data = asset.base64;

        if (!base64Data) {
          base64Data = await uriToBase64(asset.uri);
        }

        // Base64'ü geçici olarak sakla ve mesaj modalını aç
        setTempBase64(base64Data || '');
        setMessageText('');
        setShowMessageModal(true);
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf çekilirken hata oluştu');
    }
  };

  const handleMessageSubmit = async () => {
    setShowMessageModal(false);
    await analyzeImage(tempBase64);
  };

  const handleMessageSkip = async () => {
    setMessageText('');
    setShowMessageModal(false);
    await analyzeImage(tempBase64);
  };

  const analyzeImage = async (base64: string) => {
    try {
      setIsAnalyzing(true);
      const result = await analyzeFoodImage(base64);
      setAnalysisResult(result);
      setShowAnalysisModal(true);
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf analiz edilirken hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedImage || !analysisResult?.data?.isFood || !currentUser) {
      Alert.alert('Hata', 'Lütfen geçerli bir yemek fotoğrafı seçiniz');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      // Get base64 from image
      let base64Data = await uriToBase64(selectedImage);

      // Upload photo - Use patientProfile.id if available, otherwise use currentUser.id
      const patientIdToUse = patientProfile?.id || currentUser?.id;
      
      if (!patientIdToUse) {
        throw new Error('Patient ID not found');
      }

      await uploadMealPhoto(
        patientIdToUse,
        selectedImage,
        base64Data,
        selectedMealType,
        mealName || 'Yemek',
        analysisResult.data.foodItems,
        analysisResult.data.confidence,
        messageText
      );

      Alert.alert('Başarılı', 'Fotoğraf başarıyla yüklendi!', [
        {
          text: 'Tamam',
          onPress: async () => {
            setSelectedImage(null);
            setMealName('');
            setMessageText('');
            setShowAnalysisModal(false);
            // Reload photos with the same ID used for upload
            await loadPhotos(patientIdToUse);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf yüklenirken hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeletePhoto = (photo: MealPhoto) => {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı silmek istediğinizden emin misiniz?', [
      { text: 'İptal', onPress: () => {}, style: 'cancel' },
      {
        text: 'Sil',
        onPress: async () => {
          try {
            await deleteMealPhoto(photo.id, photo.storagePath);
            if (patientProfile?.id) {
              await loadPhotos(patientProfile.id);
            }
            setShowPhotoDetail(false);
            Alert.alert('Başarılı', 'Fotoğraf silindi');
          } catch (error) {
            Alert.alert('Hata', 'Fotoğraf silinirken hata oluştu');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={styles.container}>

      <ScrollView style={styles.content}>
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Yeni Fotoğraf Ekle</Text>

          {/* Meal Type Selection */}
          <View style={styles.mealTypeContainer}>
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal.type}
                style={[
                  styles.mealTypeButton,
                  selectedMealType === meal.type && styles.mealTypeButtonActive,
                ]}
                onPress={() => setSelectedMealType(meal.type)}
              >
                <Text style={styles.mealTypeEmoji}>{meal.emoji}</Text>
                <Text
                  style={[
                    styles.mealTypeLabel,
                    selectedMealType === meal.type && styles.mealTypeLabelActive,
                  ]}
                >
                  {meal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Image Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={takePhoto}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.buttonText}>Fotoğraf Çek</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickImage}
            >
              <Ionicons name="image" size={24} color="#fff" />
              <Text style={styles.buttonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Photos Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📷 Yüklenen Fotoğraflar ({photos.length})</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#65C18C" />
          ) : photos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Henüz fotoğraf yüklemediniz</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={photos}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.photoGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.photoCard}
                  onPress={() => {
                    setSelectedPhoto(item);
                    setShowPhotoDetail(true);
                  }}
                >
                  <Image
                    source={{ uri: item.photoUrl }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoMealType}>
                      {MEAL_TYPES.find((m) => m.type === item.mealType)?.emoji}{' '}
                      {item.mealName}
                    </Text>
                    <Text style={styles.photoDate}>
                      {new Date(item.uploadedAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Analysis Result Modal */}
      <Modal
        visible={showAnalysisModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.analysisModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fotoğraf Analizi</Text>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {isAnalyzing ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#65C18C" />
                <Text style={styles.analyzeText}>Fotoğraf analiz ediliyor...</Text>
              </View>
            ) : analysisResult?.data?.isFood ? (
              <View style={styles.resultContent}>
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                  <Text style={styles.successText}>Yemek Tespit Edildi!</Text>
                  <Text style={styles.confidenceText}>
                    Güven Oranı: %{analysisResult.data.confidence}
                  </Text>
                </View>

                <View style={styles.detectedItemsBox}>
                  <Text style={styles.detectedTitle}>Tespit Edilen Yiyecekler:</Text>
                  <View style={styles.foodItemsContainer}>
                    {analysisResult.data.foodItems.map((item: string, index: number) => (
                      <View key={index} style={styles.foodTag}>
                        <Text style={styles.foodTagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmUpload}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={20} color="#fff" />
                      <Text style={styles.confirmButtonText}>Yükle</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resultContent}>
                <View style={styles.errorBox}>
                  <Ionicons name="close-circle" size={60} color="#ff6b6b" />
                  <Text style={styles.errorText}>Yemek Tespit Edilemedi</Text>
                  <Text style={styles.errorSubtext}>
                    Lütfen açık ve net bir yemek fotoğrafı seçiniz
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setShowAnalysisModal(false)}
                >
                  <Ionicons name="reload" size={20} color="#65C18C" />
                  <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal
        visible={showPhotoDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fotoğraf Detayı</Text>
              <TouchableOpacity onPress={() => setShowPhotoDetail(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedPhoto && (
              <ScrollView style={styles.detailContent}>
                <Image
                  source={{ uri: selectedPhoto.photoUrl }}
                  style={styles.detailImage}
                />

                <View style={styles.detailInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Öğün Türü:</Text>
                    <Text style={styles.infoValue}>
                      {MEAL_TYPES.find((m) => m.type === selectedPhoto.mealType)
                        ?.label}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Yemek Adı:</Text>
                    <Text style={styles.infoValue}>{selectedPhoto.mealName}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Güven Oranı:</Text>
                    <Text style={styles.infoValue}>%{selectedPhoto.confidence}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tarih:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedPhoto.uploadedAt).toLocaleDateString(
                        'tr-TR'
                      )}
                    </Text>
                  </View>

                  {selectedPhoto.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>💬 Mesajınız:</Text>
                      <Text style={styles.notesText}>{selectedPhoto.notes}</Text>
                    </View>
                  )}

                  {/* Dietitian Response - Show to patient */}
                  {selectedPhoto.dietitianResponse && (
                    <View style={styles.dietitianResponseBox}>
                      <View style={styles.dietitianResponseHeader}>
                        <Ionicons name="person-circle" size={20} color="#65C18C" />
                        <Text style={styles.dietitianResponseTitle}>Diyetisyeninizin Cevabı</Text>
                      </View>
                      <Text style={styles.dietitianResponseText}>
                        {selectedPhoto.dietitianResponse}
                      </Text>
                      <Text style={styles.dietitianResponseDate}>
                        {new Date(selectedPhoto.respondedAt!).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Waiting for response message */}
                  {selectedPhoto.notes && !selectedPhoto.dietitianResponse && (
                    <View style={styles.waitingBox}>
                      <Ionicons name="time-outline" size={20} color="#FF9800" />
                      <Text style={styles.waitingText}>
                        Diyetisyeninizin cevabı bekleniyor...
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePhoto(selectedPhoto)}
                >
                  <Ionicons name="trash" size={20} color="#ff6b6b" />
                  <Text style={styles.deleteButtonText}>Fotoğrafı Sil</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Message Input Modal */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.messageModal, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mesaj Ekle (Opsiyonel)</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.messageInputContainer}>
              <Text style={[styles.messageInputLabel, { color: colors.textLight }]}>
                Diyetisyeninize bir mesaj göndermek ister misiniz?
              </Text>
              <TextInput
                style={[styles.messageInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Mesajınızı buraya yazın..."
                placeholderTextColor={colors.textLight}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.messageModalButtons}>
              <TouchableOpacity
                style={[styles.messageModalButton, styles.skipButton, { backgroundColor: colors.background }]}
                onPress={handleMessageSkip}
              >
                <Text style={[styles.skipButtonText, { color: colors.textLight }]}>Atla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.messageModalButton, styles.sendButton, { backgroundColor: colors.primary }]}
                onPress={handleMessageSubmit}
              >
                <Text style={[styles.sendButtonText, { color: colors.white }]}>Devam Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mealTypeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flex: 1,
    marginHorizontal: 4,
  },
  mealTypeButtonActive: {
    borderColor: '#65C18C',
    backgroundColor: '#E0F2E9',
  },
  mealTypeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  mealTypeLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  mealTypeLabelActive: {
    color: '#65C18C',
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#65C18C',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  previewContainer: {
    position: 'relative',
    marginTop: 16,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  photoGrid: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoCard: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.background,
  },
  photoInfo: {
    padding: 8,
  },
  photoMealType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  photoDate: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisModal: {
    backgroundColor: '#fff',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
  detailModal: {
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeText: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
  },
  resultContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  successBox: {
    alignItems: 'center',
    marginVertical: 24,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 12,
  },
  confidenceText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  errorBox: {
    alignItems: 'center',
    marginVertical: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b6b',
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  detectedItemsBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
  },
  detectedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  foodItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodTag: {
    backgroundColor: '#65C18C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  foodTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#65C18C',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  retryButton: {
    borderWidth: 2,
    borderColor: '#65C18C',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#65C18C',
    fontWeight: '600',
    fontSize: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  detailInfo: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  infoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  notesBox: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#ffe0e0',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: '#ff6b6b',
    fontWeight: '600',
    fontSize: 14,
  },
  messageModal: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  messageInputContainer: {
    marginVertical: 16,
  },
  messageInputLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  messageModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  messageModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    // backgroundColor will be set inline
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dietitianResponseBox: {
    marginTop: 16,
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#65C18C',
  },
  dietitianResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dietitianResponseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  dietitianResponseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  dietitianResponseDate: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  waitingBox: {
    marginTop: 16,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitingText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
});