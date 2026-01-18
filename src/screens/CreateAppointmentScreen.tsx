import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { createAppointment } from '../services/appointmentService';
import { getDietitianPatients } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';

interface Patient {
  id: string;
  name: string;
  phone?: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
}

export default function CreateAppointmentScreen({ navigation }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.id) {
        await loadPatients(user.id);
      }
      setTodayAsDefault();
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const setTodayAsDefault = () => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setMarkedDates({
      [dateString]: { selected: true, selectedColor: '#65C18C' },
    });
  };

  const loadPatients = async (dietitianId: string) => {
    try {
      const patientsList = await getDietitianPatients(dietitianId);
      setPatients(patientsList);
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Hata', 'Hastalar yüklenirken hata oluştu');
    }
  };

  const handleDateSelect = (day: any) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    setMarkedDates({
      [dateString]: { selected: true, selectedColor: '#65C18C' },
    });
  };

  const timeSlots: TimeSlot[] = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots.push({
        hour,
        minute,
        display: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      });
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const validateInputs = (): boolean => {
    if (!selectedDate) {
      Alert.alert('Uyarı', 'Lütfen randevu tarihini seçiniz');
      return false;
    }
    if (!selectedTime) {
      Alert.alert('Uyarı', 'Lütfen randevu saatini seçiniz');
      return false;
    }
    if (!selectedPatient) {
      Alert.alert('Uyarı', 'Lütfen bir hasta seçiniz');
      return false;
    }
    if (!meetingLink.trim()) {
      Alert.alert('Uyarı', 'Lütfen meeting linki giriniz');
      return false;
    }

    try {
      new URL(meetingLink);
    } catch {
      Alert.alert('Hata', 'Lütfen geçerli bir URL giriniz');
      return false;
    }

    return true;
  };

  const handleCreateAppointment = async () => {
    if (!validateInputs() || !currentUser?.id) return;

    setLoading(true);
    try {
      await createAppointment(
        currentUser.id,
        {
          patientId: selectedPatient!.id,
          date: selectedDate,
          time: selectedTime,
          meetingLink,
          notes,
        },
        selectedPatient!.name,
        currentUser.displayName || 'Diyetisyen'
      );

      Alert.alert('Başarılı', 'Randevu başarıyla oluşturuldu', [
        {
          text: 'Tamam',
          onPress: () => {
            setSelectedDate('');
            setSelectedTime('');
            setMeetingLink('');
            setNotes('');
            setSelectedPatient(null);
            setTodayAsDefault();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Hata', 'Randevu oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yeni Randevu</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarih Seçiniz</Text>
        <Calendar
          current={new Date().toISOString().split('T')[0]}
          minDate={new Date().toISOString().split('T')[0]}
          maxDate={
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          }
          onDayPress={handleDateSelect}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: '#65C18C',
            selectedDayTextColor: '#fff',
            todayTextColor: '#65C18C',
            todayBackgroundColor: '#fff',
            dotColor: '#65C18C',
            selectedDotColor: '#fff',
            backgroundColor: '#fff',
            calendarBackground: '#fff',
            textSectionTitleColor: '#333',
            textSectionTitleDisabledColor: '#ccc',
            dayTextColor: '#333',
            textDisabledColor: '#ccc',
            monthTextColor: '#333',
            indicatorColor: '#65C18C',
            arrowColor: '#65C18C',
          } as any}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hasta Seçiniz</Text>
        <TouchableOpacity
          style={[styles.input, { paddingRight: 0 }]}
          onPress={() => setShowPatientModal(true)}
        >
          <Text
            style={[
              styles.inputText,
              { color: selectedPatient ? '#333' : '#999' },
            ]}
          >
            {selectedPatient ? selectedPatient.name : 'Hasta seçiniz...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#65C18C" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saat Seçiniz</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.display}
              style={[
                styles.timeSlot,
                selectedTime === slot.display && styles.timeSlotSelected,
              ]}
              onPress={() => handleTimeSelect(slot.display)}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  selectedTime === slot.display && styles.timeSlotTextSelected,
                ]}
              >
                {slot.display}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meeting Linki</Text>
        <TextInput
          style={styles.input}
          placeholder="https://zoom.us/j/..."
          value={meetingLink}
          onChangeText={setMeetingLink}
          placeholderTextColor="#999"
        />
        <Text style={styles.helperText}>
          Zoom, Google Meet, Microsoft Teams vb. linki ekleyiniz
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notlar (İsteğe Bağlı)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Randevu hakkında notlar..."
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreateAppointment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Randevu Oluştur</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={showPatientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hasta Seçiniz</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={patients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.patientItem,
                    selectedPatient?.id === item.id && styles.patientItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedPatient(item);
                    setShowPatientModal(false);
                  }}
                >
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{item.name}</Text>
                    {item.phone && (
                      <Text style={styles.patientPhone}>{item.phone}</Text>
                    )}
                  </View>
                  {selectedPatient?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#65C18C" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  textArea: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    width: '23%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  timeSlotSelected: {
    borderColor: '#65C18C',
    backgroundColor: '#E0F2E9',
  },
  timeSlotText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#65C18C',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    backgroundColor: '#65C18C',
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patientItemSelected: {
    backgroundColor: '#E0F2E9',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  patientPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});