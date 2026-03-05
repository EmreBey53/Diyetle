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
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPatientAppointments, cancelAppointment } from '../services/appointmentService';
import { getCurrentUser } from '../services/authService';
import { Appointment } from '../models/Appointment';
import EmptyState from '../components/EmptyState';

export default function PatientAppointmentsScreen({ navigation }: any) {
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
      }
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcı bilgisi yüklenirken hata oluştu');
    }
  };

  const loadAppointments = async (patientId: string) => {
    try {
      setLoading(true);
      const apts = await getPatientAppointments(patientId);
      setAppointments(apts);
    } catch (error) {
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

  const handleOpenMeetingLink = async (appointment: Appointment) => {
    const { meetingLink, meetingType, id, dietitianName } = appointment;

    if (meetingType === 'app' || meetingLink?.startsWith('https://meet.jit.si/')) {
      // Jitsi URL'sinden roomId cikar
      const roomId = meetingLink?.startsWith('https://meet.jit.si/')
        ? meetingLink.replace('https://meet.jit.si/', '')
        : undefined;
      setShowDetailModal(false);
      navigation.navigate('VideoCall', {
        callId: id,
        roomId,
        participantName: dietitianName,
        isInstantCall: false,
      });
    } else if (meetingLink) {
      // Harici link
      try {
        const canOpen = await Linking.canOpenURL(meetingLink);
        if (canOpen) {
          await Linking.openURL(meetingLink);
        } else {
          Alert.alert('Link', meetingLink);
        }
      } catch {
        Alert.alert('Hata', 'Link açılamadı');
      }
    }
  };

  const handleShareAppointment = async (appointment: Appointment) => {
    try {
      await Share.share({
        message: `Randevu Detayları:\n\nDiyetisyen: ${appointment.dietitianName}\nTarih: ${appointment.date}\nSaat: ${appointment.time}\n\nMeeting Linki:\n${appointment.meetingLink}`,
        title: 'Randevu Detayları',
      });
    } catch (error) {
    }
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    Alert.alert(
      'Randevu İptal Edilsin mi?',
      `${appointment.date} tarihindeki randevunuzu iptal etmek istediğinizden emin misiniz?`,
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(appointment.id);
              Alert.alert('Başarılı', 'Randevunuz iptal edildi.');
              setShowDetailModal(false);
              if (currentUser?.id) {
                await loadAppointments(currentUser.id);
              }
            } catch (error) {
              Alert.alert('Hata', 'Randevu iptal edilirken hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const now = Date.now();
  const upcomingAppointments = appointments.filter(
    (apt) => apt.startDateTime > now && apt.status === 'scheduled'
  );
  const pastAppointments = appointments.filter(
    (apt) => apt.startDateTime <= now || apt.status === 'cancelled'
  );

  const displayedAppointments =
    selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

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
          <Text style={[styles.dietitianName, !isUpcoming && styles.textPast]}>
            {appointment.dietitianName}
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
          {isUpcoming && daysUntil > 1 && (
            <Text style={styles.daysLeftText}>{daysUntil} gün sonra</Text>
          )}
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, isUpcoming ? styles.statusBadgeScheduled : styles.statusBadgeCompleted]}>
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
        <EmptyState
          icon="calendar-outline"
          title={selectedTab === 'upcoming' ? 'Yaklaşan randevu yok' : 'Geçmiş randevu yok'}
          subtitle={selectedTab === 'upcoming' ? 'Diyetisyeninizle iletişime geçerek randevu talep edebilirsiniz.' : undefined}
        />
      ) : (
        <FlatList
          data={displayedAppointments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AppointmentCard appointment={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#65C18C"
            />
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
                  <Text style={styles.detailSectionTitle}>Diyetisyen Bilgisi</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-circle" size={24} color="#65C18C" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Diyetisyen Adı</Text>
                      <Text style={styles.infoText}>{selectedAppointment.dietitianName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Randevu Bilgisi</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={20} color="#65C18C" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Tarih</Text>
                      <Text style={styles.infoText}>
                        {new Date(selectedAppointment.date).toLocaleDateString(
                          'tr-TR',
                          {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={20} color="#65C18C" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Saat</Text>
                      <Text style={styles.infoText}>{selectedAppointment.time}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Meeting Linki</Text>
                  <TouchableOpacity
                    style={styles.meetingLinkButton}
                    onPress={() => handleOpenMeetingLink(selectedAppointment)}
                  >
                    <Ionicons name="link" size={20} color="#fff" />
                    <Text style={styles.meetingLinkButtonText}>
                      Meeting Başlat
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.linkPreview} numberOfLines={2}>
                    {selectedAppointment.meetingLink}
                  </Text>
                </View>

                {selectedAppointment.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Notlar</Text>
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{selectedAppointment.notes}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => handleShareAppointment(selectedAppointment)}
                  >
                    <Ionicons name="share-social" size={20} color="#65C18C" />
                    <Text style={styles.shareButtonText}>Paylaş</Text>
                  </TouchableOpacity>

                  {selectedAppointment.status === 'scheduled' &&
                    selectedAppointment.startDateTime > Date.now() && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelAppointment(selectedAppointment)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                      <Text style={styles.cancelButtonText}>İptal Et</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedAppointment.status === 'cancelled' && (
                  <View style={styles.cancelledInfo}>
                    <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                    <Text style={styles.cancelledText}>Bu randevu iptal edilmiştir</Text>
                  </View>
                )}
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
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#333' },
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
  dietitianName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  appointmentTime: { fontSize: 12, color: '#65C18C', marginBottom: 6 },
  textPast: { color: '#999' },
  daysLeftText: { fontSize: 11, color: '#65C18C', marginTop: 4 },
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
  emptySubtext: { fontSize: 12, color: '#bbb', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  detailSection: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
  infoText: { fontSize: 14, color: '#333', fontWeight: '500' },
  meetingLinkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#65C18C', borderRadius: 8, paddingVertical: 12, marginBottom: 10 },
  meetingLinkButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  linkPreview: { fontSize: 12, color: '#65C18C', backgroundColor: '#E0F2E9', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  notesBox: { backgroundColor: '#f9f9f9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#65C18C' },
  notesText: { fontSize: 13, color: '#666', lineHeight: 20 },
  actionButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16 },
  shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#65C18C', borderRadius: 8, paddingVertical: 12, gap: 8 },
  shareButtonText: { fontSize: 14, fontWeight: '600', color: '#65C18C' },
  cancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe0e0', borderRadius: 8, paddingVertical: 12, gap: 8 },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#ff6b6b' },
  cancelledInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffe0e0', borderRadius: 8 },
  cancelledText: { fontSize: 13, color: '#ff6b6b', fontWeight: '600' },
});