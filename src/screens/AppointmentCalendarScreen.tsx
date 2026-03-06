import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import {
  getAvailableSlots,
  bookAppointment,
  getAppointmentHistory,
  createAvailabilitySlots,
  confirmAppointment,
  cancelAppointment
} from '../services/appointmentCalendarService';

export default function AppointmentCalendarScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    agenda: '',
    preparationNotes: '',
  });
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState({
    startTime: '09:00',
    endTime: '09:30',
    appointmentType: 'consultation',
    price: '',
    notes: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedDate && currentUser) {
      loadAvailableSlots();
    }
  }, [selectedDate, currentUser]);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user?.id) {
        const history = await getAppointmentHistory(user.id, user.role === 'admin' ? 'patient' : user.role);
        setAppointments(history);
      }
    } catch (error) {
    }
  };

  const loadAvailableSlots = async () => {
    try {
      if (!currentUser?.id || !selectedDate) {
        return;
      }

      if (currentUser.role === 'patient') {
        const slots = await getAvailableSlots(
          'diyetisyen_id',
          new Date(selectedDate),
          new Date(selectedDate)
        );
        setAvailableSlots(slots);
      } else {
        const slots = await getAvailableSlots(
          currentUser.id,
          new Date(selectedDate),
          new Date(selectedDate)
        );
        setAvailableSlots(slots);
      }
    } catch (error) {
      setAvailableSlots([]);
    }
  };

  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const handleSlotPress = (slot: any) => {
    if (currentUser?.role === 'patient') {
      setSelectedSlot(slot);
      setShowBookingModal(true);
    } else {
      Alert.alert(
        'Slot Detayları',
        `${slot.startTime} - ${slot.endTime}\nTip: ${slot.appointmentType}\nFiyat: ${slot.price || 'Ücretsiz'}`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Düzenle', onPress: () => editSlot(slot) },
        ]
      );
    }
  };

  const handleBookAppointment = async () => {
    try {
      if (!selectedSlot || !currentUser) return;

      await bookAppointment(
        selectedSlot.id,
        currentUser.id,
        currentUser.displayName,
        bookingForm.agenda,
        bookingForm.preparationNotes
      );

      Alert.alert('Başarılı', 'Randevunuz başarıyla rezerve edildi!');
      setShowBookingModal(false);
      setBookingForm({ agenda: '', preparationNotes: '' });
      loadAvailableSlots();
      loadUserData();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleCreateSlot = async () => {
    try {
      if (!currentUser || currentUser.role !== 'dietitian') return;

      const slots = [{
        date: selectedDate,
        startTime: newSlotForm.startTime,
        endTime: newSlotForm.endTime,
        isAvailable: true,
        isRecurring: false,
        maxDuration: calculateDuration(newSlotForm.startTime, newSlotForm.endTime),
        appointmentType: newSlotForm.appointmentType as any,
        price: newSlotForm.price ? parseFloat(newSlotForm.price) : undefined,
        notes: newSlotForm.notes,
      }];

      await createAvailabilitySlots(currentUser.id, slots);

      Alert.alert('Başarılı', 'Müsaitlik slotu oluşturuldu!');
      setShowCreateSlotModal(false);
      setNewSlotForm({
        startTime: '09:00',
        endTime: '09:30',
        appointmentType: 'consultation',
        price: '',
        notes: '',
      });
      loadAvailableSlots();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await confirmAppointment(appointmentId, currentUser.id);
      Alert.alert('Başarılı', 'Randevu onaylandı!');
      loadUserData();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Randevu İptali',
      'Bu randevuyu iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(appointmentId, currentUser.id, 'Kullanıcı talebi');
              Alert.alert('Başarılı', 'Randevu iptal edildi');
              loadUserData();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          }
        }
      ]
    );
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const editSlot = (slot: any) => {
    // Slot düzenleme modalı açılacak
  };

  const getMarkedDates = () => {
    const marked: any = {};

    appointments.forEach(appointment => {
      const date = appointment.appointmentDate.toDate().toISOString().split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: appointment.status === 'confirmed' ? colors.primary : colors.warning,
      };
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.primary;
      case 'scheduled': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'scheduled': return 'Planlandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  const renderSlot = (slot: any) => (
    <TouchableOpacity
      key={slot.id}
      style={[styles.slotCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => handleSlotPress(slot)}
    >
      <View style={styles.slotHeader}>
        <Text style={[styles.slotTime, { color: colors.text }]}>
          {slot.startTime} - {slot.endTime}
        </Text>
        <Text style={[styles.slotType, { color: colors.primary }]}>{slot.appointmentType}</Text>
      </View>

      {slot.price && (
        <Text style={[styles.slotPrice, { color: colors.success }]}>₺{slot.price}</Text>
      )}

      {slot.notes && (
        <Text style={[styles.slotNotes, { color: colors.textLight }]}>{slot.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const renderAppointment = (appointment: any) => (
    <View key={appointment.id} style={[styles.appointmentCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.appointmentHeader}>
        <Text style={[styles.appointmentDate, { color: colors.text }]}>
          {appointment.appointmentDate.toDate().toLocaleDateString('tr-TR')}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
        </View>
      </View>

      <Text style={[styles.appointmentTime, { color: colors.textLight }]}>
        {appointment.appointmentDate.toDate().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>

      <Text style={[styles.appointmentWith, { color: colors.text }]}>
        {currentUser?.role === 'patient' ? appointment.dietitianName : appointment.patientName}
      </Text>

      {appointment.agenda && (
        <Text style={[styles.appointmentAgenda, { color: colors.textLight }]}>{appointment.agenda}</Text>
      )}

      <View style={styles.appointmentActions}>
        {appointment.status === 'scheduled' && currentUser?.role === 'dietitian' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleConfirmAppointment(appointment.id)}
          >
            <Text style={styles.actionButtonText}>Onayla</Text>
          </TouchableOpacity>
        )}

        {appointment.videoCallId && appointment.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: colors.success }]}
            onPress={() => navigation.navigate('VideoCall', {
              callId: appointment.videoCallId,
              roomId: appointment.meetingLink?.split('/').pop()
            })}
          >
            <Ionicons name="videocam" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Katıl</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={() => handleCancelAppointment(appointment.id)}
        >
          <Text style={styles.actionButtonText}>İptal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Randevu Takvimi</Text>
        {currentUser?.role === 'dietitian' && (
          <TouchableOpacity onPress={() => setShowCreateSlotModal(true)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <Calendar
        onDayPress={handleDateSelect}
        markedDates={getMarkedDates()}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.cardBackground,
          textSectionTitleColor: colors.textLight,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#FFF',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textLight,
          dotColor: colors.primary,
          selectedDotColor: '#FFF',
          arrowColor: colors.primary,
          monthTextColor: colors.text,
        } as any}
        minDate={new Date().toISOString().split('T')[0]}
      />

      {selectedDate && (
        <View style={styles.slotsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {new Date(selectedDate).toLocaleDateString('tr-TR')} - Müsait Saatler
          </Text>

          {availableSlots.length > 0 ? (
            availableSlots.map(renderSlot)
          ) : (
            <Text style={[styles.noSlotsText, { color: colors.textLight }]}>Bu tarihte müsait slot bulunmuyor</Text>
          )}
        </View>
      )}

      <View style={styles.appointmentsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Randevularım</Text>
        {appointments.length > 0 ? (
          appointments.map(renderAppointment)
        ) : (
          <Text style={[styles.noAppointmentsText, { color: colors.textLight }]}>Henüz randevunuz bulunmuyor</Text>
        )}
      </View>

      {/* Booking Modal */}
      <Modal visible={showBookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Randevu Rezervasyonu</Text>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="Görüşme konusu (opsiyonel)"
              placeholderTextColor={colors.textLight}
              value={bookingForm.agenda}
              onChangeText={(text) => setBookingForm({...bookingForm, agenda: text})}
              multiline
            />

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="Hazırlık notları (opsiyonel)"
              placeholderTextColor={colors.textLight}
              value={bookingForm.preparationNotes}
              onChangeText={(text) => setBookingForm({...bookingForm, preparationNotes: text})}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textLight }]}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={handleBookAppointment}
              >
                <Text style={styles.modalConfirmText}>Rezerve Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Slot Modal */}
      <Modal visible={showCreateSlotModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yeni Müsaitlik Slotu</Text>

            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="09:00"
                placeholderTextColor={colors.textLight}
                value={newSlotForm.startTime}
                onChangeText={(text) => setNewSlotForm({...newSlotForm, startTime: text})}
              />
              <Text style={[styles.timeSeparator, { color: colors.textLight }]}>-</Text>
              <TextInput
                style={[styles.input, styles.timeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="09:30"
                placeholderTextColor={colors.textLight}
                value={newSlotForm.endTime}
                onChangeText={(text) => setNewSlotForm({...newSlotForm, endTime: text})}
              />
            </View>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="Fiyat (opsiyonel)"
              placeholderTextColor={colors.textLight}
              value={newSlotForm.price}
              onChangeText={(text) => setNewSlotForm({...newSlotForm, price: text})}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="Notlar (opsiyonel)"
              placeholderTextColor={colors.textLight}
              value={newSlotForm.notes}
              onChangeText={(text) => setNewSlotForm({...newSlotForm, notes: text})}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => setShowCreateSlotModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textLight }]}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateSlot}
              >
                <Text style={styles.modalConfirmText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  slotsSection: {
    padding: 16,
  },
  appointmentsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  slotCard: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  slotType: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  slotPrice: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  slotNotes: {
    fontSize: 12,
  },
  appointmentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  appointmentTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  appointmentWith: {
    fontSize: 14,
    marginBottom: 8,
  },
  appointmentAgenda: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noSlotsText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
  },
  noAppointmentsText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
  },
  timeSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
