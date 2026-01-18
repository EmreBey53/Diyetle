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
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDietitianPatientPhotos, addDietitianResponseToPhoto } from '../services/photoService';
import { getCurrentUser } from '../services/authService';
import { MealPhoto } from '../models/MealPhoto';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { type: MealType; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Kahvaltı' },
  { type: 'lunch', emoji: '☀️', label: 'Öğle Yemeği' },
  { type: 'dinner', emoji: '🌙', label: 'Akşam Yemeği' },
  { type: 'snack', emoji: '🍎', label: 'Ara Öğün' },
];

export default function DietitianMealPhotosScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<MealPhoto | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [selectedMealFilter, setSelectedMealFilter] = useState<MealType | 'all'>('all');
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.id) {
        await loadPhotos(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadPhotos = async (dietitianId: string) => {
    try {
      setLoading(true);
      console.log('📸 Loading photos for patient:', patientId, 'dietitian:', dietitianId);
      const photosList = await getDietitianPatientPhotos(dietitianId, patientId);
      console.log('✅ Photos loaded:', photosList.length);
      setPhotos(photosList);
    } catch (error) {
      console.error('❌ Error loading photos:', error);
      Alert.alert('Hata', 'Fotoğraflar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser?.id) {
      await loadPhotos(currentUser.id);
    }
    setRefreshing(false);
  };

  const filteredPhotos = selectedMealFilter === 'all' 
    ? photos 
    : photos.filter(p => p.mealType === selectedMealFilter);

  const mealStats = {
    breakfast: photos.filter(p => p.mealType === 'breakfast').length,
    lunch: photos.filter(p => p.mealType === 'lunch').length,
    dinner: photos.filter(p => p.mealType === 'dinner').length,
    snack: photos.filter(p => p.mealType === 'snack').length,
  };

  return (
    <View style={styles.container}>
      {/* Header - sadece patient name */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{patientName}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>📊 İstatistikler</Text>
          <View style={styles.statsGrid}>
            {MEAL_TYPES.map((meal) => (
              <View key={meal.type} style={styles.statCard}>
                <Text style={styles.statEmoji}>{meal.emoji}</Text>
                <Text style={styles.statValue}>{mealStats[meal.type as MealType]}</Text>
                <Text style={styles.statLabel}>{meal.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Öğün Türüne Göre Filtrele</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedMealFilter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedMealFilter('all')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedMealFilter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                Tümü ({photos.length})
              </Text>
            </TouchableOpacity>

            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal.type}
                style={[
                  styles.filterButton,
                  selectedMealFilter === meal.type && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedMealFilter(meal.type)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedMealFilter === meal.type && styles.filterButtonTextActive,
                  ]}
                >
                  {meal.emoji} {meal.label} ({mealStats[meal.type]})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Photos Section */}
        <View style={styles.photosSection}>
          <Text style={styles.photosTitle}>
            📸 Fotoğraflar ({filteredPhotos.length})
          </Text>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#65C18C" />
            </View>
          ) : filteredPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Bu öğün türüne ait fotoğraf bulunmamaktadır</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filteredPhotos}
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
                  <View style={styles.photoOverlay}>
                    <View style={styles.photoInfo}>
                      <Text style={styles.photoMealType}>
                        {MEAL_TYPES.find((m) => m.type === item.mealType)?.emoji}{' '}
                        {item.mealName}
                      </Text>
                      <Text style={styles.photoConfidence}>
                        {item.confidence}% emin
                      </Text>
                      <Text style={styles.photoDate}>
                        {new Date(item.uploadedAt).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Photo Detail Modal */}
      <Modal
        visible={showPhotoDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoDetail(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fotoğraf Detayı</Text>
              <TouchableOpacity onPress={() => setShowPhotoDetail(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedPhoto && (
              <ScrollView
                style={styles.detailContent}
                keyboardShouldPersistTaps="handled"
              >
                <Image
                  source={{ uri: selectedPhoto.photoUrl }}
                  style={styles.detailImage}
                  resizeMode="contain"
                />

                <View style={styles.detailInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Öğün Türü:</Text>
                    <Text style={styles.infoValue}>
                      {MEAL_TYPES.find((m) => m.type === selectedPhoto.mealType)?.label}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Yemek Adı:</Text>
                    <Text style={styles.infoValue}>{selectedPhoto.mealName}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>AI Güven Oranı:</Text>
                    <Text style={styles.infoValue}>%{selectedPhoto.confidence}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tarih:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedPhoto.uploadedAt).toLocaleDateString(
                        'tr-TR',
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </Text>
                  </View>

                  {selectedPhoto.detectedLabels && selectedPhoto.detectedLabels.length > 0 && (
                    <View style={styles.labelsBox}>
                      <Text style={styles.labelsTitle}>🏷️ Tespit Edilen Yiyecekler:</Text>
                      <View style={styles.labelsList}>
                        {selectedPhoto.detectedLabels.map((label: string, index: number) => (
                          <View key={index} style={styles.labelTag}>
                            <Text style={styles.labelTagText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedPhoto.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>💬 Danışan Mesajı:</Text>
                      <Text style={styles.notesText}>{selectedPhoto.notes}</Text>
                    </View>
                  )}

                  {/* Dietitian Response Section */}
                  {selectedPhoto.dietitianResponse && (
                    <View style={styles.responseBox}>
                      <Text style={styles.responseLabel}>✅ Cevabınız:</Text>
                      <Text style={styles.responseText}>{selectedPhoto.dietitianResponse}</Text>
                      <Text style={styles.responseDate}>
                        {new Date(selectedPhoto.respondedAt!).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Response Input Section - Only show if there's a message and no response yet */}
                  {selectedPhoto.notes && !selectedPhoto.dietitianResponse && (
                    <View style={styles.responseInputBox}>
                      <Text style={styles.responseInputLabel}>📝 Danışana Cevap Gönder:</Text>
                      <TextInput
                        style={styles.responseInput}
                        placeholder="Cevabınızı yazın..."
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        value={responseText}
                        onChangeText={setResponseText}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendButton,
                          (!responseText.trim() || isSubmitting) && styles.sendButtonDisabled,
                        ]}
                        onPress={async () => {
                          if (!selectedPhoto || !responseText.trim() || isSubmitting) return;

                          try {
                            setIsSubmitting(true);
                            await addDietitianResponseToPhoto(selectedPhoto.id, responseText);
                            setResponseText('');
                            Alert.alert('Başarılı', 'Cevabınız gönderildi');
                            if (currentUser?.id) {
                              await loadPhotos(currentUser.id);
                            }
                            // Modal'ı kapat
                            setShowPhotoDetail(false);
                          } catch (error) {
                            Alert.alert('Hata', 'Cevap gönderilirken hata oluştu');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={!responseText.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.sendButtonText}>Cevabı Gönder</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#65C18C',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#65C18C',
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#65C18C',
    borderColor: '#65C18C',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  photosSection: {
    backgroundColor: '#fff',
    padding: 16,
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  photoGrid: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoCard: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  photoImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  photoInfo: {
    flex: 1,
  },
  photoMealType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  photoConfidence: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  photoDate: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.7,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModal: {
    backgroundColor: '#fff',
    marginTop: 40,
    marginHorizontal: 10,
    borderRadius: 20,
    flex: 1,
    maxHeight: '90%',
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
  labelsBox: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  labelsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  labelTag: {
    backgroundColor: '#E0F2E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  labelTagText: {
    color: '#65C18C',
    fontSize: 11,
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
  actionSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  actionButtonWarning: {
    backgroundColor: '#FFF3E0',
  },
  actionButtonDanger: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  responseBox: {
    marginTop: 16,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 6,
  },
  responseText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    marginBottom: 6,
  },
  responseDate: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  responseInputBox: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  responseInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  responseInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#333',
    minHeight: 100,
    marginBottom: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#65C18C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});