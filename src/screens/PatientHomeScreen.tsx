// src/screens/PatientHomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { logoutUser, getCurrentUser, updateUserProfileImage } from '../services/authService';
import { getDietitianById } from '../services/firestoreService';
import { getQuestionsByPatient } from '../services/questionService';
import { getPatientProfileByUserId } from '../services/patientService';
import { getProgressByPatient, getProgressStats, ProgressStats } from '../services/progressService';
import { colors } from '../constants/colors';
import { User } from '../models/User';
import { registerForPushNotificationsAsync, saveUserToken, setupNotificationListeners } from '../services/notificationService';
import ProfilePicker from '../components/ProfilePicker';

// Avatar presets (same as ProfilePicker)
const AVATAR_PRESETS = [
  { id: 'male1', icon: 'person', color: '#4CAF50' },
  { id: 'male2', icon: 'person', color: '#2196F3' },
  { id: 'male3', icon: 'person', color: '#9C27B0' },
  { id: 'male4', icon: 'person', color: '#FF9800' },
  { id: 'female1', icon: 'person-circle', color: '#E91E63' },
  { id: 'female2', icon: 'person-circle', color: '#00BCD4' },
  { id: 'female3', icon: 'person-circle', color: '#FFC107' },
  { id: 'female4', icon: 'person-circle', color: '#8BC34A' },
  { id: 'doctor1', icon: 'medical', color: '#F44336' },
  { id: 'doctor2', icon: 'medkit', color: '#3F51B5' },
  { id: 'nutritionist1', icon: 'nutrition', color: '#4CAF50' },
  { id: 'nutritionist2', icon: 'leaf', color: '#8BC34A' },
];

export default function PatientHomeScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [dietitian, setDietitian] = useState<User | null>(null);
  const [newAnswersCount, setNewAnswersCount] = useState(0);

  // Dashboard states
  const [progressList, setProgressList] = useState<any[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePickerVisible, setProfilePickerVisible] = useState(false);

  // Render user avatar
  const renderUserAvatar = () => {
    if (user?.profileEmoji) {
      return <Text style={styles.emojiUser}>{user.profileEmoji}</Text>;
    }

    if (user?.profileImage) {
      const avatarPreset = AVATAR_PRESETS.find(a => a.id === user.profileImage);
      if (avatarPreset) {
        return (
          <View style={[styles.avatarCircleUser, { backgroundColor: avatarPreset.color }]}>
            <Ionicons name={avatarPreset.icon as any} size={40} color="#FFFFFF" />
          </View>
        );
      }
    }

    return <Text style={styles.emoji}>👤</Text>;
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUser();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync();

      if (token && user) {
        const profile = await getPatientProfileByUserId(user.id);
        if (profile) {
          await saveUserToken(profile.id!, token, 'patient');
        }
      }

      const cleanup = setupNotificationListeners();
      return cleanup;
    };

    if (user) {
      setupNotifications();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Diyetisyen bilgilerini yükle
      if (currentUser?.dietitianId) {
        const dietitianData = await getDietitianById(currentUser.dietitianId);
        setDietitian(dietitianData);
      }

      // Yeni cevap sayısını yükle
      if (currentUser) {
        try {
          const profile = await getPatientProfileByUserId(currentUser.id);
          if (profile) {
            const questions = await getQuestionsByPatient(profile.id!);
            const newAnswers = questions.filter((q) => q.isAnswered).length;
            setNewAnswersCount(newAnswers);

            // Dashboard verilerini yükle
            await loadDashboardData(currentUser.id);
          }
        } catch (error) {
          console.error('Veri yükleme hatası:', error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (patientId: string) => {
    try {
      setLoading(true);
      const progressData = await getProgressByPatient(patientId);
      setProgressList(progressData);

      const statsData = await getProgressStats(patientId);
      setStats(statsData);
    } catch (error) {
      console.error('Dashboard veri hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await loadDashboardData(user.id);
    }
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      Alert.alert('Başarılı', 'Çıkış yapıldı!');
      navigation.replace('Welcome');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleProfileImageSelect = async (type: 'emoji' | 'avatar', value: string) => {
    if (!user) return;

    try {
      if (type === 'emoji') {
        await updateUserProfileImage(user.id, value, undefined);
      } else {
        await updateUserProfileImage(user.id, undefined, value);
      }
      // Reload user to get updated profile
      await loadUser();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  // Chart data
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
    if (weights.length === 0 || labels.length === 0) return null;
    return {
      labels,
      datasets: [{ data: weights, color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, strokeWidth: 3 }],
    };
  };

  const getBMIChartData = () => {
    if (progressList.length === 0) return null;
    const recentProgress = progressList.slice(0, 7).reverse();
    const labels = recentProgress.map((item) => {
      const date = typeof item.recordDate === 'string' ? new Date(item.recordDate) : item.recordDate;
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    // NaN ve Infinity değerlerini filtrele
    const bmis = recentProgress.map((item) => {
      const b = item.bmi;
      return (typeof b === 'number' && isFinite(b) && !isNaN(b)) ? b : 0;
    });
    if (bmis.length === 0 || labels.length === 0) return null;
    return {
      labels,
      datasets: [{ data: bmis, color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, strokeWidth: 3 }],
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const chartData = getChartData();
  const bmiChartData = getBMIChartData();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {renderUserAvatar()}
          <Text style={styles.title}>Danışan Paneli</Text>
          <Text style={styles.welcome}>Hoş geldin, {user?.displayName}!</Text>
        </View>

        {/* Diyetisyen Card */}
        {dietitian && (
          <View style={styles.dietitianCard}>
            <Text style={styles.dietitianLabel}>Diyetisyeniniz:</Text>
            <Text style={styles.dietitianName}>👨‍⚕️ {dietitian.displayName}</Text>
          </View>
        )}

        {/* Stats Cards */}
        {stats && stats.totalRecords > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>📊 İstatistikler</Text>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCard1]}>
                <Text style={styles.statEmoji}>⚖️</Text>
                <Text style={styles.statLabel}>Güncel Kilo</Text>
                <Text style={styles.statValue}>{stats.currentWeight} kg</Text>
              </View>

              <View style={[styles.statCard, styles.statCard2]}>
                <Text style={styles.statEmoji}>🎯</Text>
                <Text style={styles.statLabel}>Başlangıç</Text>
                <Text style={styles.statValue}>{stats.startWeight} kg</Text>
              </View>

              <View style={[styles.statCard, styles.statCard3]}>
                <Text style={styles.statEmoji}>📈</Text>
                <Text style={styles.statLabel}>Değişim</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: stats.weightChange! < 0 ? '#4CAF50' : stats.weightChange! > 0 ? '#F44336' : colors.text },
                  ]}
                >
                  {stats.weightChange! > 0 ? '+' : ''}{stats.weightChange} kg
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCard4]}>
                <Text style={styles.statEmoji}>📏</Text>
                <Text style={styles.statLabel}>Güncel BMI</Text>
                <Text style={styles.statValue}>{stats.currentBMI}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Kilo Grafiği */}
        {chartData && progressList.length > 1 && chartData.datasets[0].data.some(v => v > 0) && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>⚖️ Kilo Değişimi (Son 7 Gün)</Text>
            <LineChart
              data={chartData}
              width={350}
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

        {/* BMI Grafiği */}
        {bmiChartData && progressList.length > 1 && bmiChartData.datasets[0].data.some(v => v > 0) && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>📊 BMI Trendi (Son 7 Gün)</Text>
            <LineChart
              data={bmiChartData}
              width={350}
              height={220}
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForDots: { r: '6', strokeWidth: '2', stroke: '#2196F3' },
              }}
              bezier
              fromZero={true}
              style={styles.chart}
            />
          </View>
        )}

        {/* Son Kayıt */}
        {progressList.length > 0 && (
          <View style={styles.lastRecordSection}>
            <Text style={styles.lastRecordTitle}>📋 Son Kaydınız</Text>
            <View style={styles.lastRecordCard}>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Tarih:</Text>
                <Text style={styles.recordValue}>
                  {new Date(progressList[0].recordDate).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Kilo:</Text>
                <Text style={styles.recordValue}>{progressList[0].weight} kg</Text>
              </View>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Boy:</Text>
                <Text style={styles.recordValue}>{progressList[0].height} cm</Text>
              </View>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>BMI:</Text>
                <Text style={styles.recordValue}>{progressList[0].bmi}</Text>
              </View>
              {progressList[0].notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notlar:</Text>
                  <Text style={styles.notesText}>{progressList[0].notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Menu Buttons */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>⚡ Hızlı İşlemler</Text>

          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PatientDietPlan')}
            >
              <Text style={styles.menuButtonText}>🥗 Diyet Planım</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PatientProfile')}
            >
              <Text style={styles.menuButtonText}>📊 Profilim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PatientAppointments')}
            >
              <Text style={styles.menuButtonText}>📅 Randevularım</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PatientQuestions')}
            >
              <View style={styles.menuButtonContent}>
                <Text style={styles.menuButtonText}>💬 Soru Sor</Text>
                {newAnswersCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{newAnswersCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PatientProgress')}
            >
              <Text style={styles.menuButtonText}>📈 İlerlemem</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PatientMealPhoto')}
            >
              <Text style={styles.menuButtonText}>📸 Öğün Fotoğrafları</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setProfilePickerVisible(true)}
            >
              <Text style={styles.menuButtonText}>🎨 Profil Görseli Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Text style={styles.menuButtonText}>🔐 Şifre Değiştir</Text>
            </TouchableOpacity>

          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Profile Picker Modal */}
      <ProfilePicker
        visible={profilePickerVisible}
        onClose={() => setProfilePickerVisible(false)}
        onSelect={handleProfileImageSelect}
        currentEmoji={user?.profileEmoji}
        currentAvatar={user?.profileImage}
      />

      {/* Logout Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 30,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  emojiUser: {
    fontSize: 60,
    marginBottom: 10,
  },
  avatarCircleUser: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  welcome: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  dietitianCard: {
    backgroundColor: colors.white,
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dietitianLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 5,
  },
  dietitianName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statsSection: {
    padding: 15,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard1: {
    backgroundColor: '#FFE082',
  },
  statCard2: {
    backgroundColor: '#A5D6A7',
  },
  statCard3: {
    backgroundColor: '#EF9A9A',
  },
  statCard4: {
    backgroundColor: '#64B5F6',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text,
    opacity: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  chartSection: {
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  chart: {
    borderRadius: 12,
  },
  lastRecordSection: {
    padding: 15,
    paddingTop: 0,
  },
  lastRecordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  lastRecordCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  menuSection: {
    padding: 15,
    paddingTop: 0,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  menuContainer: {
    gap: 10,
  },
  menuButton: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  menuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -25,
    top: -8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomContainer: {
    padding: 15,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});