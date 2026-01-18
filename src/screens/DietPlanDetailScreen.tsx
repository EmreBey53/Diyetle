// src/screens/DietPlanDetailScreen.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DietPlan, getMealTypeEmoji } from '../models/DietPlan';
import { deleteDietPlan } from '../services/dietPlanService';
import { generateDietPlanPDF } from '../services/pdfService';
import { getPatientById } from '../services/patientService';
import { colors } from '../constants/colors';

export default function DietPlanDetailScreen({ route, navigation }: any) {
  const { plan } = route.params as { plan: DietPlan };

  const handleEdit = () => {
    navigation.navigate('EditDietPlan', { plan });
  };

  const handleSharePDF = async () => {
    try {
      // Hasta bilgilerini al
      const patient = await getPatientById(plan.patientId);

      if (!patient) {
        Alert.alert('Hata', 'Hasta bilgileri bulunamadı');
        return;
      }

      // PDF oluştur ve paylaş
      await generateDietPlanPDF(plan, patient);
      Alert.alert('Başarılı!', 'Diyet listesi PDF olarak paylaşıldı');
    } catch (error: any) {
      console.error('PDF paylaşım hatası:', error);
      Alert.alert('Hata', 'PDF oluşturulurken bir hata oluştu');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Planı Sil',
      `"${plan.title}" planını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDietPlan(plan.id!);
              Alert.alert('Başarılı!', 'Plan silindi!', [
                {
                  text: 'Tamam',
                  onPress: () => navigation.goBack(),
                },
              ]);
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{plan.title}</Text>
          <Text style={styles.patientName}>👤 {plan.patientName}</Text>
          {plan.description && (
            <Text style={styles.headerDescription}>{plan.description}</Text>
          )}
          {plan.dailyCalorieTarget && (
            <View style={styles.calorieBox}>
              <Text style={styles.calorieLabel}>Günlük Hedef:</Text>
              <Text style={styles.calorieValue}>{plan.dailyCalorieTarget} kcal</Text>
            </View>
          )}
        </View>

        {/* Plan Bilgileri */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Plan Bilgileri</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Başlangıç:</Text>
            <Text style={styles.infoValue}>{formatDate(plan.startDate)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durum:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: plan.isActive ? colors.primary : colors.textLight }
            ]}>
              <Text style={styles.statusText}>
                {plan.isActive ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Öğün Sayısı:</Text>
            <Text style={styles.infoValue}>{plan.meals.length}</Text>
          </View>
        </View>

        {/* Öğünler */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>🍽️ Günlük Öğünler</Text>

          {plan.meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>
                  {getMealTypeEmoji(meal.type)} {meal.name}
                </Text>
                {meal.time && (
                  <Text style={styles.mealTime}>🕐 {meal.time}</Text>
                )}
              </View>

              {/* Besinler */}
              <View style={styles.foodsList}>
                {meal.foods.map((food, index) => (
                  <View key={food.id} style={styles.foodItem}>
                    <Text style={styles.foodBullet}>•</Text>
                    <Text style={styles.foodName}>{food.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Notlar */}
        {plan.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Notlar</Text>
            <Text style={styles.notesText}>{plan.notes}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Alt Butonlar */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.pdfButton]}
          onPress={handleSharePDF}
        >
          <Text style={styles.bottomButtonText}>📄 PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.editButton]}
          onPress={handleEdit}
        >
          <Text style={styles.bottomButtonText}>✏️ Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.bottomButtonText}>🗑️ Sil</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 25,
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
  },
  patientName: {
    fontSize: 18,
    color: colors.white,
    marginBottom: 10,
  },
  headerDescription: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 15,
  },
  calorieBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  calorieLabel: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginRight: 10,
  },
  calorieValue: {
    fontSize: 20,
    color: colors.white,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.white,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textLight,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  mealCard: {
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
  mealHeader: {
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  mealTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  mealTime: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  foodsList: {
    paddingLeft: 5,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  foodBullet: {
    fontSize: 18,
    color: colors.primary,
    marginRight: 10,
    marginTop: -2,
  },
  foodName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  notesText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  pdfButton: {
    backgroundColor: '#2196F3',
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  bottomButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});