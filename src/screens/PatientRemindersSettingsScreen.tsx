// src/screens/PatientRemindersSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getPatientReminders,
  setWeightReminder,
  setMealPhotoReminder,
  createCustomReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
} from '../services/reminderService';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAYS_SHORT = ['Pz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export default function PatientRemindersSettingsScreen({ route, navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors);
  const patientId = route.params?.patientId;
  const patientName = route.params?.patientName;

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);

  // Weight Reminder States
  const [weightEnabled, setWeightEnabled] = useState(true);
  const [weightDays, setWeightDays] = useState<number[]>([0]); // Default: Pazar
  const [weightTime, setWeightTime] = useState('08:00');
  const [showWeightTimePicker, setShowWeightTimePicker] = useState(false);

  // Meal Photo States
  const [mealEnabled, setMealEnabled] = useState(true);
  const [mealTimes, setMealTimes] = useState(['08:00', '13:00', '19:00']); // Kahvaltı, Öğle, Akşam
  const [showMealTimePicker, setShowMealTimePicker] = useState(false);
  const [mealTimeIndex, setMealTimeIndex] = useState(0);

  // Custom Reminder States
  const [customReminders, setCustomReminders] = useState<any[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDays, setCustomDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [customTime, setCustomTime] = useState('10:00');
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      // Eğer patientId yoksa (hasta kendi ayarlarını düzenliyor), getCurrentUser'dan al
      let userId = patientId;
      if (!userId) {
        const { getCurrentUser } = await import('../services/authService');
        const currentUser = await getCurrentUser();
        userId = currentUser?.id;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      const data = await getPatientReminders(userId);

      // Weight reminder
      const weightReminder = data.find((r) => r.type === 'weight');
      if (weightReminder) {
        setWeightEnabled(weightReminder.enabled);
        setWeightDays(weightReminder.days || [0]);
        setWeightTime(weightReminder.time || '08:00');
      }

      // Meal photo reminder
      const mealReminder = data.find((r) => r.type === 'mealPhoto');
      if (mealReminder) {
        setMealEnabled(mealReminder.enabled);
        setMealTimes(mealReminder.times || ['08:00', '13:00', '19:00']);
      }

      // Custom reminders
      const custom = data.filter((r) => r.type === 'custom');
      setCustomReminders(custom);

      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Hata', 'Hatırlatıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReminders = async () => {
    try {
      setSaving(true);

      // Eğer patientId yoksa (hasta kendi ayarlarını düzenliyor), getCurrentUser'dan al
      let userId = patientId;
      if (!userId) {
        const { getCurrentUser } = await import('../services/authService');
        const currentUser = await getCurrentUser();
        userId = currentUser?.id;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Save weight reminder
      await setWeightReminder(userId, weightDays, weightTime, weightEnabled);

      // Save meal photo reminder
      await setMealPhotoReminder(userId, mealTimes, mealEnabled);

      Alert.alert('Başarılı', 'Hatırlatıcılar kaydedildi! 🎉');
      await loadReminders();
    } catch (error) {
      console.error('Error saving reminders:', error);
      Alert.alert('Hata', 'Hatırlatıcılar kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomReminder = async () => {
    if (!customTitle.trim()) {
      Alert.alert('Hata', 'Başlık boş olamaz!');
      return;
    }

    try {
      setSaving(true);

      // Eğer patientId yoksa (hasta kendi ayarlarını düzenliyor), getCurrentUser'dan al
      let userId = patientId;
      if (!userId) {
        const { getCurrentUser } = await import('../services/authService');
        const currentUser = await getCurrentUser();
        userId = currentUser?.id;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      await createCustomReminder(userId, customTitle, customDescription, customDays, customTime);

      setCustomTitle('');
      setCustomDescription('');
      setCustomDays([0, 1, 2, 3, 4, 5, 6]);
      setCustomTime('10:00');
      setShowCustomModal(false);

      Alert.alert('Başarılı', 'Custom hatırlatıcı eklendi!');
      await loadReminders();
    } catch (error) {
      console.error('Error adding custom reminder:', error);
      Alert.alert('Hata', 'Custom hatırlatıcı eklenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomReminder = async (reminderId: string) => {
    Alert.alert('Sil', 'Bu hatırlatıcıyı silmek istediğinizden emin misiniz?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet, Sil',
        onPress: async () => {
          try {
            setSaving(true);
            await deleteReminder(reminderId);
            Alert.alert('Başarılı', 'Hatırlatıcı silindi');
            await loadReminders();
          } catch (error) {
            Alert.alert('Hata', 'Silme işleminde hata oluştu');
          } finally {
            setSaving(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleWeightTimePicker = (event: any, selectedTime: any) => {
    setShowWeightTimePicker(false);
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setWeightTime(`${hours}:${minutes}`);
    }
  };

  const handleMealTimePicker = (event: any, selectedTime: any) => {
    setShowMealTimePicker(false);
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const newTimes = [...mealTimes];
      newTimes[mealTimeIndex] = `${hours}:${minutes}`;
      setMealTimes(newTimes);
    }
  };

  const handleCustomTimePicker = (event: any, selectedTime: any) => {
    setShowCustomTimePicker(false);
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setCustomTime(`${hours}:${minutes}`);
    }
  };

  const toggleWeightDay = (day: number) => {
    if (weightDays.includes(day)) {
      setWeightDays(weightDays.filter((d) => d !== day));
    } else {
      setWeightDays([...weightDays, day]);
    }
  };

  const toggleCustomDay = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter((d) => d !== day));
    } else {
      setCustomDays([...customDays, day]);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Hatırlatıcı Ayarları</Text>
          <Text style={styles.headerSubtitle}>{patientName}</Text>
        </View>

        {/* Weight Reminder Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Kilo Ölçümü</Text>
            <Switch
              value={weightEnabled}
              onValueChange={setWeightEnabled}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={weightEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          {weightEnabled && (
            <>
              {/* Day Selection */}
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Günler:</Text>
                <View style={styles.dayGridContainer}>
                  {DAYS_SHORT.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        weightDays.includes(index) && styles.dayButtonActive,
                      ]}
                      onPress={() => toggleWeightDay(index)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          weightDays.includes(index) && styles.dayButtonTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Selection */}
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Saat:</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowWeightTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color={colors.primary} />
                  <Text style={styles.timeButtonText}>{weightTime}</Text>
                </TouchableOpacity>
              </View>

              {showWeightTimePicker && (
                <DateTimePicker
                  value={
                    new Date(`2024-01-01T${weightTime}:00`)
                  }
                  mode="time"
                  display="spinner"
                  onChange={handleWeightTimePicker}
                />
              )}
            </>
          )}
        </View>

        {/* Meal Photo Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📸 Öğün Fotoğrafı</Text>
            <Switch
              value={mealEnabled}
              onValueChange={setMealEnabled}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={mealEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          {mealEnabled && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Saatler:</Text>

              {/* Breakfast */}
              <View style={styles.mealRow}>
                <Text style={styles.mealLabel}>🥐 Kahvaltı</Text>
                <TouchableOpacity
                  style={styles.timeMealButton}
                  onPress={() => {
                    setMealTimeIndex(0);
                    setShowMealTimePicker(true);
                  }}
                >
                  <Text style={styles.timeMealButtonText}>{mealTimes[0]}</Text>
                </TouchableOpacity>
              </View>

              {/* Lunch */}
              <View style={styles.mealRow}>
                <Text style={styles.mealLabel}>🍽️ Öğle Yemeği</Text>
                <TouchableOpacity
                  style={styles.timeMealButton}
                  onPress={() => {
                    setMealTimeIndex(1);
                    setShowMealTimePicker(true);
                  }}
                >
                  <Text style={styles.timeMealButtonText}>{mealTimes[1]}</Text>
                </TouchableOpacity>
              </View>

              {/* Dinner */}
              <View style={styles.mealRow}>
                <Text style={styles.mealLabel}>🍴 Akşam Yemeği</Text>
                <TouchableOpacity
                  style={styles.timeMealButton}
                  onPress={() => {
                    setMealTimeIndex(2);
                    setShowMealTimePicker(true);
                  }}
                >
                  <Text style={styles.timeMealButtonText}>{mealTimes[2]}</Text>
                </TouchableOpacity>
              </View>

              {showMealTimePicker && (
                <DateTimePicker
                  value={new Date(`2024-01-01T${mealTimes[mealTimeIndex]}:00`)}
                  mode="time"
                  display="spinner"
                  onChange={handleMealTimePicker}
                />
              )}
            </View>
          )}
        </View>

        {/* Custom Reminders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Custom Hatırlatıcılar</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCustomModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {customReminders.length === 0 ? (
            <Text style={styles.emptyText}>Henüz custom hatırlatıcı eklenmemiş</Text>
          ) : (
            <FlatList
              data={customReminders}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.customReminderCard}>
                  <View style={styles.customReminderInfo}>
                    <Text style={styles.customReminderTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.customReminderDescription}>{item.description}</Text>
                    )}
                    <Text style={styles.customReminderTime}>
                      ⏰ {item.time} - {item.days.map((d: number) => DAYS_SHORT[d]).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => item.id && handleDeleteCustomReminder(item.id)}
                  >
                    <Ionicons name="trash" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveReminders}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Reminder Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Custom Hatırlatıcı</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Başlık *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Su iç, Egzersiz yap, vs."
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholderTextColor="#ccc"
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Açıklama</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Opsiyonel açıklama"
                  value={customDescription}
                  onChangeText={setCustomDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#ccc"
                />
              </View>

              {/* Days Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Günler:</Text>
                <View style={styles.dayGridContainer}>
                  {DAYS_SHORT.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        customDays.includes(index) && styles.dayButtonActive,
                      ]}
                      onPress={() => toggleCustomDay(index)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          customDays.includes(index) && styles.dayButtonTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Saat:</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowCustomTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color={colors.primary} />
                  <Text style={styles.timeButtonText}>{customTime}</Text>
                </TouchableOpacity>
              </View>

              {showCustomTimePicker && (
                <DateTimePicker
                  value={new Date(`2024-01-01T${customTime}:00`)}
                  mode="time"
                  display="spinner"
                  onChange={handleCustomTimePicker}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addCustomButton}
                onPress={handleAddCustomReminder}
              >
                <Text style={styles.addCustomButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subsection: {
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 10,
  },
  dayGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  dayButtonTextActive: {
    color: colors.white,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9F9F9',
    gap: 10,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  timeMealButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#F0F8F5',
  },
  timeMealButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  addButton: {
    padding: 5,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 15,
  },
  customReminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customReminderInfo: {
    flex: 1,
  },
  customReminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customReminderDescription: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 4,
  },
  customReminderTime: {
    fontSize: 11,
    color: colors.textLight,
  },
  deleteButton: {
    padding: 8,
  },
  bottomContainer: {
    padding: 15,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#F9F9F9',
  },
  textAreaInput: {
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addCustomButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  addCustomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});