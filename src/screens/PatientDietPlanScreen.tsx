import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getActiveDietPlans, 
  getExpiredDietPlans,
  getDietPlansByPatient 
} from '../services/dietPlanService';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { getProgressByPatient } from '../services/progressService';
import { DietPlan, getMealTypeEmoji, formatExpiryInfo, getStatusEmoji, getStatusColor } from '../models/DietPlan';
import { colors } from '../constants/colors';
import { generateAnamnesisFormPDF } from '../services/pdfService';

export default function PatientDietPlanScreen({ navigation }: any) {
  const [activeDietPlan, setActiveDietPlan] = useState<DietPlan | null>(null);
  const [expiredDiets, setExpiredDiets] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDietPlans();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDietPlans();
    });
    return unsubscribe;
  }, [navigation]);

  const loadDietPlans = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı!');
        return;
      }

      // Danışan profilini bul
      const profile = await getPatientProfileByUserId(currentUser.id);
      
      if (!profile) {
        Alert.alert('Hata', 'Profil bulunamadı!');
        return;
      }

      // Aktif diyet planlarını getir (sadece ilkini kullan)
      const activePlans = await getActiveDietPlans(profile.id!);
      setActiveDietPlan(activePlans.length > 0 ? activePlans[0] : null);

      // Süresi dolmuş diyetleri getir
      const expired = await getExpiredDietPlans(profile.id!);
      setExpiredDiets(expired);
    } catch (error: any) {
      // Hata durumunda boş state göster (izin hatası veya plan yoksa)
      setActiveDietPlan(null);
      setExpiredDiets([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDietPlans();
    setRefreshing(false);
  };

  const handleDownloadPDF = async (dietPlan: DietPlan) => {
    try {
      Alert.alert(
        '📄 PDF İndir',
        'Diyet listenizi ve ilerleme bilgilerinizi PDF olarak indirmek ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'İndir',
            onPress: async () => {
              try {
                const currentUser = await getCurrentUser();

                if (!currentUser) {
                  Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
                  return;
                }

                // Hasta profilini al
                const profile = await getPatientProfileByUserId(currentUser.id);

                if (!profile) {
                  Alert.alert('Hata', 'Profil bilgileri bulunamadı');
                  return;
                }

                // İlerleme verilerini al
                const progressData = await getProgressByPatient(profile.id!);

                // PDF oluştur (anamnez formu + diyet listesi)
                await generateAnamnesisFormPDF(profile, progressData, dietPlan);

                Alert.alert('✅ Başarılı!', 'Diyet listeniz ve ilerleme raporunuz oluşturuldu!');
              } catch (error: any) {
                Alert.alert('❌ Hata', 'PDF oluşturulurken bir hata oluştu');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('❌ Hata', error.message);
    }
  };

  const renderDietCard = (diet: DietPlan, isExpired: boolean = false) => (
    <View key={diet.id} style={[styles.dietCard, isExpired && styles.expiredDietCard]}>
      {/* Header */}
      <View style={styles.dietCardHeader}>
        <View style={styles.dietCardTitleContainer}>
          <Text style={styles.dietCardTitle}>{diet.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(diet.status || (isExpired ? 'expired' : 'active')) },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {getStatusEmoji(diet.status || (isExpired ? 'expired' : 'active'))} {diet.status || (isExpired ? 'Süresi Doldu' : 'Aktif')}
            </Text>
          </View>
        </View>
      </View>

      {/* Açıklama */}
      {diet.description && (
        <Text style={styles.dietDescription}>{diet.description}</Text>
      )}

      {/* Tarih & Süresi Bilgisi */}
      <View style={styles.dietInfoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            Başlangıç: {new Date(diet.startDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={styles.infoText}>{formatExpiryInfo(diet.expiryDate)}</Text>
        </View>
      </View>

      {/* Kalori & Su Hedefi */}
      {(diet.dailyCalorieTarget || diet.dailyWaterGoal) && (
        <View style={styles.goalsRow}>
          {diet.dailyCalorieTarget && (
            <View style={[styles.goalCard, styles.calorieCard]}>
              <Text style={styles.goalEmoji}>🔥</Text>
              <Text style={styles.goalValue}>{diet.dailyCalorieTarget}</Text>
              <Text style={styles.goalLabel}>kcal / gün</Text>
            </View>
          )}
          {diet.dailyWaterGoal && (
            <View style={[styles.goalCard, styles.waterCard]}>
              <Text style={styles.goalEmoji}>💧</Text>
              <Text style={styles.goalValue}>{diet.dailyWaterGoal} L</Text>
              <Text style={styles.goalLabel}>su / gün</Text>
            </View>
          )}
        </View>
      )}

      {/* Öğünler */}
      <View style={styles.mealsContainer}>
        <Text style={styles.mealsTitle}>🍽️ Öğünler</Text>
        {diet.meals.map((meal) => (
          <View key={meal.id} style={styles.mealItem}>
            <Text style={styles.mealName}>
              {getMealTypeEmoji(meal.type)} {meal.name}
              {meal.time && ` - ${meal.time}`}
            </Text>
            <View style={styles.foodsList}>
              {meal.foods.slice(0, 2).map((food) => (
                <Text key={food.id} style={styles.foodItem}>
                  • {food.name}
                </Text>
              ))}
              {meal.foods.length > 2 && (
                <Text style={styles.moreFood}>
                  + {meal.foods.length - 2} daha...
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Notlar */}
      {diet.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>📝 Notlar:</Text>
          <Text style={styles.notesText}>{diet.notes}</Text>
        </View>
      )}

      {/* PDF İndir Butonu */}
      <TouchableOpacity
        style={styles.pdfButton}
        onPress={() => handleDownloadPDF(diet)}
      >
        <Ionicons name="document" size={18} color="white" />
        <Text style={styles.pdfButtonText}>PDF İndir</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Diyet planları yükleniyor...</Text>
      </View>
    );
  }

  if (!activeDietPlan && expiredDiets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>🥗</Text>
        <Text style={styles.emptyText}>Diyet Planınız Hazırlanıyor</Text>
        <Text style={styles.emptySubtext}>
          Diyetisyeniniz sizin için kişisel bir diyet planı hazırlayacak. Plan hazır olduğunda burada görünecek.
        </Text>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoBoxText}>
            Yeni sorularınız veya notlarınız için mesaj bölümünü kullanabilirsiniz.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Aktif Diyet */}
      {activeDietPlan && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Aktif Diyet</Text>
          </View>
          {renderDietCard(activeDietPlan, false)}
        </View>
      )}

      {/* Eski Diyetler */}
      {expiredDiets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 Eski Diyetler ({expiredDiets.length})</Text>
            <Text style={styles.sectionSubtitle}>Süresi dolmuş diyet planlarınız</Text>
          </View>
          {expiredDiets.map((diet) => renderDietCard(diet, true))}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
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
    backgroundColor: colors.background,
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
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    maxWidth: 320,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    padding: 15,
    paddingTop: 20,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  dietCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expiredDietCard: {
    opacity: 0.8,
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  dietCardHeader: {
    marginBottom: 12,
  },
  dietCardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  dietCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  dietDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  dietInfoRow: {
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  goalsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  goalCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 2,
  },
  calorieCard: {
    backgroundColor: '#FFF3E0',
  },
  waterCard: {
    backgroundColor: '#E3F2FD',
  },
  goalEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  goalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  goalLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
  mealsContainer: {
    marginBottom: 12,
  },
  mealsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  mealItem: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  mealName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  foodsList: {
    gap: 4,
  },
  foodItem: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 18,
  },
  moreFood: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  pdfButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});