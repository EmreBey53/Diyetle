import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getDietitianAppointments,
  cancelAppointment,
  subscribeToAppointments,
} from '../services/appointmentService';
import { getCurrentUser } from '../services/authService';
import { Appointment } from '../models/Appointment';

export default function DietitianAppointmentsScreen({ navigation }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.id) {
        await loadAppointments(user.id);
        subscribeToAppointments(user.id, setAppointments);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (currentUser?.id) {
        loadAppointments(currentUser.id);
      }
    });
    return unsubscribe;
  }, [navigation, currentUser]);

  const loadAppointments = async (dietitianId: string) => {
    try {
      setLoading(true);
      const apts = await getDietitianAppointments(dietitianId);
      setAppointments(apts);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Hata', 'Randevular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser?.id) {
      await loadAppointments(currentUser.id);
    }
    setRefreshing(false);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    Alert.alert(
      'Randevu İptal Edilsin mi?',
      `${appointment.patientName} ile ${appointment.date} tarihindeki randevu iptal edilsin mi?`,
      [
        { text: 'Hayır', onPress: () => {}, style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          onPress: async () => {
            try {
              await cancelAppointment(appointment.id);
              Alert.alert('Başarılı', 'Randevu iptal edildi');
              setShowDetailModal(false);
              if (currentUser?.id) {
                await loadAppointments(currentUser.id);
              }
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Hata', 'Randevu iptal edilirken hata oluştu');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleShareMeetingLink = async (appointment: Appointment) => {
    try {
      await Share.share({
        message: `Randevu Detayları:\n\nTarih: ${appointment.date}\nSaat: ${appointment.time}\n\nMeeting Linki:\n${appointment.meetingLink}\n\n${
          appointment.notes ? `Notlar: ${appointment.notes}` : ''
        }`,
        title: `${appointment.patientName} - Randevu`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const now = Date.now();
  const upcomingAppointments = appointments.filter(
    (apt) => apt.startDateTime > now && apt.status === 'scheduled'
  );
  const pastAppointments = appointments.filter(
    (apt) => apt.startDateTime <= now || apt.status === 'cancelled'
  );

  const displayedAppointments = selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const isUpcoming = appointment.startDateTime > now && appointment.status === 'scheduled';
    const appointmentDate = new Date(appointment.startDateTime);
    const daysUntil = Math.ceil((appointment.startDateTime - now) / (1000 * 60 * 60 * 24));

    return (
      <TouchableOpacity
        style={[styles.appointmentCard, !isUpcoming && styles.appointmentCardPast]}
        onPress={() => {
          setSelectedAppointment(appointment);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.dateBox, !isUpcoming && styles.dateBoxPast]}>
            <Text style={[styles.dayNumber, !isUpcoming && styles.dayNumberPast]}>
              {appointmentDate.getDate()}
            </Text>
            <Text style={[styles.monthText, !isUpcoming && styles.monthTextPast]}>
              {appointmentDate.toLocaleDateString('tr-TR', { month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.cardMiddle}>
          <Text style={[styles.patientName, !isUpcoming && styles.textPast]}>
            {appointment.patientName}
          </Text>
          <Text style={[styles.appointmentTime, !isUpcoming && styles.textPast]}>
            <Ionicons name="time" size={14} color={isUpcoming ? '#65C18C' : '#999'} />
            {' '}
            {appointment.time}
          </Text>
          {isUpcoming && daysUntil <= 1 && (
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Yakında</Text>
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          <View
            style={[
              styles.statusBadge,
              isUpcoming ? styles.statusBadgeScheduled : styles.statusBadgeCompleted,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {isUpcoming ? 'Planlandı' : 'Geçmiş'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Randevularım</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateAppointment')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.tabActive]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'upcoming' && styles.tabTextActive,
            ]}
          >
            Yaklaşan ({upcomingAppointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.tabActive]}
          onPress={() => setSelectedTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'past' && styles.tabTextActive,
            ]}
          >
            Geçmiş ({pastAppointments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#65C18C" />
        </View>
      ) : displayedAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            {selectedTab === 'upcoming'
              ? 'Yaklaşan randevu bulunmamaktadır'
              : 'Geçmiş randevu bulunmamaktadır'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedAppointments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AppointmentCard appointment={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Randevu Detayları</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Hasta Bilgisi</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-circle" size={20} color="#65C18C" />
                    <Text style={styles.infoText}>{selectedAppointment.patientName}</Text>
                  </View>
                  {selectedAppointment.patientPhone && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call" size={20} color="#65C18C" />
                      <Text style={styles.infoText}>
                        {selectedAppointment.patientPhone}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Randevu Bilgisi</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={20} color="#65C18C" />
                    <Text style={styles.infoText}>
                      {new Date(selectedAppointment.date).toLocaleDateString(
                        'tr-TR',
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={20} color="#65C18C" />
                    <Text style={styles.infoText}>{selectedAppointment.time}</Text>
                  </View>
                  <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                    <Ionicons name="link" size={20} color="#65C18C" />
                    <TouchableOpacity>
                      <Text style={[styles.infoText, styles.linkText]}>
                        {selectedAppointment.meetingLink}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedAppointment.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Notlar</Text>
                    <Text style={styles.notesText}>{selectedAppointment.notes}</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleShareMeetingLink(selectedAppointment)}
                  >
                    <Ionicons name="share-social" size={20} color="#65C18C" />
                    <Text style={styles.secondaryButtonText}>Paylaş</Text>
                  </TouchableOpacity>

                  {selectedAppointment.status === 'scheduled' && (
                    <TouchableOpacity
                      style={styles.dangerButton}
                      onPress={() => handleCancelAppointment(selectedAppointment)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                      <Text style={styles.dangerButtonText}>İptal Et</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#333' },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#65C18C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#65C18C' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#999' },
  tabTextActive: { color: '#65C18C', fontWeight: '600' },
  listContent: { padding: 8 },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentCardPast: { opacity: 0.6 },
  dateBox: { width: 60, alignItems: 'center', paddingVertical: 8, backgroundColor: '#E0F2E9', borderRadius: 8, marginRight: 12 },
  dateBoxPast: { backgroundColor: '#f0f0f0' },
  dayNumber: { fontSize: 18, fontWeight: '700', color: '#65C18C' },
  dayNumberPast: { color: '#999' },
  monthText: { fontSize: 10, color: '#65C18C', marginTop: 2, fontWeight: '600' },
  monthTextPast: { color: '#999' },
  cardLeft: { alignItems: 'flex-start' },
  cardMiddle: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  appointmentTime: { fontSize: 12, color: '#65C18C', marginBottom: 6 },
  textPast: { color: '#999' },
  soonBadge: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  soonBadgeText: { fontSize: 10, color: '#ff9800', fontWeight: '600' },
  cardRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeScheduled: { backgroundColor: '#E0F2E9' },
  statusBadgeCompleted: { backgroundColor: '#f0f0f0' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#65C18C' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#999', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  detailSection: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  infoText: { fontSize: 14, color: '#333', flex: 1 },
  linkText: { color: '#65C18C', textDecorationLine: 'underline' },
  notesText: { fontSize: 13, color: '#666', lineHeight: 20 },
  actionButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#65C18C', borderRadius: 8, paddingVertical: 12, gap: 8 },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: '#65C18C' },
  dangerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe0e0', borderRadius: 8, paddingVertical: 12, gap: 8 },
  dangerButtonText: { fontSize: 14, fontWeight: '600', color: '#ff6b6b' },
});