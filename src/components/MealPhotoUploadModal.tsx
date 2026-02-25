import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import {
  requestCameraPermission,
  requestGalleryPermission,
  analyzeFoodImage,
  uploadMealPhoto,
} from '../services/photoService';

interface MealPhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  onUploadSuccess?: () => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { type: MealType; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Kahvaltı' },
  { type: 'lunch', emoji: '☀️', label: 'Öğle Yemeği' },
  { type: 'dinner', emoji: '🌙', label: 'Akşam Yemeği' },
  { type: 'snack', emoji: '🍎', label: 'Ara Öğün' },
];

export default function MealPhotoUploadModal({
  visible,
  onClose,
  patientId,
  onUploadSuccess,
}: MealPhotoUploadModalProps) {
  
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [step, setStep] = useState<'menu' | 'camera' | 'preview'>('menu');
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [mealName, setMealName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [detectedLabels, setDetectedLabels] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);

  const resetState = () => {
    setStep('menu');
    setSelectedMealType(null);
    setPhotoUri('');
    setPhotoBase64('');
    setMealName('');
    setMessage('');
    setDetectedLabels([]);
    setConfidence(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTakePhoto = async () => {
    try {
      
      const hasPermission = await requestCameraPermission();
      
      if (!hasPermission) {
        Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekmektedir.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });


      if (!result.canceled && result.assets[0]) {
        await processPhoto(result.assets[0].uri, result.assets[0].base64 || '');
      } else {
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Fotoğraf çekerken hata oluştu: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  const handlePickPhoto = async () => {
    try {
      
      const hasPermission = await requestGalleryPermission();
      
      if (!hasPermission) {
        Alert.alert('İzin Gerekli', 'Galeriye erişmek için izin vermeniz gerekmektedir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });


      if (!result.canceled && result.assets[0]) {
        await processPhoto(result.assets[0].uri, result.assets[0].base64 || '');
      } else {
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Galeri açılırken hata oluştu: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  const processPhoto = async (uri: string, base64: string) => {
    setPhotoUri(uri);
    setPhotoBase64(base64);
    setStep('preview');
    setIsAnalyzing(true);

    try {
      const result = await analyzeFoodImage(base64);
      if (result.success && result.data) {
        setDetectedLabels(result.data.foodItems);
        setConfidence(result.data.confidence);

        if (!result.data.isFood) {
          Alert.alert(
            'Uyarı',
            'Bu fotoğraf bir yemek görüntüsü değil gibi görünüyor. Yine de göndermek ister misiniz?',
            [
              { text: 'İptal', onPress: () => setStep('menu'), style: 'cancel' },
              { text: 'Gönder', onPress: () => {} },
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Uyarı', 'Fotoğraf analiz edilemedi, ancak yine de gönderebilirsiniz.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedMealType || !mealName.trim() || !photoBase64) {
      Alert.alert('Eksik Bilgi', 'Lütfen öğün türü ve yemek adı giriniz.');
      return;
    }

    try {
      setIsUploading(true);
      await uploadMealPhoto(
        patientId,
        photoUri,
        photoBase64,
        selectedMealType,
        mealName,
        detectedLabels,
        confidence,
        message
      );

      Alert.alert('Başarılı', 'Öğün fotoğrafınız gönderildi!');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      handleClose();
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf gönderilirken hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {step === 'menu' && '📸 Öğün Fotoğrafı Gönder'}
              {step === 'camera' && 'Fotoğraf Seç'}
              {step === 'preview' && 'Fotoğraf Önizleme'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'menu' && (
              <View style={styles.menuContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Öğün Türü Seçin
                </Text>
                <View style={styles.mealTypeGrid}>
                  {MEAL_TYPES.map((meal) => (
                    <TouchableOpacity
                      key={meal.type}
                      style={[
                        styles.mealTypeButton,
                        { backgroundColor: colors.background },
                        selectedMealType === meal.type && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => setSelectedMealType(meal.type)}
                    >
                      <Text style={styles.mealTypeEmoji}>{meal.emoji}</Text>
                      <Text
                        style={[
                          styles.mealTypeLabel,
                          { color: colors.text },
                          selectedMealType === meal.type && { color: colors.white },
                        ]}
                      >
                        {meal.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                  Fotoğraf Kaynağı
                </Text>
                <TouchableOpacity
                  style={[styles.sourceButton, { backgroundColor: colors.primary }]}
                  onPress={handleTakePhoto}
                  disabled={!selectedMealType}
                >
                  <Ionicons name="camera" size={24} color={colors.white} />
                  <Text style={[styles.sourceButtonText, { color: colors.white }]}>
                    Fotoğraf Çek
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sourceButton, { backgroundColor: colors.primary }]}
                  onPress={handlePickPhoto}
                  disabled={!selectedMealType}
                >
                  <Ionicons name="images" size={24} color={colors.white} />
                  <Text style={[styles.sourceButtonText, { color: colors.white }]}>
                    Galeriden Seç
                  </Text>
                </TouchableOpacity>

                {!selectedMealType && (
                  <Text style={[styles.hintText, { color: colors.textLight }]}>
                    * Önce öğün türü seçiniz
                  </Text>
                )}
              </View>
            )}

            {step === 'preview' && (
              <View style={styles.previewContainer}>
                {/* Photo Preview */}
                <Image source={{ uri: photoUri }} style={styles.previewImage} />

                {/* Analysis Status */}
                {isAnalyzing && (
                  <View style={styles.analyzingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.analyzingText, { color: colors.text }]}>
                      Fotoğraf analiz ediliyor...
                    </Text>
                  </View>
                )}

                {/* Detected Labels */}
                {!isAnalyzing && detectedLabels.length > 0 && (
                  <View style={styles.labelsBox}>
                    <Text style={[styles.labelsTitle, { color: colors.text }]}>
                      🏷️ Tespit Edilen: ({confidence}% emin)
                    </Text>
                    <View style={styles.labelsList}>
                      {detectedLabels.map((label, index) => (
                        <View key={index} style={[styles.labelTag, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.labelText, { color: colors.primary }]}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Meal Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Yemek Adı *
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Örn: Izgara Tavuk, Salata"
                    placeholderTextColor={colors.textLight}
                    value={mealName}
                    onChangeText={setMealName}
                  />
                </View>

                {/* Message Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Diyetisyene Mesaj (İsteğe Bağlı)
                  </Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Sorunuz veya notunuz varsa buraya yazabilirsiniz..."
                    placeholderTextColor={colors.textLight}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => setStep('menu')}
                    disabled={isUploading}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      Değiştir
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                      (!mealName.trim() || isUploading) && styles.primaryButtonDisabled,
                    ]}
                    onPress={handleUpload}
                    disabled={!mealName.trim() || isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color={colors.white} />
                        <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                          Gönder
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: '85%',
  },
  menuContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeButton: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  mealTypeEmoji: {
    fontSize: 32,
  },
  mealTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  sourceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  previewContainer: {
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  analyzingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  analyzingText: {
    fontSize: 13,
  },
  labelsBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  labelsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
