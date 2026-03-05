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
import { colors } from '../constants/colors';
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
        // Danışan için: Diyetisyenin müsait slotlarını göster
        // Bu örnekte tüm diyetisyenlerin slotları gösteriliyor
        // Gerçekte danışanın diyetisyeninin slotları gösterilecek
        const slots = await getAvailableSlots(
          'diyetisyen_id', // Gerçekte currentUser.dietitianId
          new Date(selectedDate),
          new Date(selectedDate)
        );
        setAvailableSlots(slots);
      } else {
        // Diyetisyen için: Kendi slotlarını göster
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
      // Danışan için: Randevu rezervasyonu
      setSelectedSlot(slot);
      setShowBookingModal(true);
    } else {
      // Diyetisyen için: Slot detayları veya düzenleme
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
    
    // Randevuları işaretle
    appointments.forEach(appointment => {
      const date = appointment.appointmentDate.toDate().toISOString().split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: appointment.status === 'confirmed' ? colors.primary : colors.warning,
      };
    });

    // Seçili tarihi işaretle
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  };

  const renderSlot = (slot: any) => (
    <TouchableOpacity
      key={slot.id}
      style={styles.slotCard}
      onPress={() => handleSlotPress(slot)}
    >
      <View style={styles.slotHeader}>
        <Text style={styles.slotTime}>
          {slot.startTime} - {slot.endTime}
        </Text>
        <Text style={styles.slotType}>{slot.appointmentType}</Text>
      </View>
      
      {slot.price && (
        <Text style={styles.slotPrice}>₺{slot.price}</Text>
      )}
      
      {slot.notes && (
        <Text style={styles.slotNotes}>{slot.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const renderAppointment = (appointment: any) => (
    <View key={appointment.id} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.appointmentDate}>
          {appointment.appointmentDate.toDate().toLocaleDateString('tr-TR')}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.appointmentTime}>
        {appointment.appointmentDate.toDate().toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
      
      <Text style={styles.appointmentWith}>
        {currentUser?.role === 'patient' ? appointment.dietitianName : appointment.patientName}
      </Text>
      
      {appointment.agenda && (
        <Text style={styles.appointmentAgenda}>{appointment.agenda}</Text>
      )}
      
      <View style={styles.appointmentActions}>
        {appointment.status === 'scheduled' && currentUser?.role === 'dietitian' && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => handleConfirmAppointment(appointment.id)}
          >
            <Text style={styles.confirmButtonText}>Onayla</Text>
          </TouchableOpacity>
        )}
        
        {appointment.videoCallId && appointment.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => navigation.navigate('VideoCall', { 
              callId: appointment.videoCallId,
              roomId: appointment.meetingLink?.split('/').pop()
            })}
          >
            <Ionicons name="videocam" size={16} color={colors.white} />
            <Text style={styles.joinButtonText}>Katıl</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelAppointment(appointment.id)}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.primary;
      case 'scheduled': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.gray;
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevu Takvimi</Text>
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
          selectedDayBackgroundColor: colors.primary,
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
        }}
        minDate={new Date().toISOString().split('T')[0]}
      />

      {selectedDate && (
        <View style={styles.slotsSection}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate).toLocaleDateString('tr-TR')} - Müsait Saatler
          </Text>
          
          {availableSlots.length > 0 ? (
            availableSlots.map(renderSlot)
          ) : (
            <Text style={styles.noSlotsText}>Bu tarihte müsait slot bulunmuyor</Text>
          )}
        </View>
      )}

      <View style={styles.appointmentsSection}>
        <Text style={styles.sectionTitle}>Randevularım</Text>
        {appointments.length > 0 ? (
          appointments.map(renderAppointment)
        ) : (
          <Text style={styles.noAppointmentsText}>Henüz randevunuz bulunmuyor</Text>
        )}
      </View>

      {/* Booking Modal */}
      <Modal visible={showBookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Randevu Rezervasyonu</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Görüşme konusu (opsiyonel)"
              value={bookingForm.agenda}
              onChangeText={(text) => setBookingForm({...bookingForm, agenda: text})}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Hazırlık notları (opsiyonel)"
              value={bookingForm.preparationNotes}
              onChangeText={(text) => setBookingForm({...bookingForm, preparationNotes: text})}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Müsaitlik Slotu</Text>
            
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="09:00"
                value={newSlotForm.startTime}
                onChangeText={(text) => setNewSlotForm({...newSlotForm, startTime: text})}
              />
              <Text style={styles.timeSeparator}>-</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="09:30"
                value={newSlotForm.endTime}
                onChangeText={(text) => setNewSlotForm({...newSlotForm, endTime: text})}
              />
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Fiyat (opsiyonel)"
              value={newSlotForm.price}
              onChangeText={(text) => setNewSlotForm({...newSlotForm, price: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Notlar (opsiyonel)"
              value={newSlotForm.notes}
              onChangeText={(text) => setNewSlotForm({...newSlotForm, notes: text})}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCreateSlotModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
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
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
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
    color: colors.darkGray,
    marginBottom: 12,
  },
  slotCard: {
    backgroundColor: colors.lightGray,
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
    color: colors.darkGray,
  },
  slotType: {
    fontSize: 14,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  slotPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
    marginBottom: 4,
  },
  slotNotes: {
    fontSize: 12,
    color: colors.gray,
  },
  appointmentCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
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
    color: colors.darkGray,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '500',
  },
  appointmentTime: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  appointmentWith: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 8,
  },
  appointmentAgenda: {
    fontSize: 14,
    color: colors.gray,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  noSlotsText: {
    textAlign: 'center',
    color: colors.gray,
    fontSize: 14,
    marginTop: 20,
  },
  noAppointmentsText: {
    textAlign: 'center',
    color: colors.gray,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
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
    color: colors.gray,
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
    borderColor: colors.lightGray,
  },
  modalCancelText: {
    color: colors.gray,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});