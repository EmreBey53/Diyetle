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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getActiveDietPlans,
  getExpiredDietPlans,
} from '../services/dietPlanService';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { getProgressByPatient } from '../services/progressService';
import { DietPlan, getMealTypeEmoji, formatExpiryInfo, getStatusEmoji, getStatusColor } from '../models/DietPlan';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { generateAnamnesisFormPDF } from '../services/pdfService';

export default function PatientDietPlanScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

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

      const profile = await getPatientProfileByUserId(currentUser.id);

      if (!profile) {
        Alert.alert('Hata', 'Profil bulunamadı!');
        return;
      }

      const activePlans = await getActiveDietPlans(profile.id!);
      setActiveDietPlan(activePlans.length > 0 ? activePlans[0] : null);

      const expired = await getExpiredDietPlans(profile.id!);
      setExpiredDiets(expired);
    } catch (error: any) {
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

                const profile = await getPatientProfileByUserId(currentUser.id);

                if (!profile) {
                  Alert.alert('Hata', 'Profil bilgileri bulunamadı');
                  return;
                }

                const progressData = await getProgressByPatient(profile.id!);
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
    <View key={diet.id} style={[
      styles.dietCard,
      { backgroundColor: colors.cardBackground, shadowColor: '#000' },
      isExpired && [styles.expiredDietCard, { borderColor: '#FFB3B3' }]
    ]}>
      {/* Header */}
      <View style={styles.dietCardHeader}>
        <View style={styles.dietCardTitleContainer}>
          <Text style={[styles.dietCardTitle, { color: colors.text }]}>{diet.title}</Text>
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
        <Text style={[styles.dietDescription, { color: colors.textLight }]}>{diet.description}</Text>
      )}

      {/* Tarih & Süre */}
      <View style={[styles.dietInfoRow, { borderBottomColor: colors.border }]}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Başlangıç: {new Date(diet.startDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>{formatExpiryInfo(diet.expiryDate)}</Text>
        </View>
      </View>

      {/* Kalori & Su Hedefi */}
      {(diet.dailyCalorieTarget || diet.dailyWaterGoal) && (
        <View style={styles.goalsRow}>
          {diet.dailyCalorieTarget && (
            <View style={[styles.goalCard, { backgroundColor: isDark ? '#3D2B00' : '#FFF3E0' }]}>
              <Text style={styles.goalEmoji}>🔥</Text>
              <Text style={[styles.goalValue, { color: colors.text }]}>{diet.dailyCalorieTarget}</Text>
              <Text style={[styles.goalLabel, { color: colors.textLight }]}>kcal / gün</Text>
            </View>
          )}
          {diet.dailyWaterGoal && (
            <View style={[styles.goalCard, { backgroundColor: isDark ? '#002B3D' : '#E3F2FD' }]}>
              <Text style={styles.goalEmoji}>💧</Text>
              <Text style={[styles.goalValue, { color: colors.text }]}>{diet.dailyWaterGoal} L</Text>
              <Text style={[styles.goalLabel, { color: colors.textLight }]}>su / gün</Text>
            </View>
          )}
        </View>
      )}

      {/* Öğünler */}
      <View style={styles.mealsContainer}>
        <Text style={[styles.mealsTitle, { color: colors.text }]}>🍽️ Öğünler</Text>
        {diet.meals.map((meal) => (
          <View key={meal.id} style={[styles.mealItem, { borderLeftColor: colors.primary }]}>
            <Text style={[styles.mealName, { color: colors.text }]}>
              {getMealTypeEmoji(meal.type)} {meal.name}
              {meal.time && ` - ${meal.time}`}
            </Text>
            <View style={styles.foodsList}>
              {meal.foods.slice(0, 2).map((food) => (
                <Text key={food.id} style={[styles.foodItem, { color: colors.textLight }]}>
                  • {food.name}
                </Text>
              ))}
              {meal.foods.length > 2 && (
                <Text style={[styles.moreFood, { color: colors.primary }]}>
                  + {meal.foods.length - 2} daha...
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Notlar */}
      {diet.notes && (
        <View style={[styles.notesBox, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
          <Text style={[styles.notesLabel, { color: colors.text }]}>📝 Notlar:</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>{diet.notes}</Text>
        </View>
      )}

      {/* PDF İndir */}
      <TouchableOpacity
        style={[styles.pdfButton, { backgroundColor: colors.primary }]}
        onPress={() => handleDownloadPDF(diet)}
      >
        <Ionicons name="document" size={18} color="#FFF" />
        <Text style={styles.pdfButtonText}>PDF İndir</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Diyet planları yükleniyor...</Text>
      </View>
    );
  }

  if (!activeDietPlan && expiredDiets.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyEmoji}>🥗</Text>
        <Text style={[styles.emptyText, { color: colors.text }]}>Diyet Planınız Hazırlanıyor</Text>
        <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
          Diyetisyeniniz sizin için kişisel bir diyet planı hazırlayacak. Plan hazır olduğunda burada görünecek.
        </Text>
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '15', borderLeftColor: colors.primary }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoBoxText, { color: colors.text }]}>
            Yeni sorularınız veya notlarınız için mesaj bölümünü kullanabilirsiniz.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {activeDietPlan && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>✅ Aktif Diyet</Text>
          </View>
          {renderDietCard(activeDietPlan, false)}
        </View>
      )}

      {expiredDiets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📦 Eski Diyetler ({expiredDiets.length})</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>Süresi dolmuş diyet planlarınız</Text>
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
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    maxWidth: 320,
    borderLeftWidth: 3,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
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
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  dietCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expiredDietCard: {
    opacity: 0.8,
    borderWidth: 1,
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
    color: '#FFF',
  },
  dietDescription: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  dietInfoRow: {
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
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
  goalEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  goalValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  mealsContainer: {
    marginBottom: 12,
  },
  mealsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  mealItem: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  mealName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  foodsList: {
    gap: 4,
  },
  foodItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  moreFood: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  notesBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  pdfButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
