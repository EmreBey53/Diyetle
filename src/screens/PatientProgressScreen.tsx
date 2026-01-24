// src/screens/PatientProgressScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getProgressByPatient, createProgress, deleteProgress, getProgressStats, ProgressStats } from '../services/progressService';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { Progress, getBMICategoryColor, getBMICategory } from '../models/Progress';
import { colors } from '../constants/colors';

export default function PatientProgressScreen({ navigation }: any) {
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [currentHeight, setCurrentHeight] = useState(0);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProgress();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) return;

      const profile = await getPatientProfileByUserId(currentUser.id);
      
      if (!profile) return;

      setPatientId(profile.id!);
      setPatientName(profile.name);
      setCurrentHeight(profile.height || 170);

      const progressData = await getProgressByPatient(profile.id!);
      setProgressList(progressData);

      const statsData = await getProgressStats(profile.id!);
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ İlerleme yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  };

  const getChartData = () => {
    if (progressList.length === 0) return null;

    // Son 7 kayıt (veya mevcut olanlar)
    const recentProgress = progressList.slice(0, 7).reverse();

    const labels = recentProgress.map((item) => {
      const date = typeof item.recordDate === 'string' ? new Date(item.recordDate) : item.recordDate;
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    // NaN ve Infinity değerlerini filtrele
    const weights = recentProgress.map((item) => {
      const w = item.weight;
      return (typeof w === 'number' && isFinite(w) && !isNaN(w)) ? w : 0;
    });

    // En az bir geçerli veri yoksa null döndür
    if (weights.length === 0 || labels.length === 0) return null;

    return {
      labels,
      datasets: [
        {
          data: weights,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const handleSubmitProgress = async () => {
    if (!weight.trim()) {
      Alert.alert('Hata', 'Lütfen kilonuzu girin!');
      return;
    }

    const weightStr = weight.replace(',', '.');
    const weightNum = Number(weightStr);
    
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 300) {
      Alert.alert('Hata', 'Geçerli bir kilo değeri girin! (0-300 kg)');
      return;
    }

    setSubmitting(true);

    try {
      await createProgress({
        patientId,
        patientName,
        weight: weightNum,
        height: currentHeight,
        notes: notes.trim() || undefined,
        recordDate: new Date(),
      });

      Alert.alert('Başarılı!', 'Kilonuz kaydedildi!');
      setWeight('');
      setNotes('');
      setShowModal(false);
      loadProgress();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (progressId: string) => {
    Alert.alert(
      'Kaydı Sil',
      'Bu kaydı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgress(progressId);
              Alert.alert('Başarılı!', 'Kayıt silindi!');
              loadProgress();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderProgressItem = ({ item }: { item: Progress }) => (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressDate}>📅 {formatDate(item.recordDate)}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id!)}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBody}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Kilo:</Text>
          <Text style={styles.progressValue}>{item.weight} kg</Text>
        </View>

        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>BMI:</Text>
          <View style={[styles.bmiBadge, { backgroundColor: getBMICategoryColor(item.bmi) }]}>
            <Text style={styles.bmiText}>{item.bmi}</Text>
          </View>
        </View>

        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Kategori:</Text>
          <Text style={styles.progressValue}>{getBMICategory(item.bmi)}</Text>
        </View>
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>📝 {item.notes}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>İlerleme yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* İstatistikler */}
      {stats && stats.totalRecords > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Güncel Kilo</Text>
            <Text style={styles.statValue}>{stats.currentWeight} kg</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Değişim</Text>
            <Text style={[
              styles.statValue,
              { color: stats.weightChange! < 0 ? '#4CAF50' : stats.weightChange! > 0 ? '#F44336' : colors.text }
            ]}>
              {stats.weightChange! > 0 ? '+' : ''}{stats.weightChange} kg
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BMI</Text>
            <Text style={[styles.statValue, { color: getBMICategoryColor(stats.currentBMI!) }]}>
              {stats.currentBMI}
            </Text>
          </View>
        </View>
      )}

      {/* Grafik */}
      {progressList.length > 1 && getChartData() && getChartData()!.datasets[0].data.some(v => v > 0) && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>📈 Kilo Değişimi</Text>
          <LineChart
            data={getChartData()!}
            width={Dimensions.get('window').width - 30}
            height={220}
            chartConfig={{
              backgroundColor: colors.white,
              backgroundGradientFrom: colors.white,
              backgroundGradientTo: colors.white,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: colors.primary,
              },
            }}
            bezier
            fromZero={true}
            style={styles.chart}
          />
        </View>
      )}

      {/* Liste */}
      {progressList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>Henüz Kayıt Yok</Text>
          <Text style={styles.emptySubtext}>
            Kilonuzu kaydetmek için aşağıdaki butona tıklayın
          </Text>
        </View>
      ) : (
        <FlatList
          data={progressList}
          renderItem={renderProgressItem}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Kilo Ekle Butonu */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.floatingButtonText}>⚖️ Kilo Ekle</Text>
      </TouchableOpacity>

      {/* Kilo Ekleme Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Yeni Kilo Kaydı</Text>

              <Text style={styles.inputLabel}>Kilonuz (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 75.5"
                value={weight}
                onChangeText={(text) => {
                  const formattedText = text.replace(',', '.');
                  setWeight(formattedText);
                }}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Örn: Sabah aç karnına tartıldım"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.infoText}>
                Boy: {currentHeight} cm
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowModal(false);
                    setWeight('');
                    setNotes('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmitProgress}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  chartContainer: {
    backgroundColor: colors.white,
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 12,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  progressCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deleteIcon: {
    fontSize: 20,
  },
  progressBody: {
    gap: 10,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 15,
    color: colors.textLight,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  bmiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bmiText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});