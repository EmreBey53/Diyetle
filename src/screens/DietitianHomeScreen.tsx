import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { logoutUser, getCurrentUser } from '../services/authService';
import { getDashboardStats, DashboardStats, getPatientAdditionTrend, getBMITrend } from '../services/dashboardService';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { User } from '../models/User';
import { getQuestionsByDietitian } from '../services/questionService';
import { registerForPushNotificationsAsync, saveUserToken, setupNotificationListeners, getUserNotifications } from '../services/notificationService';
import { getRecentActivities, Activity } from '../services/activityService';
import NotificationPanel from '../components/NotificationPanel';

interface ChartData {
  labels: string[];
  datasets: { data: number[] }[];
}

interface QuickActionProps {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  badge?: number;
  textColor: string;
  subtitleColor: string;
  cardBackground: string;
}

const QuickActionCard = ({ icon, title, subtitle, color, onPress, badge, textColor, subtitleColor, cardBackground }: QuickActionProps) => (
  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: cardBackground }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.quickActionIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={28} color={color} />
    </View>
    <Text style={[styles.quickActionTitle, { color: textColor }]}>{title}</Text>
    <Text style={[styles.quickActionSubtitle, { color: subtitleColor }]}>{subtitle}</Text>
    {badge !== undefined && badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

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

const DietitianHomeScreen = forwardRef(({ navigation }: any, ref) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [patientChartData, setPatientChartData] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });
  const [bmiChartData, setBmiChartData] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });

  // Render avatar helper
  const renderAvatar = () => {
    if (user?.profileEmoji) {
      return <Text style={styles.emojiAvatarHome}>{user.profileEmoji}</Text>;
    }

    if (user?.profileImage) {
      const avatarPreset = AVATAR_PRESETS.find(a => a.id === user.profileImage);
      if (avatarPreset) {
        return (
          <View style={[styles.avatarCircleHome, { backgroundColor: avatarPreset.color }]}>
            <Ionicons name={avatarPreset.icon as any} size={28} color="#FFFFFF" />
          </View>
        );
      }
    }

    return <Ionicons name="person-circle" size={48} color={colors.white} />;
  };

  const chartConfig = {
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    color: (opacity = 1) => isDark ? `rgba(102, 187, 106, ${opacity})` : `rgba(76, 175, 80, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForLabels: {
      fill: colors.text,
    },
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!user) {
        loadData();
      } else {
        // Hafif veriler için kısa güncellemeler (sadece kritik veriler)
        loadLightData();
      }
    });
    return unsubscribe;
  }, [navigation, user]);


  // Reload chart data when viewMode changes
  useEffect(() => {
    if (user && !loading) {
      loadChartData(user.id, viewMode);
    }
  }, [viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Önce users collection'daki patient'ları patients collection'a senkronize et
        const { syncPatientsFromUsers } = await import('../services/patientService');
        await syncPatientsFromUsers(currentUser.id);

        // Load ALL data in parallel for maximum performance
        const [dashboardData, questions, recentActivities, patientTrend, bmiTrend] = await Promise.all([
          getDashboardStats(currentUser.id),
          getQuestionsByDietitian(currentUser.id).catch(() => []),
          getRecentActivities(currentUser.id).catch(() => []),
          getPatientAdditionTrend(currentUser.id, viewMode).catch(() => ({ labels: [], data: [0] })),
          getBMITrend(currentUser.id, viewMode).catch(() => ({ labels: [], data: [0] })),
        ]);

        // Set all states at once to minimize re-renders
        setStats(dashboardData);
        setActivities(recentActivities);
        setUnansweredCount(questions.filter((q: any) => !q.isAnswered).length);

        // NaN ve Infinity değerlerini filtrele
        const sanitizeData = (data: number[]) => data.map(v =>
          (typeof v === 'number' && isFinite(v) && !isNaN(v)) ? v : 0
        );

        setPatientChartData({
          labels: patientTrend.labels.length > 0 ? patientTrend.labels : [''],
          datasets: [{ data: patientTrend.data.length > 0 ? sanitizeData(patientTrend.data) : [0] }],
        });

        setBmiChartData({
          labels: bmiTrend.labels.length > 0 ? bmiTrend.labels : [''],
          datasets: [{ data: bmiTrend.data.length > 0 ? sanitizeData(bmiTrend.data) : [0] }],
        });
      }
    } catch (error: any) {
      // Don't show alert on initial load, just log
    } finally {
      setLoading(false);
    }
  };

  // Hafif veri yükleme - sadece kritik verileri güncelle
  const loadLightData = async () => {
    if (!user) return;

    try {
      // Sadece sorular sayısını ve okunmamış bildirim sayısını güncelle (bildirim için önemli)
      const [questions, notifications] = await Promise.all([
        getQuestionsByDietitian(user.id).catch(() => []),
        getUserNotifications(user.id).catch(() => []),
      ]);

      setUnansweredCount(questions.filter((q: any) => !q.isAnswered).length);
      setUnreadNotificationCount(notifications.filter((n) => !n.read).length);
    } catch (error) {
    }
  };

  const loadChartData = async (userId: string, mode: 'weekly' | 'monthly') => {
    try {
      const [patientTrend, bmiTrend] = await Promise.all([
        getPatientAdditionTrend(userId, mode),
        getBMITrend(userId, mode),
      ]);

      // NaN ve Infinity değerlerini filtrele
      const sanitizeData = (data: number[]) => data.map(v =>
        (typeof v === 'number' && isFinite(v) && !isNaN(v)) ? v : 0
      );

      setPatientChartData({
        labels: patientTrend.labels.length > 0 ? patientTrend.labels : [''],
        datasets: [{ data: patientTrend.data.length > 0 ? sanitizeData(patientTrend.data) : [0] }],
      });

      setBmiChartData({
        labels: bmiTrend.labels.length > 0 ? bmiTrend.labels : [''],
        datasets: [{ data: bmiTrend.data.length > 0 ? sanitizeData(bmiTrend.data) : [0] }],
      });
    } catch (error) {
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: onRefresh,
  }));

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && user) {
          await saveUserToken(user.id, token, 'dietitian');
        }
        cleanup = setupNotificationListeners();
      } catch (error) {
      }
    };

    if (user) {
      setupNotifications();
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      Alert.alert('Başarılı', 'Çıkış yapıldı!');
      navigation.replace('Welcome');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Modern Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: colors.white }]}>İyi çalışmalar,</Text>
              <Text style={[styles.userName, { color: colors.white }]}>{user?.displayName || 'Diyetisyen'}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setNotificationPanelVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={24} color={colors.white} />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: '#FF5252' }]}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                {renderAvatar()}
                <View style={styles.onlineIndicator} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Modern Stats Cards - Horizontal Scroll */}
        {stats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsScrollView}
            contentContainerStyle={styles.statsScrollContent}
          >
            <View style={[styles.statCardModern, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#4CAF50' + '20' }]}>
                <Ionicons name="people" size={24} color="#4CAF50" />
              </View>
              <Text style={[styles.statValueModern, { color: colors.text }]}>{stats.totalPatients}</Text>
              <Text style={[styles.statLabelModern, { color: colors.textLight }]}>Aktif Danışan</Text>
            </View>

            <View style={[styles.statCardModern, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#2196F3' + '20' }]}>
                <Ionicons name="analytics" size={24} color="#2196F3" />
              </View>
              <Text style={[styles.statValueModern, { color: colors.text }]}>{stats.averageBMI || '26.3'}</Text>
              <Text style={[styles.statLabelModern, { color: colors.textLight }]}>Ortalama BMI</Text>
            </View>

            <View style={[styles.statCardModern, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FF5252' + '20' }]}>
                <Ionicons name="warning" size={24} color="#FF5252" />
              </View>
              <Text style={[styles.statValueModern, { color: colors.text }]}>{stats.highBMICount || 0}</Text>
              <Text style={[styles.statLabelModern, { color: colors.textLight }]}>Riskli Durum</Text>
            </View>

            <View style={[styles.statCardModern, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#9C27B0' + '20' }]}>
                <Ionicons name="trending-up" size={24} color="#9C27B0" />
              </View>
              <Text style={[styles.statValueModern, { color: colors.text }]}>{stats.totalPatients}</Text>
              <Text style={[styles.statLabelModern, { color: colors.textLight }]}>İlerleme</Text>
            </View>
          </ScrollView>
        )}

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hızlı İşlemler</Text>
            <View style={styles.liveIndicator}>
              <Text style={styles.liveText}>CANLI</Text>
            </View>
          </View>

          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="people-outline"
              title="Danışanlar"
              subtitle="Listeyi Görüntüle"
              color="#3B82F6"
              onPress={() => navigation.navigate('PatientsList')}
              textColor={colors.text}
              subtitleColor={colors.textLight}
              cardBackground={colors.cardBackground}
            />
            <QuickActionCard
              icon="document-text-outline"
              title="Diyet Planı"
              subtitle="Yeni Oluştur"
              color="#10B981"
              onPress={() => navigation.navigate('DietitianPlansList')}
              textColor={colors.text}
              subtitleColor={colors.textLight}
              cardBackground={colors.cardBackground}
            />
            <QuickActionCard
              icon="chatbubble-ellipses-outline"
              title="Sorular"
              subtitle={unansweredCount > 0 ? `${unansweredCount} Okunmamış` : 'Tüm Sorular'}
              color="#F59E0B"
              onPress={() => navigation.navigate('DietitianQuestions')}
              badge={unansweredCount}
              textColor={colors.text}
              subtitleColor={colors.textLight}
              cardBackground={colors.cardBackground}
            />
            <QuickActionCard
              icon="calendar-outline"
              title="Takvim"
              subtitle="Randevular"
              color="#8B5CF6"
              onPress={() => navigation.navigate('DietitianAppointments')}
              textColor={colors.text}
              subtitleColor={colors.textLight}
              cardBackground={colors.cardBackground}
            />
            <QuickActionCard
              icon="videocam-outline"
              title="Video Görüşme"
              subtitle="Danışan Ara"
              color="#EF4444"
              onPress={() => navigation.navigate('VideoCallSelection')}
              textColor={colors.text}
              subtitleColor={colors.textLight}
              cardBackground={colors.cardBackground}
            />
            <QuickActionCard
              icon="chatbubble-ellipses-outline"
              title="Mesajlaşma"
              subtitle="Danışanlarla Chat"
              color="#10B981"
              onPress={() => navigation.navigate('ChatSelection')}
              textColor={colors.text}
              subtitleColor={colors.textLight}
              cardBackground={colors.cardBackground}
            />
          </View>
        </View>

        {/* Analytics Charts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 Analitikler</Text>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: viewMode === 'weekly' ? colors.primary : colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={() => setViewMode('weekly')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: viewMode === 'weekly' ? colors.white : colors.text },
                  ]}
                >
                  Haftalık
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: viewMode === 'monthly' ? colors.primary : colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={() => setViewMode('monthly')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: viewMode === 'monthly' ? colors.white : colors.text },
                  ]}
                >
                  Aylık
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {patientChartData.labels.length > 0 && patientChartData.datasets[0].data.some(v => v > 0) ? (
            <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>👥 Danışan Ekleme Trendi</Text>
              <BarChart
                data={patientChartData}
                width={350}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                withVerticalLabels={true}
                showValuesOnTopOfBars={true}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero={true}
              />
            </View>
          ) : (
            <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>👥 Danışan Ekleme Trendi</Text>
              <Text style={{ color: colors.textLight, textAlign: 'center', padding: 40 }}>Henüz veri yok</Text>
            </View>
          )}

          {bmiChartData.labels.length > 0 && bmiChartData.datasets[0].data.some(v => v > 0) ? (
            <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>📊 Ortalama BMI Trendi</Text>
              <LineChart
                data={bmiChartData}
                width={350}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                withVerticalLabels={true}
                withDots={true}
                fromZero={true}
              />
            </View>
          ) : (
            <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>📊 Ortalama BMI Trendi</Text>
              <Text style={{ color: colors.textLight, textAlign: 'center', padding: 40 }}>Henüz veri yok</Text>
            </View>
          )}
        </View>

        {/* Daily Goal Card */}
        <View style={styles.section}>
          <View style={[styles.dailyGoalCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.dailyGoalContent}>
              <Text style={[styles.dailyGoalTitle, { color: colors.text }]}>Günlük Hedef</Text>
              <Text style={[styles.dailyGoalSubtitle, { color: colors.textLight }]}>Planlanan görüşmeler</Text>
            </View>
            <View style={styles.dailyGoalIcon}>
              <Ionicons name="flag" size={20} color="#10B981" />
            </View>
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔔 Son Aktiviteler</Text>
          {activities.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyStateText, { color: colors.textLight }]}>Henüz aktivite yok</Text>
            </View>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={[styles.activityItem, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.activityIcon}>
                  {activity.type === 'patient_added' && <Ionicons name="person-add" size={20} color="#4CAF50" />}
                  {activity.type === 'plan_created' && <Ionicons name="document-text" size={20} color="#2196F3" />}
                  {activity.type === 'question_answered' && <Ionicons name="chatbubble" size={20} color="#FF9800" />}
                  {activity.type === 'progress_updated' && <Ionicons name="trending-up" size={20} color="#9C27B0" />}
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityName, { color: colors.text }]}>{activity.name}</Text>
                  <Text style={[styles.activityTime, { color: colors.textLight }]}>{activity.time}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Additional Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButtonModern, { backgroundColor: colors.cardBackground }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF5252" />
            <Text style={[styles.actionButtonText, styles.logoutTextModern]}>Çıkış Yap</Text>
            <Ionicons name="chevron-forward" size={20} color="#FF5252" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Notification Panel */}
      <NotificationPanel
        visible={notificationPanelVisible}
        onClose={() => {
          setNotificationPanelVisible(false);
          // Panel kapandığında bildirim sayısını güncelle
          loadLightData();
        }}
        userId={user?.id || ''}
        onNavigate={(screen, params) => {
          // TabNavigator içindeyiz, Stack screen'lere gitmek için parent'a erişmemiz gerekiyor
          const parent = navigation.getParent();
          if (parent && (screen === 'DietitianMealPhotos' || screen === 'PatientMealPhoto')) {
            parent.navigate(screen, params);
          } else {
            navigation.navigate(screen, params);
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileButton: {
    position: 'relative',
  },
  emojiAvatarHome: {
    fontSize: 48,
  },
  avatarCircleHome: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 24,
    gap: 12,
  },
  statsScrollView: {
    paddingTop: 24,
  },
  statsScrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  statCardModern: {
    width: 160,
    padding: 16,
    borderRadius: 20,
    minHeight: 128,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValueModern: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabelModern: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  liveIndicator: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionCard: {
    width: '47%',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF5252',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  dailyGoalCard: {
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyGoalContent: {
    flex: 1,
  },
  dailyGoalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dailyGoalSubtitle: {
    fontSize: 13,
  },
  dailyGoalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  logoutButtonModern: {
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutTextModern: {
    color: '#FF5252',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default DietitianHomeScreen;
