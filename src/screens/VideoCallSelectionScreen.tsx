// src/screens/VideoCallSelectionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../services/authService';
import { getDietitianPatients } from '../services/firestoreService';
import { createVideoCall } from '../services/videoCallService';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileEmoji?: string;
}

export default function VideoCallSelectionScreen({ navigation }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [calling, setCalling] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Arama filtresi
    if (searchText.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchText.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [searchText, patients]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user?.id) {
        const patientsList = await getDietitianPatients(user.id);
        setPatients(patientsList);
        setFilteredPatients(patientsList);
      }
    } catch (error) {
      console.error('❌ Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Danışan listesi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async (patient: Patient) => {
    if (!currentUser) return;

    Alert.alert(
      '📹 Video Görüşme',
      `${patient.name} ile video görüşme başlatmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ara',
          onPress: async () => {
            try {
              setCalling(patient.id);

              // Video call kaydı oluştur
              const scheduledTime = new Date(); // Şimdi
              const videoCall = await createVideoCall(
                `instant-${Date.now()}`, // appointmentId
                currentUser.id,
                patient.id,
                currentUser.displayName || 'Diyetisyen',
                patient.name,
                scheduledTime,
                30 // 30 dakika
              );

              // Video call ekranına git
              navigation.navigate('VideoCall', {
                callId: videoCall.id,
                appointmentId: `instant-${Date.now()}`,
                participantName: patient.name,
                patientId: patient.id,
                isInstantCall: true
              });

            } catch (error) {
              console.error('❌ Video görüşme başlatma hatası:', error);
              Alert.alert('Hata', 'Video görüşme başlatılamadı');
            } finally {
              setCalling(null);
            }
          }
        }
      ]
    );
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => handleStartCall(item)}
      disabled={calling === item.id}
    >
      <View style={styles.patientInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.profileEmoji || item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.patientDetails}>
          <Text style={styles.patientName}>{item.name}</Text>
          <Text style={styles.patientEmail}>{item.email}</Text>
          {item.phone && (
            <Text style={styles.patientPhone}>📞 {item.phone}</Text>
          )}
        </View>
      </View>

      <View style={styles.callButton}>
        {calling === item.id ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons name="videocam" size={24} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Danışanlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📹 Video Görüşme</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Danışan ara..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.textLight}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={styles.infoText}>
          Aramak istediğiniz danışanı seçin. Görüşme anında başlayacaktır.
        </Text>
      </View>

      {/* Patients List */}
      {filteredPatients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>
            {searchText ? 'Danışan bulunamadı' : 'Henüz danışan yok'}
          </Text>
          <Text style={styles.emptyText}>
            {searchText 
              ? 'Arama kriterlerinize uygun danışan bulunamadı'
              : 'Video görüşme yapmak için önce danışan eklemelisiniz'
            }
          </Text>
          {!searchText && (
            <TouchableOpacity 
              style={styles.addPatientButton}
              onPress={() => navigation.navigate('AddPatient')}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addPatientText}>Danışan Ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatientItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          📊 Toplam {patients.length} danışan
          {searchText && ` • ${filteredPatients.length} sonuç`}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backText: {
    marginLeft: 4,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  patientEmail: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  patientPhone: {
    fontSize: 12,
    color: colors.textLight,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addPatientText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: colors.white,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
});