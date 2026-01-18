// src/screens/PatientHomeScreenNew.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
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

// Avatar presets
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
    loadData();
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
          if (appointments && appointments.length > 0) {
            const now = Date.now();
            // Gelecekteki randevuları filtrele ve en yakını bul
            const upcomingAppointments = appointments
              .filter(apt => apt.startDateTime >= now && apt.status === 'scheduled')
              .sort((a, b) => a.startDateTime - b.startDateTime);

            if (upcomingAppointments.length > 0) {
              setNextAppointment(upcomingAppointments[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
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
      console.error('Hafif veri yükleme hatası:', error);
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
      console.error('Su ekleme hatası:', error);
    }
  };

  const handleWaterDecrease = async () => {
    if (!user || waterIntake === 0) return;

    try {
      const newAmount = Math.max(waterIntake - 0.2, 0);
      await removeWaterIntake(user.id, 0.2, waterGoal);
      setWaterIntake(newAmount);
    } catch (error) {
      console.error('Su azaltma hatası:', error);
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
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              onPress={() => setMealPhotoModalVisible(true)}
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
        </View>

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
      {patient?.id && (
        <MealPhotoUploadModal
          visible={mealPhotoModalVisible}
          onClose={() => setMealPhotoModalVisible(false)}
          patientId={patient.id}
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
});

export default PatientHomeScreenNew;
