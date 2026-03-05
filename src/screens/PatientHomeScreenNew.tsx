import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.78;
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { auth } from '../firebaseConfig';
import { getPatientProfileByUserId } from '../services/patientService';
import { getProgressStats, ProgressStats } from '../services/progressService';
import { getTodayWaterIntake, addWaterIntake, removeWaterIntake } from '../services/waterIntakeService';
import { getActiveDietPlan } from '../services/dietPlanService';
import { getPatientAppointments } from '../services/appointmentService';
import { getUserNotifications } from '../services/notificationService';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { WaterIntake } from '../models/WaterIntake';
import { DietPlan, Meal, getMealTypeName } from '../models/DietPlan';
import { Appointment } from '../models/Appointment';
import MealPhotoUploadModal from '../components/MealPhotoUploadModal';
import NotificationPanel from '../components/NotificationPanel';
import { scheduleDailySummaryNotification } from '../services/notificationService';
import { HomeScreenSkeleton } from '../components/SkeletonLoader';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ALL_BADGES, BadgeDef, UserStats, fetchUserStats, CATEGORY_LABELS } from '../services/badgeService';

// Journey panel — kategori renkleri (hex tasarım)
const JOURNEY_CAT_COLORS: Record<string, { border: string; bg: string; glow: string; text: string }> = {
  diet:      { border: '#2f7f33', bg: 'rgba(47,127,51,0.18)',  glow: 'rgba(52,211,153,0.3)',  text: '#34d399' },
  water:     { border: '#2DD4BF', bg: 'rgba(45,212,191,0.15)', glow: 'rgba(45,212,191,0.3)',  text: '#2DD4BF' },
  exercise:  { border: '#F59E0B', bg: 'rgba(245,158,11,0.15)', glow: 'rgba(251,191,36,0.3)',  text: '#FBBF24' },
  mood:      { border: '#EC4899', bg: 'rgba(236,72,153,0.15)', glow: 'rgba(236,72,153,0.3)',  text: '#F472B6' },
  streak:    { border: '#EF4444', bg: 'rgba(239,68,68,0.15)',  glow: 'rgba(239,68,68,0.3)',   text: '#F87171' },
  milestone: { border: '#A78BFA', bg: 'rgba(167,139,250,0.15)',glow: 'rgba(167,139,250,0.3)', text: '#A78BFA' },
  photo:     { border: '#60A5FA', bg: 'rgba(96,165,250,0.15)', glow: 'rgba(96,165,250,0.3)',  text: '#60A5FA' },
};
const J_XP = 50;
const J_THRESHOLDS = [0, 100, 300, 600, 1000, 1500];
const J_NAMES = ['Başlangıç', 'Gelişen', 'İlerlemiş', 'Uzman', 'Usta', 'Platin Usta'];
function jLevel(xp: number) {
  let l = 0;
  J_THRESHOLDS.forEach((t, i) => { if (xp >= t) l = i; });
  const next = J_THRESHOLDS[l + 1] ?? J_THRESHOLDS[l] + 500;
  return { level: l + 1, name: J_NAMES[l], xp, nextXP: next, progress: Math.min(((xp - J_THRESHOLDS[l]) / (next - J_THRESHOLDS[l])) * 100, 100) };
}

const AVATAR_PRESETS = [
  { id: 'male1', icon: 'person', color: '#4CAF50' },
  { id: 'male2', icon: 'person', color: '#2196F3' },
  { id: 'male3', icon: 'person', color: '#9C27B0' },
  { id: 'male4', icon: 'person', color: '#FF9800' },
  { id: 'female1', icon: 'person-circle', color: '#E91E63' },
  { id: 'female2', icon: 'person-circle', color: '#00BCD4' },
  { id: 'female3', icon: 'person-circle', color: '#FFC107' },
  { id: 'female4', icon: 'person-circle', color: '#8BC34A' },
];

const PatientHomeScreenNew = forwardRef(({ navigation }: any, ref) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waterIntake, setWaterIntake] = useState(0); // Bugünkü su tüketimi (litre)
  const [waterGoal, setWaterGoal] = useState(2.5); // Günlük hedef (litre) - Patient'tan gelecek
  const [currentMeal, setCurrentMeal] = useState<Meal | null>(null); // Şu anki öğün
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [mealPhotoModalVisible, setMealPhotoModalVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [badgeSummary, setBadgeSummary] = useState<{
    earnedCount: number;
    totalCount: number;
    recentEmojis: string;
  } | null>(null);
  const [journeyPanelVisible, setJourneyPanelVisible] = useState(false);
  const [journeyStats, setJourneyStats] = useState<UserStats | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const panelAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;

  const openJourneyPanel = () => {
    setJourneyPanelVisible(true);
    Animated.spring(panelAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeJourneyPanel = () => {
    Animated.timing(panelAnim, {
      toValue: PANEL_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setJourneyPanelVisible(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panelAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.5) {
          closeJourneyPanel();
        } else {
          Animated.spring(panelAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Get current date
  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', weekday: 'long' };
    return today.toLocaleDateString('tr-TR', options).toUpperCase();
  };

  // Format appointment date
  const formatAppointmentDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', weekday: 'long' };
    return date.toLocaleDateString('tr-TR', options).toUpperCase();
  };

  // Get relative date (Bugün, Yarın, etc.)
  const getRelativeDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);

    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Yarın';
    if (diffDays === -1) return 'Dün';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} gün sonra`;
    return formatAppointmentDate(dateString);
  };

  useEffect(() => {
    // Auth state listener ekle
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      
      if (firebaseUser) {
        // Kullanıcı giriş yapmış, data yükle
        loadData();
      } else {
        // Kullanıcı çıkış yapmış
        setUser(null);
        setPatient(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Sadece kullanıcı verisi yoksa tam yükleme yap
      if (!user) {
        loadData();
      } else {
        // Hafif güncelleme - sadece su tüketimi gibi sık değişenleri güncelle
        loadLightData();
      }
    });
    return unsubscribe;
  }, [navigation, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Diyetisyen seçilmemişse zorunlu seçim ekranına yönlendir
        if (!(currentUser as any).dietitianId) {
          navigation.replace('SelectDietitian', { user: currentUser, nextScreen: 'PatientHome' });
          return;
        }

        const patientProfile = await getPatientProfileByUserId(currentUser.id);
        setPatient(patientProfile);

        if (patientProfile) {
          // İstatistikleri yükle
          const progressStats = await getProgressStats(currentUser.id);
          setStats(progressStats);

          // Su tüketim hedefini ayarla
          if (patientProfile.dailyWaterGoal) {
            setWaterGoal(patientProfile.dailyWaterGoal);
          }

          // Bugünkü su tüketimini yükle
          const waterData = await getTodayWaterIntake(currentUser.id);
          if (waterData) {
            setWaterIntake(waterData.amount);
          }

          // Aktif diyet planını yükle
          const activeDiet = await getActiveDietPlan(currentUser.id);
          if (activeDiet) {
            setDietPlan(activeDiet);
            // Şu anki saate göre öğünü belirle
            const meal = getCurrentMealFromPlan(activeDiet);
            setCurrentMeal(meal);
          }

          // Randevuları yükle ve bir sonraki randevuyu bul
          const appointments = await getPatientAppointments(currentUser.id);
          let hasAppointmentToday = false;
          if (appointments && appointments.length > 0) {
            const now = Date.now();
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
            // Gelecekteki randevuları filtrele ve en yakını bul
            const upcomingAppointments = appointments
              .filter(apt => apt.startDateTime >= now && apt.status === 'scheduled')
              .sort((a, b) => a.startDateTime - b.startDateTime);

            if (upcomingAppointments.length > 0) {
              setNextAppointment(upcomingAppointments[0]);
            }
            hasAppointmentToday = appointments.some(
              apt => apt.startDateTime >= todayStart.getTime() && apt.startDateTime <= todayEnd.getTime()
            );
          }

          // Günlük özet bildirimi planla (hata olursa sessizce geç)
          const mealCount = activeDiet ? activeDiet.meals.length : 0;
          const wGoal = patientProfile.dailyWaterGoal ?? 2.5;
          scheduleDailySummaryNotification(mealCount, wGoal, hasAppointmentToday).catch(() => {});

        }

        // Rozet özeti yükle — patientProfile bağımsız
        try {
          const [earnedDocs, uStats] = await Promise.all([
            getDocs(query(collection(db, 'achievements'), where('userId', '==', currentUser.id))),
            fetchUserStats(currentUser.id),
          ]);
          const earnedIds = new Set(earnedDocs.docs.map((d) => d.data().badgeId as string));
          const earnedBadges = ALL_BADGES.filter((b) => earnedIds.has(b.id));
          const recent3 = earnedBadges.slice(-3).map((b) => b.emoji).join(' ');
          setBadgeSummary({
            earnedCount: earnedBadges.length,
            totalCount: ALL_BADGES.length,
            recentEmojis: recent3,
          });
          setEarnedBadgeIds(earnedIds);
          setJourneyStats(uStats);
        } catch {
          // Hata olursa boş özet göster
          setBadgeSummary({ earnedCount: 0, totalCount: ALL_BADGES.length, recentEmojis: '' });
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Hafif veri yükleme - sadece sık değişen verileri güncelle
  const loadLightData = async () => {
    if (!user) return;

    try {
      // Sadece su tüketimini ve okunmamış bildirim sayısını güncelle (en sık değişen veriler)
      const [waterData, notifications] = await Promise.all([
        getTodayWaterIntake(user.id),
        getUserNotifications(user.id).catch(() => []),
      ]);

      if (waterData) {
        setWaterIntake(waterData.amount);
      }

      setUnreadNotificationCount(notifications.filter((n) => !n.read).length);

      // Şu anki öğünü güncelle (saat değiştiğinde farklı öğün göstermek için)
      if (dietPlan) {
        const meal = getCurrentMealFromPlan(dietPlan);
        setCurrentMeal(meal);
      }
    } catch (error) {
    }
  };

  // Şu anki saate göre hangi öğünü göstereceğini belirle
  const getCurrentMealFromPlan = (plan: DietPlan): Meal | null => {
    if (!plan.meals || plan.meals.length === 0) return null;

    const now = new Date();
    const currentHour = now.getHours();

    // Saate göre öğün tipi belirleme
    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    if (currentHour >= 6 && currentHour < 11) {
      mealType = 'breakfast';
    } else if (currentHour >= 11 && currentHour < 16) {
      mealType = 'lunch';
    } else if (currentHour >= 16 && currentHour < 21) {
      mealType = 'dinner';
    } else {
      mealType = 'snack';
    }

    // İlgili öğünü bul
    const meal = plan.meals.find(m => m.type === mealType);

    // Eğer bulunamazsa, bir sonraki öğünü göster
    if (!meal && plan.meals.length > 0) {
      return plan.meals[0];
    }

    return meal || null;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: onRefresh,
  }));

  const handleWaterIncrease = async () => {
    if (!user) return;

    try {
      const newAmount = Math.min(waterIntake + 0.2, waterGoal);
      await addWaterIntake(user.id, 0.2, waterGoal);
      setWaterIntake(newAmount);
    } catch (error) {
    }
  };

  const handleWaterDecrease = async () => {
    if (!user || waterIntake === 0) return;

    try {
      const newAmount = Math.max(waterIntake - 0.2, 0);
      await removeWaterIntake(user.id, 0.2, waterGoal);
      setWaterIntake(newAmount);
    } catch (error) {
    }
  };

  const waterPercentage = (waterIntake / waterGoal) * 100;

  const renderAvatar = () => {
    if (user?.profileEmoji) {
      return <Text style={styles.emojiAvatar}>{user.profileEmoji}</Text>;
    }

    if (user?.profileImage) {
      const avatarPreset = AVATAR_PRESETS.find(a => a.id === user.profileImage);
      if (avatarPreset) {
        return (
          <View style={[styles.avatarCircle, { backgroundColor: avatarPreset.color }]}>
            <Ionicons name={avatarPreset.icon as any} size={28} color="#FFFFFF" />
          </View>
        );
      }
    }

    return <Ionicons name="person-circle" size={56} color={colors.white} />;
  };

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  // Diyetisyen onayı bekleniyor
  if (patient && (patient as any).status === 'pending') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>⏳</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
          Onay Bekleniyor
        </Text>
        <Text style={{ fontSize: 15, color: colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Diyetisyeniniz talebinizi henüz onaylamadı. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
          onPress={onRefresh}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Yenile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentWeight = stats?.currentWeight || patient?.weight || 0;
  const targetWeight = patient?.targetWeight || 0;
  const program = 'Kilo Verme Programı'; // Mock data - gerçek program bilgisi eklenecek

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Avatar */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={[styles.dateText, { color: colors.white }]}>
                {getCurrentDate()}
              </Text>
              <Text style={[styles.greetingText, { color: colors.white }]}>
                Merhaba, {patient?.name || user?.displayName || 'Danışan'}!
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setNotificationPanelVisible(true)}
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
                style={styles.avatarContainer}
                onPress={() => navigation.navigate('PatientSettings')}
              >
                {renderAvatar()}
                <View style={styles.statusDot} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Next Appointment Card */}
        {nextAppointment && (
          <View style={styles.appointmentCardContainer}>
            <View style={[styles.appointmentCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentIcon}>
                  <Ionicons name="calendar" size={24} color={colors.white} />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={[styles.appointmentTitle, { color: colors.text }]}>
                    Sıradaki Randevu
                  </Text>
                  <Text style={[styles.appointmentDietitian, { color: colors.textLight }]}>
                    {nextAppointment.dietitianName}
                  </Text>
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.appointmentTime}>
                  <Text style={[styles.timeLabel, { color: colors.textLight }]}>
                    {getRelativeDate(nextAppointment.date)}
                  </Text>
                  <Text style={[styles.timeValue, { color: colors.text }]}>
                    Saat: {nextAppointment.time} - {nextAppointment.status === 'scheduled' ? 'Online' : nextAppointment.status}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.detailsButton, { backgroundColor: colors.primary }]}
                  onPress={() => setAppointmentModalVisible(true)}
                >
                  <Text style={[styles.detailsButtonText, { color: colors.white }]}>Detaylar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Stats Row - Kaydırılabilir */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContainer}
          style={styles.statsScroll}
        >
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF9800' + '15' }]}>
              <Ionicons name="flame" size={24} color="#FF9800" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>PROGRAM</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{program}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="analytics" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>GÜNCEL KİLO</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{currentWeight} kg</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.statIcon, { backgroundColor: '#4CAF50' + '15' }]}>
              <Ionicons name="flag" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>HEDEF</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{targetWeight} kg</Text>
          </View>
        </ScrollView>

        {/* Hızlı Erişim Butonları - 2x2 Grid */}
        <View style={styles.quickAccessSection}>
          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('PatientDietPlan')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="restaurant" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Diyet Planım</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('PatientProgress')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                <Ionicons name="trending-up" size={26} color="#4CAF50" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>İlerlemem</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => {

                // Direkt PatientMealPhotoScreen'e git
                navigation.navigate('PatientMealPhoto');
              }}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                <Ionicons name="camera" size={26} color="#FF9800" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Öğün Fotoğrafı Gönder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('PatientQuestions')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#2196F3' + '15' }]}>
                <Ionicons name="chatbubbles" size={26} color="#2196F3" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Mesajlarım</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('ShoppingList')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#22C55E15' }]}>
                <Ionicons name="cart-outline" size={26} color="#22C55E" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Alışveriş Listesi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('MoodTracker')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#EC489920' }]}>
                <Ionicons name="heart-outline" size={26} color="#EC4899" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Ruh Halim</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('ExerciseLog')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="barbell-outline" size={26} color="#8B5CF6" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Egzersiz Logu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('PatientAppointments')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="calendar-outline" size={26} color="#F59E0B" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Randevularım</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={[styles.quickAccessCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => navigation.navigate('WaterTracking')}
            >
              <View style={[styles.quickAccessIconContainer, { backgroundColor: '#0EA5E920' }]}>
                <Ionicons name="water-outline" size={26} color="#0EA5E9" />
              </View>
              <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Su Takibi</Text>
            </TouchableOpacity>

            <View style={[styles.quickAccessCard, { backgroundColor: 'transparent' }]} />
          </View>

        </View>

        {/* İlerleme Yolculuğum Widget */}
        <TouchableOpacity
          style={styles.badgeWidget}
          onPress={openJourneyPanel}
          activeOpacity={0.8}
        >
          <View style={styles.badgeWidgetLeft}>
            <Text style={styles.badgeWidgetIcon}>🚀</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.badgeWidgetTitle, { color: '#FFFFFF' }]}>İlerleme Yolculuğum</Text>
              <Text style={[styles.badgeWidgetSub, { color: '#34d399' }]}>
                {badgeSummary ? `${badgeSummary.earnedCount}/${badgeSummary.totalCount} rozet kazanıldı` : 'Rozetlerin yükleniyor...'}
              </Text>
              {badgeSummary?.recentEmojis ? (
                <Text style={styles.badgeRecentEmojis}>{badgeSummary.recentEmojis}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.badgeWidgetChevron, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
            <Ionicons name="chevron-up" size={18} color="#34d399" />
          </View>
        </TouchableOpacity>

        {/* Current Meal Card */}
        {currentMeal && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {getMealTypeName(currentMeal.type)}
            </Text>
            <View style={[styles.mealCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.mealHeader}>
                <View style={styles.mealPlaceholder}>
                  <Ionicons name="restaurant-outline" size={48} color={colors.primary} />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealTitle, { color: colors.text }]}>
                    {currentMeal.name}
                  </Text>
                  <Text style={[styles.mealDescription, { color: colors.textLight }]}>
                    {currentMeal.foods.map(f => f.name).join(', ')}
                  </Text>
                  <View style={styles.mealTags}>
                    <View style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>
                        {currentMeal.totalCalories} kcal
                      </Text>
                    </View>
                    {currentMeal.time && (
                      <View style={[styles.tag, { backgroundColor: '#2196F3' + '15' }]}>
                        <Text style={[styles.tagText, { color: '#2196F3' }]}>
                          {currentMeal.time}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('PatientDietPlan')}>
                  <Ionicons name="arrow-forward-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* No Diet Plan Message */}
        {!currentMeal && !loading && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Diyet Planım</Text>
            <View style={[styles.mealCard, { backgroundColor: colors.cardBackground }]}>
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={48} color={colors.textLight} />
                <Text style={[styles.mealDescription, { color: colors.textLight, marginTop: 12 }]}>
                  Henüz aktif bir diyet planınız bulunmuyor.
                </Text>
                <TouchableOpacity
                  style={[styles.tag, { backgroundColor: colors.primary, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8 }]}
                  onPress={() => navigation.navigate('PatientDietPlan')}
                >
                  <Text style={[styles.tagText, { color: colors.white }]}>
                    Diyet Planlarını Gör
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Water Consumption */}
        <View style={styles.section}>
          <View style={styles.waterHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Su Tüketimi</Text>
            <Text style={[styles.waterAmount, { color: colors.primary }]}>
              {waterIntake.toFixed(1)} / {waterGoal} Litre
            </Text>
          </View>
          <View style={[styles.waterCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.waterControls}>
              <TouchableOpacity
                style={[styles.waterButton, { backgroundColor: colors.background }]}
                onPress={handleWaterDecrease}
                disabled={waterIntake === 0}
              >
                <Ionicons
                  name="remove"
                  size={24}
                  color={waterIntake === 0 ? colors.textLight : colors.primary}
                />
              </TouchableOpacity>
              <View style={[styles.waterIcon, { backgroundColor: '#2196F3' + '15' }]}>
                <Ionicons name="water" size={32} color="#2196F3" />
              </View>
              <TouchableOpacity
                style={[styles.waterButton, { backgroundColor: colors.primary }]}
                onPress={handleWaterIncrease}
                disabled={waterIntake >= waterGoal}
              >
                <Ionicons name="add" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.waterProgress}>
              <View style={[styles.waterProgressBar, { backgroundColor: colors.background }]}>
                <View
                  style={[
                    styles.waterProgressFill,
                    { backgroundColor: '#2196F3', width: `${Math.min(waterPercentage, 100)}%` }
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Appointment Details Modal */}
      {nextAppointment && (
        <Modal
          visible={appointmentModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setAppointmentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Randevu Detayları</Text>
                <TouchableOpacity onPress={() => setAppointmentModalVisible(false)}>
                  <Ionicons name="close-circle" size={32} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Dietitian Info */}
                <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalRow}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                    <View style={styles.modalRowContent}>
                      <Text style={[styles.modalLabel, { color: colors.textLight }]}>Diyetisyen</Text>
                      <Text style={[styles.modalValue, { color: colors.text }]}>
                        {nextAppointment.dietitianName}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalRow}>
                    <Ionicons name="calendar" size={24} color={colors.primary} />
                    <View style={styles.modalRowContent}>
                      <Text style={[styles.modalLabel, { color: colors.textLight }]}>Tarih</Text>
                      <Text style={[styles.modalValue, { color: colors.text }]}>
                        {formatAppointmentDate(nextAppointment.date)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.modalRow, { marginTop: 16 }]}>
                    <Ionicons name="time" size={24} color={colors.primary} />
                    <View style={styles.modalRowContent}>
                      <Text style={[styles.modalLabel, { color: colors.textLight }]}>Saat</Text>
                      <Text style={[styles.modalValue, { color: colors.text }]}>
                        {nextAppointment.time}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Location */}
                <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalRow}>
                    <Ionicons name="location" size={24} color={colors.primary} />
                    <View style={styles.modalRowContent}>
                      <Text style={[styles.modalLabel, { color: colors.textLight }]}>Konum</Text>
                      <Text style={[styles.modalValue, { color: colors.text }]}>
                        Online Görüşme
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Meeting Link */}
                {nextAppointment.meetingLink && (
                  <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                    <View style={styles.modalRow}>
                      <Ionicons name="videocam" size={24} color={colors.primary} />
                      <View style={styles.modalRowContent}>
                        <Text style={[styles.modalLabel, { color: colors.textLight }]}>
                          Toplantı Linki
                        </Text>
                        <TouchableOpacity onPress={() => Linking.openURL(nextAppointment.meetingLink)}>
                          <Text style={[styles.modalLink, { color: colors.primary }]}>
                            {nextAppointment.meetingLink}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Notes */}
                {nextAppointment.notes && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalRow}>
                      <Ionicons name="document-text" size={24} color={colors.primary} />
                      <View style={styles.modalRowContent}>
                        <Text style={[styles.modalLabel, { color: colors.textLight }]}>Notlar</Text>
                        <Text style={[styles.modalNotes, { color: colors.text }]}>
                          {nextAppointment.notes}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (nextAppointment.meetingLink) {
                      Linking.openURL(nextAppointment.meetingLink);
                    }
                  }}
                >
                  <Ionicons name="videocam" size={20} color={colors.white} />
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    Toplantıya Katıl
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonSecondary, { borderColor: colors.border }]}
                  onPress={() => {
                    setAppointmentModalVisible(false);
                    navigation.navigate('PatientAppointments');
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.modalButtonTextSecondary, { color: colors.primary }]}>
                    Tüm Randevular
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Meal Photo Upload Modal */}
      {(patient?.id || user?.id || auth.currentUser?.uid) && (
        <MealPhotoUploadModal
          visible={mealPhotoModalVisible}
          onClose={() => {
            setMealPhotoModalVisible(false);
          }}
          patientId={patient?.id || user?.id || auth.currentUser?.uid || 'temp-id'}
          onUploadSuccess={() => {
            // Optionally refresh data after upload
            loadLightData();
          }}
        />
      )}

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

      {/* İlerleme Yolculuğum Bottom Sheet */}
      {journeyPanelVisible && (() => {
        const earnedCount = badgeSummary?.earnedCount ?? 0;
        const totalCount = badgeSummary?.totalCount ?? ALL_BADGES.length;
        const xp = earnedCount * J_XP;
        const lvl = jLevel(xp);
        return (
          <Modal transparent visible animationType="none" onRequestClose={closeJourneyPanel}>
            <TouchableOpacity style={styles.journeyOverlay} activeOpacity={1} onPress={closeJourneyPanel} />

            <Animated.View style={[styles.journeyPanel, { transform: [{ translateY: panelAnim }] }]}>

              {/* Drag kolu + header */}
              <View {...panResponder.panHandlers} style={styles.journeyDragArea}>
                <View style={styles.journeyHandle} />
                <View style={styles.journeyHeaderRow}>
                  <View style={styles.journeyHeaderLeft}>
                    <Ionicons name="shield-checkmark" size={18} color="#34d399" />
                    <Text style={styles.journeyHeaderTitle}>İlerleme Yolculuğum</Text>
                  </View>
                  <TouchableOpacity onPress={closeJourneyPanel} style={styles.journeyCloseBtn}>
                    <Ionicons name="close" size={18} color="#aaa" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Premium Status Kart */}
                <View style={styles.journeyPremiumCard}>
                  <View style={styles.journeyPremiumBlob} />
                  <View style={styles.journeyPremiumTop}>
                    <View style={styles.journeyPremiumHexWrap}>
                      <View style={styles.journeyPremiumHex}>
                        <Text style={{ fontSize: 24 }}>💎</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.journeyPremiumStatus}>PREMIUM STATUS</Text>
                      <Text style={styles.journeyPremiumLevel}>Seviye {lvl.level}: {lvl.name}</Text>
                    </View>
                  </View>
                  <View style={styles.journeyXpRow}>
                    <Text style={styles.journeyXpText}>{xp} / {lvl.nextXP} XP</Text>
                    <Text style={styles.journeyXpText}>{Math.round(lvl.progress)}%</Text>
                  </View>
                  <View style={styles.journeyXpTrack}>
                    <View style={[styles.journeyXpFill, { width: `${lvl.progress}%` }]} />
                  </View>
                  <Text style={styles.journeyXpNext}>
                    {earnedCount} / {totalCount} rozet kazanıldı
                  </Text>
                </View>

                {/* Kategori bazlı rozetler */}
                <View style={styles.journeyScrollContent}>
                  {Array.from(new Set(ALL_BADGES.map((b) => b.category))).map((cat) => {
                    const catBadges = ALL_BADGES.filter((b) => b.category === cat);
                    const earnedInCat = catBadges.filter((b) => earnedBadgeIds.has(b.id)).length;
                    const allEarned = earnedInCat === catBadges.length;
                    const color = JOURNEY_CAT_COLORS[cat] ?? JOURNEY_CAT_COLORS.milestone;
                    return (
                      <View key={cat} style={styles.journeyCatSection}>
                        <View style={styles.journeyCatHeaderRow}>
                          <Text style={styles.journeyCatTitle}>{CATEGORY_LABELS[cat]}</Text>
                          <View style={[styles.journeyCatPill, { backgroundColor: allEarned ? color.bg : '#1E2533' }]}>
                            <Text style={[styles.journeyCatPillTxt, { color: allEarned ? color.text : '#64748b' }]}>
                              {earnedInCat} / {catBadges.length}
                            </Text>
                          </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.journeyBadgeRow}>
                          {catBadges.map((badge) => {
                            const earned = earnedBadgeIds.has(badge.id);
                            const prog = !earned && badge.getProgress && journeyStats ? badge.getProgress(journeyStats) : null;
                            return (
                              <View key={badge.id} style={styles.journeyBadgeItem}>
                                {/* Glow */}
                                {earned && (
                                  <View style={[styles.journeyHexGlow, { backgroundColor: color.glow }]} />
                                )}
                                {/* Hex şekil */}
                                <View style={[
                                  styles.journeyHexShape,
                                  {
                                    backgroundColor: earned ? color.bg : '#1E1E2E',
                                    borderColor: earned ? color.border : 'rgba(255,255,255,0.06)',
                                  },
                                ]}>
                                  <Text style={[styles.journeyBadgeEmoji, { opacity: earned ? 1 : 0.3 }]}>
                                    {badge.emoji}
                                  </Text>
                                  {!earned && (
                                    <View style={styles.journeyHexLock}>
                                      <Ionicons name="lock-closed" size={10} color="#555" />
                                    </View>
                                  )}
                                </View>

                                <Text style={[styles.journeyBadgeName, { color: earned ? '#e2e8f0' : '#475569' }]} numberOfLines={2}>
                                  {badge.title}
                                </Text>

                                {!earned && prog && prog.value > 0 && (
                                  <View style={styles.journeyMiniProgress}>
                                    <View style={styles.journeyMiniTrack}>
                                      <View style={[styles.journeyMiniFill, { width: `${prog.value}%`, backgroundColor: color.text }]} />
                                    </View>
                                    <Text style={[styles.journeyMiniText, { color: color.text }]}>{prog.text}</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.journeyAllBtn}
                    onPress={() => { closeJourneyPanel(); navigation.navigate('Badges'); }}
                  >
                    <Text style={styles.journeyAllBtnText}>Tüm Rozetleri Gör</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>

                  <View style={{ height: 32 }} />
                </View>
              </ScrollView>
            </Animated.View>
          </Modal>
        );
      })()}
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
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
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.9,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
  },
  emojiAvatar: {
    fontSize: 56,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5252',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  appointmentCardContainer: {
    marginTop: -60,
    paddingHorizontal: 20,
  },
  appointmentCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appointmentDietitian: {
    fontSize: 14,
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  appointmentTime: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsScroll: {
    marginTop: 20,
    marginBottom: 20,
  },
  statsScrollContainer: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  statCard: {
    width: 140,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginRight: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickAccessSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  quickAccessRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickAccessCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAccessIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickAccessLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mealCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  mealTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  waterCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  waterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterProgress: {
    width: '100%',
  },
  waterProgressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  waterProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  badgeWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#0a1f10',
    borderWidth: 1,
    borderColor: '#1a4a2e',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  badgeWidgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badgeWidgetIcon: {
    fontSize: 36,
  },
  badgeWidgetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeWidgetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRecentEmojis: {
    fontSize: 18,
    marginTop: 4,
    letterSpacing: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: '70%',
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalRowContent: {
    flex: 1,
    marginLeft: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  modalNotes: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  modalActions: {
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeWidgetChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Journey Bottom Sheet — neon/gaming dark tema
  journeyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  journeyPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: PANEL_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#0a1208',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 24,
    borderTopWidth: 1,
    borderTopColor: '#1a4a2e',
  },
  journeyDragArea: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  journeyHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#333',
  },
  journeyCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0d2818',
    borderWidth: 1,
    borderColor: '#1a4a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Journey panel: yeni hex/dark tema stilleri ──────────────────────────────
  journeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  journeyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  journeyHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  journeyPremiumCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#0d2818',
    borderWidth: 1,
    borderColor: '#1a4a2e',
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  journeyPremiumBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  journeyPremiumTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  journeyPremiumHexWrap: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  journeyPremiumHex: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1a4a2e',
    borderWidth: 2,
    borderColor: '#34d399',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  journeyPremiumStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 2,
    marginBottom: 2,
  },
  journeyPremiumLevel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  journeyXpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  journeyXpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  journeyXpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a1f10',
    overflow: 'hidden',
    marginBottom: 8,
  },
  journeyXpFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  journeyXpNext: {
    fontSize: 11,
    color: '#64748b',
  },
  journeyCatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  journeyCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  journeyCatPillTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  journeyHexGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 14,
    opacity: 0.4,
  },
  journeyHexShape: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  journeyHexLock: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  // ─────────────────────────────────────────────────────────────────────────────
  journeyScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 20,
  },
  journeyCatSection: {
    gap: 10,
  },
  journeyCatTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  journeyCatCount: {
    fontSize: 13,
    fontWeight: '400',
    color: '#888',
  },
  journeyBadgeRow: {
    gap: 12,
    paddingBottom: 4,
  },
  journeyBadgeItem: {
    alignItems: 'center',
    width: 76,
    gap: 6,
    position: 'relative',
  },
  journeyBadgeEmoji: {
    fontSize: 28,
  },
  journeyBadgeName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  journeyMiniProgress: {
    width: 64,
    gap: 2,
  },
  journeyMiniTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#2A2A3A',
  },
  journeyMiniFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#7C3AED',
  },
  journeyMiniText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    color: '#888',
  },
  journeyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
    backgroundColor: '#059669',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  journeyAllBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PatientHomeScreenNew;
