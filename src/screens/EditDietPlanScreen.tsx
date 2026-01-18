// src/screens/EditDietPlanScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateDietPlan } from '../services/dietPlanService';
import { DietPlan, Meal, Food, getMealTypeName, getMealTypeEmoji } from '../models/DietPlan';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function EditDietPlanScreen({ route, navigation }: any) {
  const { plan } = route.params as { plan: DietPlan };
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description || '');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(plan.dailyCalorieTarget?.toString() || '');
  const [dailyWaterGoal, setDailyWaterGoal] = useState(plan.dailyWaterGoal?.toString() || '');
  const [notes, setNotes] = useState(plan.notes || '');
  const [meals, setMeals] = useState<Meal[]>(plan.meals);
  const [loading, setLoading] = useState(false);
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showWaterGoalPicker, setShowWaterGoalPicker] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<Meal['type'] | null>(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedWaterGoal, setSelectedWaterGoal] = useState(plan.dailyWaterGoal || 2.5);

  const mealTypes: Meal['type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Öğün tiplerine göre varsayılan saatler
  const getDefaultTimeForMealType = (type: Meal['type']): Date => {
    const now = new Date();
    const defaultHours: { [key in Meal['type']]: number } = {
      breakfast: 8,  // 08:00
      lunch: 13,     // 13:00
      dinner: 19,    // 19:00
      snack: 16,     // 16:00
    };
    now.setHours(defaultHours[type], 0, 0, 0);
    return now;
  };

  const handleAddMeal = (type: Meal['type']) => {
    // Aynı öğün tipinden zaten varsa ekleme
    const existingMeal = meals.find(meal => meal.type === type);
    if (existingMeal) {
      Alert.alert('Uyarı', `${getMealTypeName(type)} zaten eklenmiş!`);
      return;
    }

    setSelectedMealType(type);
    setSelectedTime(getDefaultTimeForMealType(type));
    setShowTimePicker(true);
    setShowMealSelector(false);
  };

  const handleTimeConfirm = () => {
    if (!selectedMealType) return;

    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    const newMeal: Meal = {
      id: Date.now().toString(),
      type: selectedMealType,
      name: getMealTypeName(selectedMealType),
      foods: [],
      totalCalories: 0,
      time: timeString,
    };

    setMeals([...meals, newMeal]);
    setShowTimePicker(false);
    setSelectedMealType(null);
  };

  const handleRemoveMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId));
  };

  const handleAddFood = (mealId: string) => {
    Alert.prompt(
      'Besin Ekle',
      'Besin adını girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Devam',
          onPress: (foodName: string | undefined) => {
            if (foodName && foodName.trim()) {
              // İkinci prompt: Miktar/Porsiyon
              Alert.prompt(
                'Miktar Belirtin',
                `${foodName.trim()} için miktar girin (örn: 4 adet, kibrit kutusu kadar, 100 gram):`,
                [
                  {
                    text: 'Atla',
                    onPress: () => {
                      const newFood: Food = {
                        id: Date.now().toString(),
                        name: foodName.trim(),
                        calories: 0,
                      };

                      const updatedMeals = meals.map(meal => {
                        if (meal.id === mealId) {
                          const updatedFoods = [...meal.foods, newFood];
                          return { ...meal, foods: updatedFoods };
                        }
                        return meal;
                      });
                      setMeals(updatedMeals);
                    }
                  },
                  {
                    text: 'Ekle',
                    onPress: (portion: string | undefined) => {
                      const newFood: Food = {
                        id: Date.now().toString(),
                        name: foodName.trim(),
                        calories: 0,
                        portion: portion?.trim() || undefined,
                      };

                      const updatedMeals = meals.map(meal => {
                        if (meal.id === mealId) {
                          const updatedFoods = [...meal.foods, newFood];
                          return { ...meal, foods: updatedFoods };
                        }
                        return meal;
                      });
                      setMeals(updatedMeals);
                    },
                  },
                ],
                'plain-text'
              );
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleRemoveFood = (mealId: string, foodId: string) => {
    const updatedMeals = meals.map(meal => {
      if (meal.id === mealId) {
        const updatedFoods = meal.foods.filter(f => f.id !== foodId);
        return { ...meal, foods: updatedFoods };
      }
      return meal;
    });
    setMeals(updatedMeals);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen plan başlığı girin!');
      return;
    }

    if (meals.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir öğün ekleyin!');
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        title: title.trim(),
        meals,
      };

      if (description.trim()) {
        updateData.description = description.trim();
      }

      if (dailyCalorieTarget) {
        updateData.dailyCalorieTarget = Number(dailyCalorieTarget);
      }

      if (dailyWaterGoal) {
        updateData.dailyWaterGoal = Number(dailyWaterGoal);
      }

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }

      await updateDietPlan(plan.id!, updateData);

      Alert.alert('Başarılı!', 'Plan güncellendi!', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Diyet Planını Düzenle</Text>
            <Text style={styles.headerSubtitle}>{plan.patientName}</Text>
          </View>

          {/* Temel Bilgiler */}
          <Text style={styles.sectionTitle}>📋 Plan Bilgileri</Text>

          <Text style={styles.label}>Plan Başlığı *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Haftalık Beslenme Planı"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Plan hakkında notlar..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Günlük Kalori Hedefi</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 2000"
            value={dailyCalorieTarget}
            onChangeText={setDailyCalorieTarget}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Günlük Su Hedefi (Litre)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              // Mevcut değeri selectedWaterGoal'a aktar
              if (dailyWaterGoal) {
                setSelectedWaterGoal(parseFloat(dailyWaterGoal));
              }
              setShowWaterGoalPicker(true);
            }}
          >
            <Text style={styles.pickerButtonText}>
              {dailyWaterGoal ? `${dailyWaterGoal} Litre` : 'Su hedefi seçin'}
            </Text>
            <Text style={styles.pickerButtonIcon}>▼</Text>
          </TouchableOpacity>

          {/* Öğünler */}
          <Text style={styles.sectionTitle}>🍽️ Öğünler</Text>

          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View>
                  <Text style={styles.mealTitle}>
                    {getMealTypeEmoji(meal.type)} {meal.name}
                  </Text>
                  {meal.time && (
                    <Text style={styles.mealTime}>🕐 {meal.time}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemoveMeal(meal.id)}>
                  <Text style={styles.removeButton}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {meal.foods.map((food) => (
                <View key={food.id} style={styles.foodItem}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>
                      {food.name}
                      {food.portion && <Text style={styles.foodPortion}> - {food.portion}</Text>}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveFood(meal.id, food.id)}>
                    <Text style={styles.removeFoodButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addFoodButton}
                onPress={() => handleAddFood(meal.id)}
              >
                <Text style={styles.addFoodButtonText}>+ Besin Ekle</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Öğün Ekle */}
          {!showMealSelector ? (
            <TouchableOpacity
              style={styles.addMealButton}
              onPress={() => setShowMealSelector(true)}
            >
              <Text style={styles.addMealButtonText}>+ Öğün Ekle</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.mealSelector}>
              <Text style={styles.mealSelectorTitle}>Öğün Türü Seçin:</Text>
              {mealTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.mealTypeButton}
                  onPress={() => handleAddMeal(type)}
                >
                  <Text style={styles.mealTypeButtonText}>
                    {getMealTypeEmoji(type)} {getMealTypeName(type)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMealSelector(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notlar */}
          <Text style={styles.label}>Notlar</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Danışana özel notlar..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Kaydet Butonu */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>✅ Değişiklikleri Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Saat Seçici Modal */}
      {showTimePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerTitle}>
                {selectedMealType && `${getMealTypeName(selectedMealType)} Saati`}
              </Text>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={(_, date) => {
                  if (date) setSelectedTime(date);
                }}
                textColor={colors.text}
              />
              <View style={styles.timePickerButtons}>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.cancelTimeButton]}
                  onPress={() => {
                    setShowTimePicker(false);
                    setSelectedMealType(null);
                  }}
                >
                  <Text style={styles.cancelTimeButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.confirmTimeButton]}
                  onPress={handleTimeConfirm}
                >
                  <Text style={styles.confirmTimeButtonText}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Su Hedefi Seçici Modal */}
      {showWaterGoalPicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showWaterGoalPicker}
          onRequestClose={() => setShowWaterGoalPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.waterPickerContainer}>
              <Text style={styles.waterPickerTitle}>Günlük Su Hedefi Seçin</Text>
              <Picker
                selectedValue={selectedWaterGoal}
                onValueChange={(value) => setSelectedWaterGoal(value)}
                style={styles.picker}
              >
                <Picker.Item label="1.0 Litre" value={1.0} />
                <Picker.Item label="1.5 Litre" value={1.5} />
                <Picker.Item label="2.0 Litre" value={2.0} />
                <Picker.Item label="2.5 Litre" value={2.5} />
                <Picker.Item label="3.0 Litre" value={3.0} />
                <Picker.Item label="3.5 Litre" value={3.5} />
                <Picker.Item label="4.0 Litre" value={4.0} />
                <Picker.Item label="4.5 Litre" value={4.5} />
                <Picker.Item label="5.0 Litre" value={5.0} />
              </Picker>
              <View style={styles.waterPickerButtons}>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.cancelTimeButton]}
                  onPress={() => setShowWaterGoalPicker(false)}
                >
                  <Text style={styles.cancelTimeButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.confirmTimeButton]}
                  onPress={() => {
                    setDailyWaterGoal(selectedWaterGoal.toString());
                    setShowWaterGoalPicker(false);
                  }}
                >
                  <Text style={styles.confirmTimeButtonText}>Seç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: colors.white,
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
  mealCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  mealTime: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 3,
  },
  removeButton: {
    fontSize: 20,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  foodPortion: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '400',
  },
  removeFoodButton: {
    fontSize: 18,
    color: colors.error,
    paddingHorizontal: 10,
  },
  addFoodButton: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addFoodButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  addMealButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addMealButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mealSelector: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  mealSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  mealTypeButton: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  mealTypeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textLight,
    fontSize: 15,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  timePickerButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelTimeButton: {
    backgroundColor: colors.background,
  },
  confirmTimeButton: {
    backgroundColor: colors.primary,
  },
  cancelTimeButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmTimeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerButton: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerButtonIcon: {
    fontSize: 12,
    color: colors.textLight,
  },
  waterPickerContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  waterPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  picker: {
    width: '100%',
  },
  waterPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
});