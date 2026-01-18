// src/screens/QuestionnaireScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import {
  GOAL_OPTIONS,
  DIETARY_RESTRICTIONS,
  HEALTH_CONDITIONS,
  FOOD_ALLERGIES,
  ACTIVITY_LEVELS,
  QuestionnaireResponse,
  QuestionnaireOption,
} from '../models/Questionnaire';
import { saveQuestionnaire } from '../services/questionnaireService';
import { User } from '../models/User';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QuestionnaireScreenProps {
  navigation: any;
  route?: {
    params?: {
      user?: User;
      selectedDietitianId?: string;
    };
  };
}

export default function QuestionnaireScreen({
  navigation,
  route,
}: QuestionnaireScreenProps) {
  const { user, selectedDietitianId } = route?.params || {};

  // Form state
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(75);
  const [targetWeight, setTargetWeight] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [selectedHealthConditions, setSelectedHealthConditions] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedActivityLevel, setSelectedActivityLevel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Modal states for pickers
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  const totalSteps = 6;

  // Generate picker data (memoized)
  const heightOptions = useMemo(() => Array.from({ length: 121 }, (_, i) => 100 + i), []); // 100-220 cm
  const weightOptions = useMemo(() => Array.from({ length: 151 }, (_, i) => 30 + i), []); // 30-180 kg

  const handleToggleMultiSelect = useCallback((
    selectedArray: string[],
    setSelectedArray: (items: string[]) => void,
    value: string
  ) => {
    if (selectedArray.includes(value)) {
      setSelectedArray(selectedArray.filter((item) => item !== value));
    } else {
      setSelectedArray([...selectedArray, value]);
    }
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        if (!height || !weight) {
          Alert.alert('Hata', 'Lütfen boy ve kilo bilgilerini girin!');
          return false;
        }
        if (height <= 0 || weight <= 0) {
          Alert.alert('Hata', 'Boy ve kilo 0\'dan büyük olmalıdır!');
          return false;
        }
        return true;
      case 2:
        if (selectedGoals.length === 0) {
          Alert.alert('Hata', 'Lütfen en az bir hedef seçin!');
          return false;
        }
        return true;
      case 3:
        if (selectedDietaryRestrictions.length === 0) {
          Alert.alert('Hata', 'Lütfen diyetisyen tavsiyesi seçin!');
          return false;
        }
        return true;
      case 4:
        return true; // Sağlık durumu opsiyonel
      case 5:
        return true; // Alerji opsiyonel
      case 6:
        if (!selectedActivityLevel) {
          Alert.alert('Hata', 'Lütfen aktivite seviyesi seçin!');
          return false;
        }
        return true;
      default:
        return true;
    }
  }, [height, weight, selectedGoals.length, selectedDietaryRestrictions.length, selectedActivityLevel]);

  const handleNextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  }, [currentStep, validateStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(totalSteps)) {
      return;
    }

    if (!user || !selectedDietitianId) {
      Alert.alert('Hata', 'Kullanıcı bilgileri eksik. Lütfen tekrar giriş yapın.');
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Questionnaire kaydediliyor...');

      const questionnaireData: Omit<QuestionnaireResponse, 'id' | 'completedAt' | 'updatedAt'> = {
        userId: user.id,
        dietitianId: selectedDietitianId,
        height: height,
        weight: weight,
        targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
        goals: selectedGoals,
        dietaryRestrictions: selectedDietaryRestrictions,
        healthConditions: selectedHealthConditions,
        foodAllergies: selectedAllergies,
        activityLevel: selectedActivityLevel as any,
      };

      const patientId = await saveQuestionnaire(
        questionnaireData,
        user.displayName,
        user.email,
        user.phone
      );

      console.log('✅ Questionnaire kaydedildi, patientId:', patientId);

      Alert.alert('Başarılı!', 'Profil bilgileriniz kaydedildi. Dashboard\'a yönlendiriliyorsunuz...', [
        {
          text: 'Tamam',
          onPress: () => {
            navigation.replace('PatientHome');
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Questionnaire kaydetme hatası:', error);
      Alert.alert('Hata', error.message || 'Profil kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDietitianId, height, weight, targetWeight, selectedGoals, selectedDietaryRestrictions, selectedHealthConditions, selectedAllergies, selectedActivityLevel, navigation, validateStep]);

  // Memoized FlatList render functions
  const renderHeightItem = useCallback(({ item }: { item: number }) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        height === item && styles.pickerItemSelected,
      ]}
      onPress={() => {
        setHeight(item);
        setShowHeightPicker(false);
      }}
    >
      <Text
        style={[
          styles.pickerItemText,
          height === item && styles.pickerItemTextSelected,
        ]}
      >
        {item} cm
      </Text>
      {height === item && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  ), [height]);

  const renderWeightItem = useCallback(({ item }: { item: number }) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        weight === item && styles.pickerItemSelected,
      ]}
      onPress={() => {
        setWeight(item);
        setShowWeightPicker(false);
      }}
    >
      <Text
        style={[
          styles.pickerItemText,
          weight === item && styles.pickerItemTextSelected,
        ]}
      >
        {item} kg
      </Text>
      {weight === item && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  ), [weight]);

  const keyExtractor = useCallback((item: number) => item.toString(), []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 60,
    offset: 60 * index,
    index,
  }), []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>📏 Vücut Ölçüleri</Text>
            <Text style={styles.stepSubtitle}>Başlangıç verilerinizi girin</Text>

            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Boy (cm)</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowHeightPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>{height}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Kilo (kg)</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowWeightPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>{weight}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hedef Kilo (kg) - İsteğe Bağlı</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 70"
                placeholderTextColor={colors.textLight}
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🎯 Hedefleriniz</Text>
            <Text style={styles.stepSubtitle}>Birden fazla seçebilirsiniz</Text>

            {GOAL_OPTIONS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.optionButton,
                  selectedGoals.includes(goal.id) && styles.optionButtonActive,
                ]}
                onPress={() =>
                  handleToggleMultiSelect(selectedGoals, setSelectedGoals, goal.id)
                }
              >
                <Text style={styles.optionIcon}>{goal.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedGoals.includes(goal.id) && styles.optionTextActive,
                  ]}
                >
                  {goal.label}
                </Text>
                <Ionicons
                  name={
                    selectedGoals.includes(goal.id)
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={24}
                  color={
                    selectedGoals.includes(goal.id) ? colors.primary : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🍽️ Diyetisyen Tavsiyesi</Text>
            <Text style={styles.stepSubtitle}>Beslenme tercihinizi seçin</Text>

            {DIETARY_RESTRICTIONS.map((restriction: QuestionnaireOption) => (
              <TouchableOpacity
                key={restriction.id}
                style={[
                  styles.optionButton,
                  selectedDietaryRestrictions.includes(restriction.id) &&
                    styles.optionButtonActive,
                ]}
                onPress={() =>
                  handleToggleMultiSelect(
                    selectedDietaryRestrictions,
                    setSelectedDietaryRestrictions,
                    restriction.id
                  )
                }
              >
                <Text style={styles.optionIcon}>{restriction.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedDietaryRestrictions.includes(restriction.id) &&
                      styles.optionTextActive,
                  ]}
                >
                  {restriction.label}
                </Text>
                <Ionicons
                  name={
                    selectedDietaryRestrictions.includes(restriction.id)
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={24}
                  color={
                    selectedDietaryRestrictions.includes(restriction.id)
                      ? colors.primary
                      : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🩺 Sağlık Durumu</Text>
            <Text style={styles.stepSubtitle}>Varsa seçin (İsteğe bağlı)</Text>

            {HEALTH_CONDITIONS.map((condition: QuestionnaireOption) => (
              <TouchableOpacity
                key={condition.id}
                style={[
                  styles.optionButton,
                  selectedHealthConditions.includes(condition.id) &&
                    styles.optionButtonActive,
                ]}
                onPress={() =>
                  handleToggleMultiSelect(
                    selectedHealthConditions,
                    setSelectedHealthConditions,
                    condition.id
                  )
                }
              >
                <Text style={styles.optionIcon}>{condition.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedHealthConditions.includes(condition.id) &&
                      styles.optionTextActive,
                  ]}
                >
                  {condition.label}
                </Text>
                <Ionicons
                  name={
                    selectedHealthConditions.includes(condition.id)
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={24}
                  color={
                    selectedHealthConditions.includes(condition.id)
                      ? colors.primary
                      : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🥜 Gıda Alerjileri</Text>
            <Text style={styles.stepSubtitle}>Varsa seçin (İsteğe bağlı)</Text>

            {FOOD_ALLERGIES.map((allergy: QuestionnaireOption) => (
              <TouchableOpacity
                key={allergy.id}
                style={[
                  styles.optionButton,
                  selectedAllergies.includes(allergy.id) && styles.optionButtonActive,
                ]}
                onPress={() =>
                  handleToggleMultiSelect(selectedAllergies, setSelectedAllergies, allergy.id)
                }
              >
                <Text style={styles.optionIcon}>{allergy.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedAllergies.includes(allergy.id) && styles.optionTextActive,
                  ]}
                >
                  {allergy.label}
                </Text>
                <Ionicons
                  name={
                    selectedAllergies.includes(allergy.id)
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={24}
                  color={
                    selectedAllergies.includes(allergy.id)
                      ? colors.primary
                      : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>⚡ Aktivite Seviyesi</Text>
            <Text style={styles.stepSubtitle}>Haftada kaç gün egzersiz yapıyorsunuz?</Text>

            {ACTIVITY_LEVELS.map((level: QuestionnaireOption) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionButton,
                  selectedActivityLevel === level.id && styles.optionButtonActive,
                ]}
                onPress={() => setSelectedActivityLevel(level.id)}
              >
                <Text style={styles.optionIcon}>{level.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedActivityLevel === level.id && styles.optionTextActive,
                  ]}
                >
                  {level.label}
                </Text>
                <Ionicons
                  name={
                    selectedActivityLevel === level.id
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={24}
                  color={
                    selectedActivityLevel === level.id ? colors.primary : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.headerTitle}>Profil Tamamlama</Text>
        <Text style={styles.headerSubtitle}>
          Adım {currentStep}/{totalSteps}
        </Text>
      </View>

      {/* Height Picker Modal */}
      <Modal
        visible={showHeightPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHeightPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Boy Seçin (cm)</Text>
              <TouchableOpacity onPress={() => setShowHeightPicker(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={heightOptions}
              keyExtractor={keyExtractor}
              renderItem={renderHeightItem}
              ItemSeparatorComponent={ItemSeparator}
              initialScrollIndex={heightOptions.indexOf(height)}
              getItemLayout={getItemLayout}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        </View>
      </Modal>

      {/* Weight Picker Modal */}
      <Modal
        visible={showWeightPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWeightPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kilo Seçin (kg)</Text>
              <TouchableOpacity onPress={() => setShowWeightPicker(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={weightOptions}
              keyExtractor={keyExtractor}
              renderItem={renderWeightItem}
              ItemSeparatorComponent={ItemSeparator}
              initialScrollIndex={weightOptions.indexOf(weight)}
              getItemLayout={getItemLayout}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        </View>
      </Modal>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressBar,
              { width: `${(currentStep / totalSteps) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 1 && styles.navButtonDisabled]}
          onPress={handlePreviousStep}
          disabled={currentStep === 1}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentStep === 1 ? colors.textLight : colors.primary}
          />
          <Text
            style={[
              styles.navButtonText,
              currentStep === 1 && styles.navButtonTextDisabled,
            ]}
          >
            Geri
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, loading && styles.actionButtonDisabled]}
          onPress={handleNextStep}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.actionButtonText}>
                {currentStep === totalSteps ? 'Tamamla' : 'İleri'}
              </Text>
              <Ionicons
                name={currentStep === totalSteps ? 'checkmark' : 'chevron-forward'}
                size={20}
                color={colors.white}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: 40,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 5,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  progressBackground: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  navButton: {
    flex: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  navButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  navButtonTextDisabled: {
    color: colors.textLight,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingHorizontal: 20,
  },
  pickerItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  pickerItemTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
});