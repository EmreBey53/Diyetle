// src/screens/ViewPatientProgressScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getProgressByPatient, getProgressStats, ProgressStats } from '../services/progressService';
import { getDietPlansByPatient } from '../services/dietPlanService';
import { deletePatient } from '../services/patientService';
import { Progress, getBMICategoryColor, getBMICategory } from '../models/Progress';
import { DietPlan } from '../models/DietPlan';
import { colors } from '../constants/colors';


export default function ViewPatientProgressScreen({ route, navigation }: any) {
  const { patient } = route.params;

  console.log('🔥🔥🔥 YENİ ViewPatientProgressScreen AÇILDI!!! 🔥🔥🔥');
  console.log('🔥🔥🔥 activeTab sistemi var! 🔥🔥🔥');

  const [activeTab, setActiveTab] = useState<'diet' | 'progress'>('diet');
  
  // Progress
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  
  // Diet Plans
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Progress yükle
      const progressData = await getProgressByPatient(patient.id);
      setProgressList(progressData);

      const statsData = await getProgressStats(patient.id);
      setStats(statsData);

      // Diet plans yükle
      const dietPlansData = await getDietPlansByPatient(patient.id);
      setDietPlans(dietPlansData);
    } catch (error: any) {
      console.error('❌ Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
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
              `${patient.name} SİLİNECEK!\n\nAşağıdaki TÜM veriler KALICI olarak silinecek:\n\n• Danışan profili\n• Tüm diyet planları (${dietPlans.length} adet)\n• Tüm ilerleme kayıtları (${progressList.length} adet)\n• Tüm sorular ve cevaplar\n• Kullanıcı hesabı\n\nBu işlem GERİ ALINAMAZ!\n\nEmin misiniz?`,
              [
                { 
                  text: '❌ İptal', 
                  style: 'cancel',
                },
                {
                  text: '🗑️ EVET, SİL',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deletePatient(patient.id);
                      Alert.alert(
                        '✅ Başarılı!',
                        `${patient.name} ve tüm verileri başarıyla silindi!`,
                        [
                          {
                            text: 'Tamam',
                            onPress: () => navigation.navigate('DietitianHome'),
                          },
                        ]
                      );
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getChartData = () => {
    if (progressList.length === 0) return null;
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
      datasets: [{ data: weights, color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, strokeWidth: 3 }],
    };
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderDietPlanItem = ({ item }: { item: DietPlan }) => (
    <TouchableOpacity style={styles.dietCard} onPress={() => navigation.navigate('ViewDietPlan', { plan: item })}>
      <View style={styles.dietHeader}>
        <Text style={styles.dietTitle}>{item.title}</Text>
        <View style={[styles.dietBadge, { backgroundColor: item.isActive ? '#4CAF50' : '#9E9E9E' }]}>
          <Text style={styles.dietBadgeText}>{item.isActive ? 'Aktif' : 'Pasif'}</Text>
        </View>
      </View>
      {item.description && <Text style={styles.dietDescription} numberOfLines={2}>{item.description}</Text>}
      <View style={styles.dietFooter}>
        <Text style={styles.dietDate}>📅 {formatDate(item.startDate)}</Text>
        {item.endDate && <Text style={styles.dietDate}>→ {formatDate(item.endDate)}</Text>}
      </View>
    </TouchableOpacity>
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
        </View><data value=""></data>
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
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{patient.name}</Text>
            <Text style={styles.headerSubtitle}>İlerleme Takibi</Text>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'diet' && styles.tabButtonActive]}
          onPress={() => setActiveTab('diet')}
        >
          <Text style={[styles.tabText, activeTab === 'diet' && styles.tabTextActive]}>
            📋 Diyet Listesi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progress' && styles.tabButtonActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>
            📈 İlerleme
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'diet' ? (
        dietPlans.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>Henüz Diyet Planı Yok</Text>
          </View>
        ) : (
          <FlatList
            data={dietPlans}
            renderItem={renderDietPlanItem}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )
      ) : (
        progressList.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>Henüz İlerleme Kaydı Yok</Text>
          </View>
        ) : (
          <FlatList
            data={progressList}
            renderItem={renderProgressItem}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <>
                {stats && stats.totalRecords > 0 && (
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
                )}
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
                        propsForDots: { r: '6', strokeWidth: '2', stroke: colors.primary },
                      }}
                      bezier
                      fromZero={true}
                      style={styles.chart}
                    />
                  </View>
                )}
                <Text style={styles.sectionTitle}>📋 Tüm Kayıtlar</Text>
              </>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: colors.textLight },
  emptyEmoji: { fontSize: 80, marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  header: { backgroundColor: colors.primary, padding: 20, paddingTop: 25, paddingBottom: 25 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.white, marginBottom: 5 },
  headerSubtitle: { fontSize: 16, color: colors.white, opacity: 0.9 },
  deleteButton: { position: 'absolute', right: 0, backgroundColor: 'rgba(244, 67, 54, 0.9)', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  deleteButtonText: { fontSize: 22 },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabButton: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: colors.textLight },
  tabTextActive: { color: colors.primary },
  listContent: { padding: 15, paddingBottom: 20 },
  dietCard: { backgroundColor: colors.white, padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dietHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dietTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, flex: 1 },
  dietBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dietBadgeText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  dietDescription: { fontSize: 14, color: colors.textLight, marginBottom: 10 },
  dietFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  dietDate: { fontSize: 13, color: colors.textLight },
  statsContainer: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.white, padding: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statLabel: { fontSize: 12, color: colors.textLight, marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  chartContainer: { backgroundColor: colors.white, marginBottom: 15, padding: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center' },
  chart: { borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 10, marginBottom: 10 },
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
});