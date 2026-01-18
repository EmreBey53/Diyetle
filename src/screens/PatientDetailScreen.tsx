// src/screens/PatientDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Patient, getBMIStatus, getBMIColor } from '../models/Patient';
import { deletePatient } from '../services/patientService';
import { getProgressByPatient, getProgressStats, ProgressStats } from '../services/progressService';
import { getDietPlansByPatient, updateDietExpiryDate } from '../services/dietPlanService';
import { Progress, getBMICategoryColor, getBMICategory } from '../models/Progress';
import { DietPlan, formatExpiryInfo, getStatusColor, getStatusEmoji, getDayName } from '../models/DietPlan';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { generateAnamnesisFormPDF } from '../services/pdfService';
import {
  GOAL_OPTIONS,
  DIETARY_RESTRICTIONS,
  HEALTH_CONDITIONS,
  FOOD_ALLERGIES,
  ACTIVITY_LEVELS,
} from '../models/Questionnaire';

export default function PatientDetailScreen({ route, navigation }: any) {
  const { patient } = route.params as { patient: Patient };
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [activeTab, setActiveTab] = useState<'info' | 'progress'>('info');
  
  // Progress
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  
  // Diet Plans
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Diet Expiry Modal
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<DietPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0 = Pazar
  const [selectedTime, setSelectedTime] = useState<string>('18:00');

  useEffect(() => {
    if (activeTab === 'progress') {
      loadProgressData();
    }
  }, [activeTab]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const progressData = await getProgressByPatient(patient.id!);
      setProgressList(progressData);

      const statsData = await getProgressStats(patient.id!);
      setStats(statsData);

      const dietPlansData = await getDietPlansByPatient(patient.id!);
      setDietPlans(dietPlansData);
    } catch (error: any) {
      console.error('❌ Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  };

  const handleEdit = () => {
    navigation.navigate('EditPatient', { patient });
  };

  const handleDelete = () => {
    Alert.alert(
      '⚠️ DİKKAT!',
      `${patient.name} adlı danışanı silmek istediğinizden emin misiniz?\n\nBu işlem GERİ ALINAMAZ!`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Devam Et',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '🚨 SON UYARI!',
              `${patient.name} SİLİNECEK!\n\nAşağıdaki TÜM veriler KALICI olarak silinecek:\n\n• Danışan profili\n• Tüm diyet planları\n• Tüm ilerleme kayıtları\n• Tüm sorular ve cevaplar\n• Kullanıcı hesabı\n\nBu işlem GERİ ALINAMAZ!\n\nEmin misiniz?`,
              [
                { text: '❌ İptal', style: 'cancel' },
                {
                  text: '🗑️ EVET, SİL',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deletePatient(patient.id!);
                      Alert.alert('✅ Başarılı!', `${patient.name} ve tüm verileri başarıyla silindi!`, [
                        { text: 'Tamam', onPress: () => navigation.goBack() },
                      ]);
                    } catch (error: any) {
                      Alert.alert('❌ Hata', error.message);
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          },
        },
      ]
    );
  };

  const handleDownloadAnamnesis = async () => {
    try {
      Alert.alert(
        '📄 Diyet Listesi İndir',
        'Danışan bilgilerini ve diyet listesini PDF olarak indirmek istiyor musunuz?\n\n* Aktif diyet planı varsa otomatik olarak dahil edilecektir.',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'İndir',
            onPress: async () => {
              try {
                // İlerleme verilerini al
                const progressData = await getProgressByPatient(patient.id!);

                // Aktif diyet planını al
                const dietPlans = await getDietPlansByPatient(patient.id!);
                const activeDietPlan = dietPlans.find(plan => plan.status === 'active' || plan.isActive);

                // PDF oluştur (aktif plan varsa dahil et)
                await generateAnamnesisFormPDF(patient, progressData, activeDietPlan);

                Alert.alert(
                  '✅ Başarılı!',
                  activeDietPlan
                    ? 'Diyet listesi oluşturuldu!'
                    : 'Danışan bilgileri PDF olarak oluşturuldu!'
                );
              } catch (error: any) {
                Alert.alert('❌ Hata', error.message);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('❌ Hata', error.message);
    }
  };

  const handleMealPhotos = () => {
    navigation.navigate('DietitianMealPhotos', {
      patientId: patient.id,
      patientName: patient.name
    });
  };

  const handleDietExpiryChange = async () => {
  if (!selectedDiet) {
    console.log('❌ selectedDiet null!');
    return;
  }

  try {
    console.log('========== BAŞLADI ==========');
    console.log('🔄 Diet ID:', selectedDiet.id);
    console.log('📅 Seçilen Gün:', selectedDay, '(' + ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][selectedDay] + ')');
    console.log('⏰ Seçilen Saat:', selectedTime);
    
    setLoading(true);
    
    console.log('🔄 updateDietExpiryDate() çağrılıyor...');
    await updateDietExpiryDate(selectedDiet.id!, selectedDay, selectedTime);
    
    console.log('✅ updateDietExpiryDate() başarılı!');
    
    Alert.alert('✅ Başarılı!', `"${selectedDiet.title}" diyetinin süresi güncellendi!`);
    setShowExpiryModal(false);
    
    console.log('🔄 Veriler yenileniyor...');
    await loadProgressData();
    console.log('✅ Veriler yenilendi!');
    
    console.log('========== BİTTİ ==========');
  } catch (error: any) {
    console.error('❌ HATA:', error);
    console.error('❌ HATA MESAJI:', error.message);
    console.error('❌ HATA STACK:', error.stack);
    Alert.alert('❌ Hata', error.message);
  } finally {
    setLoading(false);
  }
};

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper functions to get labels from IDs
  const getGoalLabels = (ids: string[]) => {
    return ids.map(id => GOAL_OPTIONS.find(opt => opt.id === id)).filter(Boolean);
  };

  const getDietaryRestrictionLabels = (ids: string[]) => {
    return ids.map(id => DIETARY_RESTRICTIONS.find(opt => opt.id === id)).filter(Boolean);
  };

  const getHealthConditionLabels = (ids: string[]) => {
    return ids.map(id => HEALTH_CONDITIONS.find(opt => opt.id === id)).filter(Boolean);
  };

  const getFoodAllergyLabels = (ids: string[]) => {
    return ids.map(id => FOOD_ALLERGIES.find(opt => opt.id === id)).filter(Boolean);
  };

  const getActivityLevelLabel = (id: string) => {
    return ACTIVITY_LEVELS.find(opt => opt.id === id);
  };

  const getChartData = () => {
    if (progressList.length === 0) return null;
    const recentProgress = progressList.slice(0, 7).reverse();
    const labels = recentProgress.map((item) => {
      const date = typeof item.recordDate === 'string' ? new Date(item.recordDate) : item.recordDate;
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const weights = recentProgress.map((item) => item.weight);
    return {
      labels,
      datasets: [{ data: weights, color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, strokeWidth: 3 }],
    };
  };

  const renderDietPlanItem = ({ item }: { item: DietPlan }) => (
    <View style={styles.dietCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('DietPlanDetail', { plan: item })}
        style={styles.dietCardPress}
      >
        <View style={styles.dietHeader}>
          <View style={styles.dietTitleContainer}>
            <Text style={styles.dietTitle}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status || 'active') }]}>
              <Text style={styles.statusBadgeText}>
                {getStatusEmoji(item.status || 'active')} {item.status === 'expired' ? 'Süresi Doldu' : 'Aktif'}
              </Text>
            </View>
          </View>
        </View>

        {item.description && (
          <Text style={styles.dietDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Expiry Info */}
        <View style={[styles.expiryInfo, { backgroundColor: getStatusColor(item.status || 'active') + '20' }]}>
          <Ionicons
            name="time"
            size={16}
            color={getStatusColor(item.status || 'active')}
            style={styles.expiryIcon}
          />
          <Text style={[styles.expiryText, { color: getStatusColor(item.status || 'active') }]}>
            {formatExpiryInfo(item.expiryDate)}
          </Text>
        </View>

        <View style={styles.dietFooter}>
          <Text style={styles.dietDate}>📅 {formatDate(item.startDate)}</Text>
          {item.endDate && <Text style={styles.dietDate}>→ {formatDate(item.endDate)}</Text>}
        </View>
      </TouchableOpacity>

      {/* Change Expiry Button - Sadece aktif diyetler için */}
      {(item.status === 'active' || item.isActive) && (
        <TouchableOpacity
          style={styles.changeExpiryButton}
          onPress={() => {
            setSelectedDiet(item);
            setSelectedDay(item.expiryDay || 0);
            setSelectedTime(item.expiryTime || '18:00');
            setShowExpiryModal(true);
          }}
        >
          <Ionicons name="settings" size={16} color={colors.primary} />
          <Text style={styles.changeExpiryButtonText}>Süresi Değiştir</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderProgressItem = ({ item }: { item: Progress }) => (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressDate}>📅 {formatDate(item.recordDate)}</Text>
      </View>
      <View style={styles.progressBody}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Kilo:</Text>
          <Text style={styles.progressValue}>{item.weight} kg</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Boy:</Text>
          <Text style={styles.progressValue}>{item.height} cm</Text>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.nameText}>{patient.name}</Text>
        <Text style={styles.emailText}>{patient.email}</Text>
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'info' && styles.tabButtonActive]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
            📋 Bilgiler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progress' && styles.tabButtonActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>
            📈 İlerleme & Diyet
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'info' ? (
        // BİLGİLER SEKMESI
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Kişisel Bilgiler */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Kişisel Bilgiler</Text>
            {patient.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefon:</Text>
                <Text style={styles.infoValue}>{patient.phone}</Text>
              </View>
            )}
            {patient.age && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Yaş:</Text>
                <Text style={styles.infoValue}>{patient.age}</Text>
              </View>
            )}
            {patient.gender && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cinsiyet:</Text>
                <Text style={styles.infoValue}>{patient.gender === 'male' ? 'Erkek' : 'Kadın'}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kayıt Tarihi:</Text>
              <Text style={styles.infoValue}>{formatDate(patient.createdAt)}</Text>
            </View>
          </View>

          {/* Vücut Ölçüleri */}
          {(patient.weight || patient.height) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📏 Vücut Ölçüleri</Text>
              {patient.weight && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kilo:</Text>
                  <Text style={styles.infoValue}>{patient.weight} kg</Text>
                </View>
              )}
              {patient.height && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Boy:</Text>
                  <Text style={styles.infoValue}>{patient.height} cm</Text>
                </View>
              )}
              {patient.targetWeight && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hedef Kilo:</Text>
                  <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '600' }]}>{patient.targetWeight} kg</Text>
                </View>
              )}
              {patient.bmi && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>BMI:</Text>
                    <Text style={styles.infoValue}>{patient.bmi}</Text>
                  </View>
                  <View style={styles.bmiStatusContainer}>
                    <View style={[styles.bmiStatusBadge, { backgroundColor: getBMIColor(patient.bmi) }]}>
                      <Text style={styles.bmiStatusText}>{getBMIStatus(patient.bmi)}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Hedefler */}
          {patient.goals && patient.goals.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 Hedefler</Text>
              <View style={styles.tagsContainer}>
                {getGoalLabels(patient.goals).map((goal, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagIcon}>{goal?.icon}</Text>
                    <Text style={styles.tagLabel}>{goal?.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Diyet Kısıtlamaları */}
          {patient.dietaryRestrictions && patient.dietaryRestrictions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🍽️ Beslenme Tercihleri</Text>
              <View style={styles.tagsContainer}>
                {getDietaryRestrictionLabels(patient.dietaryRestrictions).map((restriction, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={styles.tagIcon}>{restriction?.icon}</Text>
                    <Text style={[styles.tagLabel, { color: colors.primary }]}>{restriction?.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sağlık Durumu */}
          {patient.healthConditions && patient.healthConditions.length > 0 && patient.healthConditions[0] !== 'none' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🩺 Sağlık Durumu</Text>
              <View style={styles.tagsContainer}>
                {getHealthConditionLabels(patient.healthConditions).map((condition, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#FF9800' + '15' }]}>
                    <Text style={styles.tagIcon}>{condition?.icon}</Text>
                    <Text style={[styles.tagLabel, { color: '#FF9800' }]}>{condition?.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gıda Alerjileri */}
          {patient.foodAllergies && patient.foodAllergies.length > 0 && patient.foodAllergies[0] !== 'none' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🥜 Gıda Alerjileri</Text>
              <View style={styles.tagsContainer}>
                {getFoodAllergyLabels(patient.foodAllergies).map((allergy, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: '#F44336' + '15' }]}>
                    <Text style={styles.tagIcon}>{allergy?.icon}</Text>
                    <Text style={[styles.tagLabel, { color: '#F44336' }]}>{allergy?.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Aktivite Seviyesi */}
          {patient.activityLevel && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚡ Aktivite Seviyesi</Text>
              <View style={styles.activityLevelContainer}>
                <Text style={styles.activityLevelIcon}>{getActivityLevelLabel(patient.activityLevel)?.icon}</Text>
                <Text style={styles.activityLevelLabel}>{getActivityLevelLabel(patient.activityLevel)?.label}</Text>
              </View>
            </View>
          )}

          {/* Hızlı İşlemler */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Hızlı İşlemler</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateDietPlan', { patient })}>
              <Text style={styles.actionButtonText}>📋 Diyet Planı Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DietitianQuestions', { patientFilter: patient.id })}>
              <Text style={styles.actionButtonText}>💬 Sorular</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9800', borderColor: '#FF9800' }]} onPress={handleDownloadAnamnesis}>
              <Text style={[styles.actionButtonText, { color: colors.white }]}>📄 Diyet Listesi İndir</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#65C18C', borderColor: '#65C18C' }]} onPress={handleMealPhotos}>
              <Text style={[styles.actionButtonText, { color: colors.white }]}>📸 Öğün Fotoğrafları</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PatientRemindersSettings', {
                patientId: patient.id,
                patientName: patient.name
              })}
            >
              <Text style={styles.actionButtonText}>⚙️ Hatırlatıcı Ayarları</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        // İLERLEME & DİYET SEKMESİ
        loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={[...dietPlans, ...progressList]}
            keyExtractor={(item, index) => `${item.id || index}`}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <>
                {/* Diyet Planları */}
                <Text style={styles.sectionTitle}>📋 Diyet Planları</Text>
                {dietPlans.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Henüz diyet planı yok</Text>
                  </View>
                ) : (
                  dietPlans.map(item => <View key={item.id}>{renderDietPlanItem({ item })}</View>)
                )}

                {/* İstatistikler */}
                {stats && stats.totalRecords > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>📊 İstatistikler</Text>
                    <View style={styles.statsContainer}>
                      <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Güncel</Text>
                        <Text style={styles.statValue}>{stats.currentWeight} kg</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Başlangıç</Text>
                        <Text style={styles.statValue}>{stats.startWeight} kg</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Değişim</Text>
                        <Text style={[styles.statValue, { color: stats.weightChange! < 0 ? '#4CAF50' : stats.weightChange! > 0 ? '#F44336' : colors.text }]}>
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
                  </>
                )}

                {/* Grafik */}
                {progressList.length > 1 && getChartData() && (
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
                        propsForDots: { r: '6', strokeWidth: '2', stroke: colors.primary },
                      }}
                      bezier
                      style={styles.chart}
                    />
                  </View>
                )}

                {/* İlerleme Kayıtları */}
                <Text style={styles.sectionTitle}>📋 İlerleme Kayıtları</Text>
                {progressList.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Henüz ilerleme kaydı yok</Text>
                  </View>
                )}
              </>
            }
            renderItem={({ item }) => {
              if ('title' in item) return null;
              return renderProgressItem({ item: item as Progress });
            }}
          />
        )
      )}

      {/* Alt Butonlar */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={[styles.bottomButton, styles.editButton]} onPress={handleEdit}>
          <Text style={styles.bottomButtonText}>✏️ Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.bottomButtonText}>🗑️ Sil</Text>
        </TouchableOpacity>
      </View>

      {/* Expiry Change Modal */}
      <Modal visible={showExpiryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Diyet Süresi Değiştir</Text>
              <TouchableOpacity onPress={() => setShowExpiryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDiet && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Diyet: {selectedDiet.title}</Text>

                {/* Gün Seçimi */}
                <Text style={styles.dayLabel}>Hangi gün sona erecek?</Text>
                <View style={styles.daysContainer}>
                  {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.dayButton, selectedDay === index && styles.dayButtonActive]}
                      onPress={() => setSelectedDay(index)}
                    >
                      <Text style={[styles.dayButtonText, selectedDay === index && styles.dayButtonTextActive]}>
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Saat Seçimi */}
                <Text style={styles.dayLabel}>Saat</Text>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeValue}>{selectedTime}</Text>
                  <Text style={styles.timeHint}>(Standart: 18:00)</Text>
                </View>

                {/* Bilgi */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>📅 Bilgi</Text>
                  <Text style={styles.infoText}>
                    Diyet {getDayName(selectedDay)} günü {selectedTime}'de sona erecektir.
                  </Text>
                  <Text style={styles.infoText}>
                    Cumartesi 09:00'da danışan hatırlatılacak, {getDayName(selectedDay)} {selectedTime}'de otomatik olarak pasif duruma alınacak.
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowExpiryModal(false)}>
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleDietExpiryChange} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: colors.textLight },
  headerCard: { backgroundColor: colors.primary, padding: 20, alignItems: 'center', paddingTop: 30, paddingBottom: 30 },
  nameText: { fontSize: 24, fontWeight: 'bold', color: colors.white, marginBottom: 5 },
  emailText: { fontSize: 16, color: colors.white, opacity: 0.9 },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabButton: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: colors.textLight },
  tabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.white, margin: 15, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 16, color: colors.textLight, flex: 1 },
  infoValue: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' },
  bmiStatusContainer: { marginTop: 15, alignItems: 'center' },
  bmiStatusBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bmiStatusText: { fontSize: 16, fontWeight: 'bold', color: colors.white },
  actionButton: { backgroundColor: colors.background, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  actionButtonText: { fontSize: 16, color: colors.text, textAlign: 'center', fontWeight: '600' },
  listContent: { padding: 15, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 10, marginBottom: 10 },
  emptyCard: { backgroundColor: colors.white, padding: 30, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  emptyText: { fontSize: 16, color: colors.textLight },
  dietCard: { backgroundColor: colors.white, marginBottom: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dietCardPress: { padding: 20 },
  dietHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  dietTitleContainer: { flex: 1, gap: 8 },
  dietTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusBadgeText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  dietDescription: { fontSize: 14, color: colors.textLight, marginBottom: 12 },
  expiryInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12 },
  expiryIcon: { marginRight: 8 },
  expiryText: { fontSize: 13, fontWeight: '600' },
  dietFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  dietDate: { fontSize: 13, color: colors.textLight },
  changeExpiryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  changeExpiryButtonText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  statsContainer: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.white, padding: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statLabel: { fontSize: 12, color: colors.textLight, marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  chartContainer: { backgroundColor: colors.white, marginBottom: 15, padding: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center' },
  chart: { borderRadius: 12 },
  progressCard: { backgroundColor: colors.white, marginBottom: 15, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  progressHeader: { marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  progressDate: { fontSize: 16, fontWeight: '600', color: colors.text },
  progressBody: { gap: 10 },
  progressItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 15, color: colors.textLight },
  progressValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  bmiBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  bmiText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  notesContainer: { marginTop: 10, padding: 12, backgroundColor: colors.background, borderRadius: 8 },
  notesText: { fontSize: 14, color: colors.text, fontStyle: 'italic' },
  bottomButtons: { flexDirection: 'row', padding: 15, gap: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  bottomButton: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  editButton: { backgroundColor: colors.primary },
  deleteButton: { backgroundColor: colors.error },
  bottomButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 15 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 15, marginBottom: 10 },
  daysContainer: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  dayButton: { flex: 0.3, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dayButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayButtonText: { fontSize: 12, fontWeight: '600', color: colors.text },
  dayButtonTextActive: { color: colors.white },
  timeContainer: { backgroundColor: colors.background, padding: 15, borderRadius: 8, marginBottom: 20 },
  timeValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  timeHint: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  infoBox: { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: colors.primary, padding: 12, borderRadius: 8, marginBottom: 20 },
  infoTitle: { fontSize: 13, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  infoText: { fontSize: 12, color: colors.text, lineHeight: 18, marginBottom: 6 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
  confirmButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },

  // Questionnaire Info Styles
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 6 },
  tagIcon: { fontSize: 16 },
  tagLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  activityLevelContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 15, borderRadius: 10, gap: 12 },
  activityLevelIcon: { fontSize: 32 },
  activityLevelLabel: { fontSize: 16, color: colors.text, fontWeight: '600', flex: 1 },
});