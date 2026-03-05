import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { analyzeFoodImage, uploadMealPhoto, getPatientMealPhotos, deleteMealPhoto } from '../services/photoService';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { checkAndAwardBadges, BadgeDef } from '../services/badgeService';
import BadgeCelebrationModal from '../components/BadgeCelebrationModal';
import { MealPhoto } from '../models/MealPhoto';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { type: MealType; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Kahvaltı' },
  { type: 'lunch', emoji: '☀️', label: 'Öğle Yemeği' },
  { type: 'dinner', emoji: '🌙', label: 'Akşam Yemeği' },
  { type: 'snack', emoji: '🍎', label: 'Ara Öğün' },
];

// ── Animasyonlu tarama bileşeni ─────────────────────────────────────────────
const ScanAnimation = () => {
  const scanY = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const dotOpacities = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Tarama çizgisi yukarı-aşağı
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Merkez pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Dalgalanma halkaları
    const ringAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    ringAnim(ring1, 0).start();
    ringAnim(ring2, 600).start();
    ringAnim(ring3, 1200).start();

    // Nokta animasyonu (yükleniyor ...)
    const dotAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(900),
          Animated.timing(val, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    dotAnim(dotOpacities[0], 0).start();
    dotAnim(dotOpacities[1], 300).start();
    dotAnim(dotOpacities[2], 600).start();
  }, []);

  const scanTranslateY = scanY.interpolate({ inputRange: [0, 1], outputRange: [-70, 70] });

  return (
    <View style={scanStyles.wrap}>
      {/* Halka animasyonları */}
      {[ring1, ring2, ring3].map((r, i) => (
        <Animated.View
          key={i}
          style={[
            scanStyles.ring,
            {
              opacity: r.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.6, 0] }),
              transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
            },
          ]}
        />
      ))}

      {/* Merkez kutu */}
      <Animated.View style={[scanStyles.box, { transform: [{ scale: pulseScale }] }]}>
        {/* Köşe çerçeveleri */}
        <View style={[scanStyles.corner, scanStyles.cornerTL]} />
        <View style={[scanStyles.corner, scanStyles.cornerTR]} />
        <View style={[scanStyles.corner, scanStyles.cornerBL]} />
        <View style={[scanStyles.corner, scanStyles.cornerBR]} />

        {/* Tarama çizgisi */}
        <Animated.View style={[scanStyles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}>
          <View style={scanStyles.scanLineGlow} />
        </Animated.View>

        {/* Merkez ikon */}
        <View style={scanStyles.centerIcon}>
          <Text style={scanStyles.centerEmoji}>🔬</Text>
        </View>
      </Animated.View>

      {/* Yükleniyor yazısı + nokta animasyonu */}
      <View style={scanStyles.dotsRow}>
        <Text style={scanStyles.loadingLabel}>Yapay Zeka Analiz Ediyor</Text>
        {dotOpacities.map((op, i) => (
          <Animated.Text key={i} style={[scanStyles.dot, { opacity: op }]}>•</Animated.Text>
        ))}
      </View>
    </View>
  );
};

const scanStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: '#34d399',
  },
  box: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: 'rgba(52,211,153,0.06)',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#34d399',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  scanLineGlow: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(52,211,153,0.2)',
  },
  centerIcon: {
    zIndex: 2,
  },
  centerEmoji: {
    fontSize: 36,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 2,
  },
  loadingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e2e8f0',
    marginRight: 4,
  },
  dot: {
    fontSize: 18,
    color: '#34d399',
    lineHeight: 20,
  },
});

// ── Yükleniyor overlay animasyonu ────────────────────────────────────────────
const UploadAnimation = () => {
  const spin = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.timing(progress, { toValue: 0.85, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={upStyles.wrap}>
      <Animated.View style={[upStyles.spinner, { transform: [{ rotate }] }]}>
        <View style={upStyles.spinnerArc} />
      </Animated.View>
      <Text style={upStyles.title}>Fotoğraf Yükleniyor</Text>
      <Text style={upStyles.sub}>Lütfen bekleyin...</Text>
      <View style={upStyles.track}>
        <Animated.View style={[upStyles.fill, { width: barWidth }]} />
      </View>
    </View>
  );
};

const upStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  spinner: {
    width: 60,
    height: 60,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerArc: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#34d399',
    borderRightColor: 'rgba(52,211,153,0.3)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 20,
  },
  track: {
    width: 200,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});

// ────────────────────────────────────────────────────────────────────────────

const uriToBase64 = async (uri: string): Promise<string> => {
  let readUri = uri;
  if (uri.startsWith('ph://') || uri.includes('assets-library')) {
    const tempUri = FileSystem.cacheDirectory + 'temp_photo_' + Date.now() + '.jpg';
    await FileSystem.copyAsync({ from: uri, to: tempUri });
    readUri = tempUri;
  }
  const base64 = await FileSystem.readAsStringAsync(readUri, { encoding: 'base64' as any });
  return base64;
};

export default function PatientMealPhotoScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors, isDark);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [mealName, setMealName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);   // sadece AI analiz
  const [isUploading, setIsUploading] = useState(false);   // sadece Firestore/Storage yükleme
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MealPhoto | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [tempBase64, setTempBase64] = useState<string>('');
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeDef | null>(null);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.id) {
        const profile = await getPatientProfileByUserId(user.id);
        setPatientProfile(profile);
        const patientIdToUse = profile?.id || user.id;
        await loadPhotos(patientIdToUse);
      }
    } catch (_) {}
  };

  const loadPhotos = async (patientId: string) => {
    try {
      setLoading(true);
      const photosList = await getPatientMealPhotos(patientId);
      setPhotos(photosList);
    } catch (error: any) {
      if (error?.code === 'permission-denied') Alert.alert('Hata', 'Fotoğraflara erişim izni yok.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { requestGalleryPermission } = await import('../services/photoService');
      if (!(await requestGalleryPermission())) { Alert.alert('Hata', 'Galeri erişimi için izin gereklidir'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: false, quality: 0.5, base64: false });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        const base64Data = await uriToBase64(asset.uri);
        setTempBase64(base64Data || '');
        setMessageText('');
        await analyzeImage(base64Data || '');
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Fotoğraf seçilirken hata oluştu: ' + (error?.message || String(error)));
    }
  };

  const takePhoto = async () => {
    try {
      const { requestCameraPermission } = await import('../services/photoService');
      if (!(await requestCameraPermission())) { Alert.alert('Hata', 'Kamera erişimi için izin gereklidir'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, allowsEditing: false, quality: 0.5, base64: false });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        const base64Data = await uriToBase64(asset.uri);
        setTempBase64(base64Data || '');
        setMessageText('');
        await analyzeImage(base64Data || '');
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Fotoğraf çekilirken hata oluştu: ' + (error?.message || String(error)));
    }
  };

  const analyzeImage = async (base64: string) => {
    try {
      setAnalysisResult(null);
      setIsAnalyzing(true);
      setShowAnalysisModal(true);
      const result = await analyzeFoodImage(base64);
      setAnalysisResult(result);
    } catch (_) {
      setShowAnalysisModal(false);
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
      setIsUploading(true);

      // Günlük 5 fotoğraf limiti
      const todayStr = new Date().toISOString().split('T')[0];
      const todayStart = new Date(todayStr).getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;
      const todayPhotos = photos.filter(p => p.uploadedAt >= todayStart && p.uploadedAt < todayEnd);
      if (todayPhotos.length >= 5) {
        Alert.alert('Günlük Limit', 'Günde en fazla 5 fotoğraf gönderebilirsiniz.');
        return;
      }

      const patientIdToUse = patientProfile?.id || currentUser?.id;
      if (!patientIdToUse) throw new Error('Patient ID not found');

      await uploadMealPhoto(
        patientIdToUse, selectedImage, tempBase64,
        selectedMealType, mealName || 'Yemek',
        analysisResult.data.foodItems, analysisResult.data.confidence, messageText
      );

      setSelectedImage(null);
      setMealName('');
      setMessageText('');
      setShowAnalysisModal(false);
      await loadPhotos(patientIdToUse);

      const newBadges = await checkAndAwardBadges(currentUser.id).catch(() => []);
      if (newBadges.length > 0) {
        setCelebrationBadge(newBadges[0]);
      } else {
        Alert.alert('Başarılı', 'Fotoğraf başarıyla yüklendi!');
      }
    } catch (_) {
      Alert.alert('Hata', 'Fotoğraf yüklenirken hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = (photo: MealPhoto) => {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await deleteMealPhoto(photo.id, photo.storagePath);
            if (patientProfile?.id) await loadPhotos(patientProfile.id);
            setShowPhotoDetail(false);
            Alert.alert('Başarılı', 'Fotoğraf silindi');
          } catch (_) {
            Alert.alert('Hata', 'Fotoğraf silinirken hata oluştu');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <BadgeCelebrationModal
        badge={celebrationBadge}
        visible={!!celebrationBadge}
        onClose={() => { setCelebrationBadge(null); Alert.alert('Başarılı', 'Fotoğraf başarıyla yüklendi!'); }}
      />

      <ScrollView style={styles.content}>
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Yeni Fotoğraf Ekle</Text>

          <View style={styles.mealTypeContainer}>
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal.type}
                style={[styles.mealTypeButton, selectedMealType === meal.type && styles.mealTypeButtonActive]}
                onPress={() => setSelectedMealType(meal.type)}
              >
                <Text style={styles.mealTypeEmoji}>{meal.emoji}</Text>
                <Text style={[styles.mealTypeLabel, selectedMealType === meal.type && styles.mealTypeLabelActive]}>
                  {meal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.buttonText}>Fotoğraf Çek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
              <Ionicons name="image" size={22} color="#fff" />
              <Text style={styles.buttonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Photos Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📷 Yüklenen Fotoğraflar ({photos.length})</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#34d399" style={{ marginVertical: 24 }} />
          ) : photos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={64} color={isDark ? '#334155' : '#ddd'} />
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
                  onPress={() => { setSelectedPhoto(item); setShowPhotoDetail(true); }}
                >
                  <Image source={{ uri: item.photoUrl }} style={styles.photoImage} resizeMode="cover" />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoMealType}>
                      {MEAL_TYPES.find(m => m.type === item.mealType)?.emoji} {item.mealName}
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

      {/* ── Analiz Modalı (tam ekran bottom sheet) ── */}
      <Modal visible={showAnalysisModal} transparent animationType="slide" onRequestClose={() => { if (!isAnalyzing && !isUploading) setShowAnalysisModal(false); }}>
        <View style={styles.analysisOverlay}>
          <View style={styles.analysisSheet}>

            {/* Drag handle */}
            <View style={styles.sheetHandle} />

            {/* Header: thumbnail + başlık + kapat */}
            <View style={styles.sheetHeader}>
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.thumbnail} resizeMode="cover" />
              )}
              <View style={styles.sheetHeaderText}>
                <View style={styles.aiDotRow}>
                  <View style={[styles.aiDot, isAnalyzing && styles.aiDotPulse]} />
                  <Text style={styles.sheetTitle}>AI Yemek Analizi</Text>
                </View>
                <Text style={styles.sheetSub}>
                  {isUploading ? 'Yükleniyor...' : isAnalyzing ? 'Analiz ediliyor...' : analysisResult?.data?.isFood ? '✓ Tamamlandı' : analysisResult ? '✗ Tespit edilemedi' : ''}
                </Text>
              </View>
              {!isAnalyzing && !isUploading && (
                <TouchableOpacity onPress={() => setShowAnalysisModal(false)} style={styles.sheetCloseBtn}>
                  <Ionicons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* İçerik */}
            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {isUploading ? (
                <UploadAnimation />
              ) : isAnalyzing ? (
                <>
                  <ScanAnimation />
                  <View style={styles.stepsBox}>
                    <StepRow emoji="🔍" text="Görsel işleniyor" done={false} />
                    <StepRow emoji="🤖" text="Yemek tanıma çalışıyor" done={false} />
                    <StepRow emoji="📊" text="Besin analizi hesaplanıyor" done={false} />
                  </View>
                </>
              ) : analysisResult?.success && analysisResult?.data?.isFood && analysisResult?.data?.confidence >= 90 ? (
                /* ── Başarı ── */
                <>
                  <View style={styles.successSection}>
                    <View style={styles.successIconWrap}>
                      <View style={styles.successIconRing} />
                      <Ionicons name="checkmark-circle" size={52} color="#34d399" />
                    </View>
                    <Text style={styles.successTitle}>Yemek Tespit Edildi!</Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>%{analysisResult.data.confidence} güven</Text>
                    </View>
                  </View>

                  <View style={styles.stepsBox}>
                    <StepRow emoji="🔍" text="Görsel işlendi" done />
                    <StepRow emoji="🤖" text="Yemek tanıma tamamlandı" done />
                    <StepRow emoji="📊" text="Besin analizi hazır" done />
                  </View>

                  <View style={styles.foodItemsSection}>
                    <Text style={styles.foodItemsTitle}>Tespit Edilen Yiyecekler</Text>
                    <View style={styles.foodTagsWrap}>
                      {analysisResult.data.foodItems.map((item: string, idx: number) => (
                        <View key={idx} style={styles.foodTag}>
                          <Text style={styles.foodTagText}>🍽 {item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Yorum alanı */}
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.commentBox}>
                    <Text style={styles.commentLabel}>💬 Diyetisyeninize yorum ekleyin (opsiyonel)</Text>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Yemek hakkında bir şeyler yazın..."
                      placeholderTextColor="#475569"
                      value={messageText}
                      onChangeText={setMessageText}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </KeyboardAvoidingView>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmUpload} activeOpacity={0.85}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>Fotoğrafı Gönder</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelLink} onPress={() => setShowAnalysisModal(false)}>
                    <Text style={styles.cancelLinkText}>İptal</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Hata ── */
                <>
                  <View style={styles.errorSection}>
                    <View style={styles.errorIconWrap}>
                      <View style={styles.errorIconRing} />
                      <Ionicons name="close-circle" size={52} color="#f87171" />
                    </View>
                    <Text style={styles.errorTitle}>Yemek Tespit Edilemedi</Text>
                    <Text style={styles.errorSub}>
                      {analysisResult?.data?.isFood && analysisResult?.data?.confidence < 90
                        ? `Güven oranı çok düşük: %${analysisResult.data.confidence}\nDaha net bir fotoğraf çekmeyi deneyin.`
                        : 'Fotoğrafta yemek bulunamadı. Yemeğin net göründüğü bir fotoğraf ekleyin.'}
                    </Text>
                  </View>

                  <View style={styles.tipsBox}>
                    <Text style={styles.tipsTitle}>💡 İpuçları</Text>
                    {['Yemeği yakından ve net çekin', 'İyi aydınlatılmış ortamda çekin', 'Yemek merkezde olsun'].map((t, i) => (
                      <Text key={i} style={styles.tipRow}>• {t}</Text>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.retryBtn} onPress={() => setShowAnalysisModal(false)}>
                    <Ionicons name="reload" size={18} color="#34d399" />
                    <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                  </TouchableOpacity>
                </>
              )}
              <View style={{ height: 32 }} />
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* ── Fotoğraf Detay Modalı ── */}
      <Modal visible={showPhotoDetail} transparent animationType="slide" onRequestClose={() => setShowPhotoDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Fotoğraf Detayı</Text>
              <TouchableOpacity onPress={() => setShowPhotoDetail(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            {selectedPhoto && (
              <ScrollView style={{ flex: 1 }}>
                <Image source={{ uri: selectedPhoto.photoUrl }} style={styles.detailImage} />
                <View style={styles.detailInfo}>
                  {[
                    { label: 'Öğün Türü', value: MEAL_TYPES.find(m => m.type === selectedPhoto.mealType)?.label },
                    { label: 'Yemek Adı', value: selectedPhoto.mealName },
                    { label: 'Güven Oranı', value: `%${selectedPhoto.confidence}` },
                    { label: 'Tarih', value: new Date(selectedPhoto.uploadedAt).toLocaleDateString('tr-TR') },
                  ].map(row => (
                    <View key={row.label} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{row.label}</Text>
                      <Text style={styles.infoValue}>{row.value}</Text>
                    </View>
                  ))}

                  {selectedPhoto.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>💬 Mesajınız:</Text>
                      <Text style={styles.notesText}>{selectedPhoto.notes}</Text>
                    </View>
                  )}

                  {selectedPhoto.dietitianResponse && (
                    <View style={styles.dietitianResponseBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="person-circle" size={20} color="#34d399" />
                        <Text style={styles.dietitianResponseTitle}>Diyetisyeninizin Cevabı</Text>
                      </View>
                      <Text style={styles.dietitianResponseText}>{selectedPhoto.dietitianResponse}</Text>
                      <Text style={styles.dietitianResponseDate}>
                        {new Date(selectedPhoto.respondedAt!).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  {selectedPhoto.notes && !selectedPhoto.dietitianResponse && (
                    <View style={styles.waitingBox}>
                      <Ionicons name="time-outline" size={20} color="#F59E0B" />
                      <Text style={styles.waitingText}>Diyetisyeninizin cevabı bekleniyor...</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePhoto(selectedPhoto)}>
                  <Ionicons name="trash" size={18} color="#f87171" />
                  <Text style={styles.deleteButtonText}>Fotoğrafı Sil</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ── Adım satırı ──────────────────────────────────────────────────────────────
function StepRow({ emoji, text, done }: { emoji: string; text: string; done: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: done ? '#34d399' : '#94a3b8', fontWeight: done ? '600' : '400' }}>{text}</Text>
      {done && <Ionicons name="checkmark-circle" size={16} color="#34d399" />}
    </View>
  );
}

// ── Stiller ──────────────────────────────────────────────────────────────────
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  section: { backgroundColor: colors.cardBackground, marginBottom: 12, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16 },

  mealTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  mealTypeButton: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, borderWidth: 2, borderColor: isDark ? '#334155' : '#e0e0e0', flex: 1, marginHorizontal: 3 },
  mealTypeButtonActive: { borderColor: '#34d399', backgroundColor: isDark ? 'rgba(52,211,153,0.1)' : '#E0F7F1' },
  mealTypeEmoji: { fontSize: 26, marginBottom: 4 },
  mealTypeLabel: { fontSize: 10, color: isDark ? '#64748b' : '#999', fontWeight: '500', textAlign: 'center' },
  mealTypeLabelActive: { color: '#34d399', fontWeight: '700' },

  buttonGroup: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, backgroundColor: '#059669', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#34d399', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: isDark ? '#475569' : '#999', marginTop: 12 },

  photoGrid: { justifyContent: 'space-between', marginBottom: 8 },
  photoCard: { width: '48%', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardBackground, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  photoImage: { width: '100%', height: 140 },
  photoInfo: { padding: 8 },
  photoMealType: { fontSize: 12, fontWeight: '600', color: colors.text },
  photoDate: { fontSize: 10, color: colors.textLight, marginTop: 3 },

  // ── Analiz modal (bottom sheet) ──────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  analysisOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  analysisSheet: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  thumbnail: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#1e293b' },
  sheetHeaderText: { flex: 1 },
  aiDotRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399', shadowColor: '#34d399', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
  aiDotPulse: { backgroundColor: '#fbbf24' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
  sheetSub: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  sheetBody: { flexGrow: 0 },
  sheetBodyContent: { paddingBottom: 8 },

  stepsBox: { marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: '#0f1923', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b' },

  successSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  successIconWrap: { position: 'relative', marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  successIconRing: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(52,211,153,0.12)' },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#e2e8f0', marginBottom: 8 },
  confidenceBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  confidenceText: { fontSize: 13, fontWeight: '700', color: '#34d399' },

  foodItemsSection: { marginHorizontal: 18, marginVertical: 12 },
  foodItemsTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 0.5 },
  foodTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foodTag: { backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  foodTagText: { color: '#34d399', fontSize: 12, fontWeight: '600' },

  commentBox: { marginHorizontal: 18, marginTop: 8, marginBottom: 4 },
  commentLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  commentInput: { backgroundColor: '#0f1923', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 12, fontSize: 13, color: '#e2e8f0', minHeight: 72 },

  confirmBtn: { marginHorizontal: 18, marginTop: 12, marginBottom: 4, backgroundColor: '#059669', paddingVertical: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#34d399', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelLink: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  cancelLinkText: { fontSize: 14, color: '#64748b' },

  errorSection: { alignItems: 'center', padding: 24 },
  errorIconWrap: { position: 'relative', marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  errorIconRing: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(248,113,113,0.1)' },
  errorTitle: { fontSize: 17, fontWeight: '800', color: '#f87171', marginBottom: 8, textAlign: 'center' },
  errorSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  tipsBox: { alignSelf: 'stretch', backgroundColor: '#0f1923', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
  tipRow: { fontSize: 12, color: '#94a3b8', marginBottom: 4, lineHeight: 18 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#34d399', paddingVertical: 13, paddingHorizontal: 24, borderRadius: 14 },
  retryBtnText: { color: '#34d399', fontWeight: '700', fontSize: 15 },

  // ── Detay modal ──────────────────────────────────────────────────────────
  detailModal: { backgroundColor: colors.cardBackground, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24, flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  detailImage: { width: '100%', height: 280 },
  detailInfo: { padding: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '500' },
  notesBox: { marginTop: 16, backgroundColor: isDark ? '#0f1923' : '#f9f9f9', padding: 14, borderRadius: 10 },
  notesLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 },
  notesText: { fontSize: 13, color: colors.textLight, lineHeight: 18 },
  dietitianResponseBox: { marginTop: 16, backgroundColor: isDark ? 'rgba(52,211,153,0.08)' : '#E8F5E9', padding: 14, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#34d399' },
  dietitianResponseTitle: { fontSize: 13, fontWeight: '700', color: '#34d399' },
  dietitianResponseText: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 },
  dietitianResponseDate: { fontSize: 11, color: colors.textLight, fontStyle: 'italic' },
  waitingBox: { marginTop: 16, backgroundColor: isDark ? '#1a1000' : '#FFF3E0', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitingText: { fontSize: 13, color: '#F59E0B', fontWeight: '500' },
  deleteButton: { backgroundColor: isDark ? '#1a0000' : '#ffe0e0', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 18, marginBottom: 18 },
  deleteButtonText: { color: '#f87171', fontWeight: '700', fontSize: 14 },

  // ── Mesaj modal ──────────────────────────────────────────────────────────
  messageModal: { width: '92%', borderRadius: 20, padding: 20, maxHeight: '55%' },
  messageLabel: { fontSize: 14, marginBottom: 12, marginTop: 4 },
  messageInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100 },
  messageButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  msgBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { fontSize: 15, fontWeight: '700' },
});
