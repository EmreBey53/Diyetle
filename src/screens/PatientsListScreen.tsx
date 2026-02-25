import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Patient, getBMIStatus, getBMIColor } from '../models/Patient';
import { getPatientsByDietitian } from '../services/patientService';
import { getDietitianPatientsWithExpiryInfo } from '../services/dietPlanService';
import { getCurrentUser } from '../services/authService';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

interface PatientWithDietInfo extends Patient {
  activeDiets?: number;
  daysUntilExpiry?: number;
  expiryInfo?: string;
}

export default function PatientsListScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [patients, setPatients] = useState<PatientWithDietInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
  try {
    setLoading(true);
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı!');
      return;
    }


    // Tüm danışanları getir
    const allPatients = await getPatientsByDietitian(currentUser.id);

    // Diyet bilgileriyle birlikte getir
    const patientsWithDietInfo = await getDietitianPatientsWithExpiryInfo(currentUser.id);

    // Harita oluştur (patientId -> diyet bilgileri)
    const dietMap = new Map();
    patientsWithDietInfo.forEach((p) => {
      dietMap.set(p.patientId, p);
    });

    // Danışanları diyet bilgileriyle zenginleştir
    const enrichedPatients = allPatients.map((patient) => {
      const dietInfo = dietMap.get(patient.id);
      return {
        ...patient,
        activeDiets: dietInfo?.activeDiets?.length || 0,
        daysUntilExpiry: dietInfo?.daysUntilExpiry,
      } as PatientWithDietInfo;
    });

    setPatients(enrichedPatients);
  } catch (error: any) {
    Alert.alert('Hata', error.message);
  } finally {
    setLoading(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const getExpiryStatusColor = (daysUntilExpiry?: number): string => {
    if (daysUntilExpiry === undefined) return colors.textLight;
    if (daysUntilExpiry <= 0) return '#FF6B6B'; // Kırmızı - Süresi doldu
    if (daysUntilExpiry <= 2) return '#FFA500'; // Turuncu - Çok kaldı
    if (daysUntilExpiry <= 5) return '#FFC107'; // Sarı - Dikkat
    return '#4CAF50'; // Yeşil - İyi
  };

  const getExpiryStatusText = (daysUntilExpiry?: number): string => {
    if (daysUntilExpiry === undefined) return 'Diyet yok';
    if (daysUntilExpiry < 0) return '⏰ Süresi doldu';
    if (daysUntilExpiry === 0) return '⏰ Bugün biter';
    if (daysUntilExpiry === 1) return '⚠️ Yarın biter';
    return `📅 ${daysUntilExpiry} gün kaldı`;
  };

  const renderPatient = ({ item }: { item: PatientWithDietInfo }) => (
    <TouchableOpacity
      style={[styles.patientCard, { backgroundColor: colors.cardBackground }]}
      onPress={() => navigation.navigate('PatientDetail', { patient: item })}
    >
      <View style={styles.patientInfo}>
        {/* İsim */}
        <Text style={[styles.patientName, { color: colors.text }]}>{item.name}</Text>

        {/* Yaş, Kilo, Boy */}
        {item.age && item.weight && item.height && (
          <Text style={[styles.patientDetails, { color: colors.textLight }]}>
            {item.age} yaş • {item.weight} kg • {item.height} cm
          </Text>
        )}

        {/* BMI */}
        {item.bmi && (
          <View style={styles.bmiContainer}>
            <Text style={[styles.bmiText, { color: colors.text }]}>BMI: {item.bmi}</Text>
            <View style={[styles.bmiBadge, { backgroundColor: getBMIColor(item.bmi) }]}>
              <Text style={styles.bmiStatus}>{getBMIStatus(item.bmi)}</Text>
            </View>
          </View>
        )}

        {/* Telefon */}
        {item.phone && (
          <Text style={[styles.patientPhone, { color: colors.textLight }]}>📱 {item.phone}</Text>
        )}

        {/* Diyet Bilgileri */}
        <View style={styles.dietInfoContainer}>
          {(item.activeDiets ?? 0) > 0 ? (
            <>
              <View
                style={[
                  styles.dietExpiryBadge,
                  { backgroundColor: getExpiryStatusColor(item.daysUntilExpiry) },
                ]}
              >
                <Ionicons
                  name={
                    item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 2
                      ? 'alert-circle'
                      : 'checkmark-circle'
                  }
                  size={14}
                  color="white"
                />
                <Text style={styles.dietExpiryText}>
                  {getExpiryStatusText(item.daysUntilExpiry)}
                </Text>
              </View>

              {(item.activeDiets ?? 0) > 1 && (
                <View style={styles.multiDietBadge}>
                  <Text style={styles.multiDietText}>{item.activeDiets} diyet</Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.dietExpiryBadge, { backgroundColor: colors.textLight }]}>
              <Ionicons name="close-circle" size={14} color="white" />
              <Text style={styles.dietExpiryText}>Diyet yok</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.arrow, { color: colors.textLight }]}>›</Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    // Ekran her açıldığında yenile
    const unsubscribe = navigation.addListener('focus', () => {
      loadPatients();
    });

    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Danışanlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={patients}
        renderItem={renderPatient}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>Henüz danışan kaydı yok</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              Yeni danışan eklemek için + butonuna tıklayın
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddPatient')}
      >
        <Text style={styles.addButtonText}>+ Danışan Ekle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  patientCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  patientDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bmiText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  bmiStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientPhone: {
    fontSize: 13,
    marginBottom: 8,
  },
  dietInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dietExpiryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  dietExpiryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  multiDietBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  multiDietText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  arrow: {
    fontSize: 24,
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    left: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});