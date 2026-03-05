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
import { getPatientsByDietitian, getPendingPatients, acceptPatient, rejectPatient } from '../services/patientService';
import { getDietitianPatientsWithExpiryInfo } from '../services/dietPlanService';
import { getCurrentUser } from '../services/authService';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from '../components/EmptyState';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ALL_BADGES } from '../services/badgeService';

interface PatientWithDietInfo extends Patient {
  activeDiets?: number;
  daysUntilExpiry?: number;
}

interface PatientMiniStats {
  lastMood: number | null;       // 1-5
  lastExerciseDays: number | null; // kaç gün önce
  earnedBadges: number;
}

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const MOOD_COLOR: Record<number, string> = {
  1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#10B981',
};

async function fetchMiniStats(userId: string): Promise<PatientMiniStats> {
  const [moodSnap, exerciseSnap, badgeSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'mood_entries'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(1),
    )),
    getDocs(query(
      collection(db, 'exercise_logs'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(1),
    )),
    getDocs(query(
      collection(db, 'achievements'),
      where('userId', '==', userId),
    )),
  ]);

  const lastMood = moodSnap.empty ? null : (moodSnap.docs[0].data().mood as number);

  let lastExerciseDays: number | null = null;
  if (!exerciseSnap.empty) {
    const dateVal = exerciseSnap.docs[0].data().date;
    const exerciseDate = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    const diffMs = Date.now() - exerciseDate.getTime();
    lastExerciseDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const earnedBadges = badgeSnap.size;

  return { lastMood, lastExerciseDays, earnedBadges };
}

export default function PatientsListScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [patients, setPatients] = useState<PatientWithDietInfo[]>([]);
  const [pendingPatients, setPendingPatients] = useState<Patient[]>([]);
  const [miniStats, setMiniStats] = useState<Record<string, PatientMiniStats>>({});
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

      const [allPatients, pending, patientsWithDietInfo] = await Promise.all([
        getPatientsByDietitian(currentUser.id),
        getPendingPatients(currentUser.id).catch(() => []),
        getDietitianPatientsWithExpiryInfo(currentUser.id),
      ]);
      setPendingPatients(pending);
      // allPatients'tan active olanları filtrele (pending olanlar ayrı gösterilecek)
      const activePatientsOnly = allPatients.filter((p: any) => p.status !== 'pending');

      const dietMap = new Map();
      patientsWithDietInfo.forEach((p) => dietMap.set(p.patientId, p));

      const enrichedPatients = activePatientsOnly.map((patient: Patient) => {
        const dietInfo = dietMap.get(patient.id);
        return {
          ...patient,
          activeDiets: dietInfo?.activeDiets?.length || 0,
          daysUntilExpiry: dietInfo?.daysUntilExpiry,
        } as PatientWithDietInfo;
      });

      setPatients(enrichedPatients);

      // Mini istatistikleri paralel çek
      const statsEntries = await Promise.all(
        enrichedPatients.map(async (p) => {
          if (!p.userId) return [p.id!, { lastMood: null, lastExerciseDays: null, earnedBadges: 0 }] as const;
          try {
            const s = await fetchMiniStats(p.userId);
            return [p.id!, s] as const;
          } catch {
            return [p.id!, { lastMood: null, lastExerciseDays: null, earnedBadges: 0 }] as const;
          }
        }),
      );
      setMiniStats(Object.fromEntries(statsEntries));
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

  const handleAccept = (patient: Patient) => {
    Alert.alert(
      'Danışanı Kabul Et',
      `${patient.name} adlı danışanı kabul etmek istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: async () => {
            try {
              await acceptPatient(patient.id!);
              loadPatients();
            } catch (e: any) {
              Alert.alert('Hata', e.message);
            }
          },
        },
      ]
    );
  };

  const handleReject = (patient: Patient) => {
    Alert.alert(
      'Talebi Reddet',
      `${patient.name} adlı danışanın talebini reddetmek istiyor musunuz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectPatient(patient.id!, patient.userId!);
              loadPatients();
            } catch (e: any) {
              Alert.alert('Hata', e.message);
            }
          },
        },
      ]
    );
  };

  const getExpiryStatusColor = (daysUntilExpiry?: number): string => {
    if (daysUntilExpiry === undefined) return colors.textLight;
    if (daysUntilExpiry <= 0) return '#FF6B6B';
    if (daysUntilExpiry <= 2) return '#FFA500';
    if (daysUntilExpiry <= 5) return '#FFC107';
    return '#4CAF50';
  };

  const getExpiryStatusText = (daysUntilExpiry?: number): string => {
    if (daysUntilExpiry === undefined) return 'Diyet yok';
    if (daysUntilExpiry < 0) return '⏰ Süresi doldu';
    if (daysUntilExpiry === 0) return '⏰ Bugün biter';
    if (daysUntilExpiry === 1) return '⚠️ Yarın biter';
    return `📅 ${daysUntilExpiry} gün kaldı`;
  };

  const renderPatient = ({ item }: { item: PatientWithDietInfo }) => {
    const ms = miniStats[item.id!];
    return (
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

          {/* Mini İstatistikler: ruh hali / egzersiz / rozet */}
          {ms && (
            <View style={styles.miniStatsRow}>
              {/* Ruh hali */}
              <View style={[styles.miniChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <Text style={styles.miniChipEmoji}>
                  {ms.lastMood !== null ? MOOD_EMOJI[ms.lastMood] : '—'}
                </Text>
                <Text style={[styles.miniChipLabel, { color: colors.textLight }]}>Ruh Hali</Text>
                {ms.lastMood !== null && (
                  <View style={[styles.miniMoodDot, { backgroundColor: MOOD_COLOR[ms.lastMood] }]} />
                )}
              </View>

              {/* Egzersiz */}
              <View style={[styles.miniChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons
                  name="barbell-outline"
                  size={14}
                  color={ms.lastExerciseDays === null ? colors.textLight : ms.lastExerciseDays <= 2 ? '#22C55E' : ms.lastExerciseDays <= 7 ? '#F59E0B' : '#EF4444'}
                />
                <Text style={[styles.miniChipLabel, { color: colors.textLight }]}>
                  {ms.lastExerciseDays === null
                    ? 'Kayıt yok'
                    : ms.lastExerciseDays === 0
                    ? 'Bugün'
                    : `${ms.lastExerciseDays}g önce`}
                </Text>
              </View>

              {/* Rozet */}
              <View style={[styles.miniChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <Text style={styles.miniChipEmoji}>🏅</Text>
                <Text style={[styles.miniChipLabel, { color: colors.textLight }]}>
                  {ms.earnedBadges}/{ALL_BADGES.length}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.arrow, { color: colors.textLight }]}>›</Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
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
        ListHeaderComponent={
          pendingPatients.length > 0 ? (
            <View style={[styles.pendingSection, { backgroundColor: colors.cardBackground, borderColor: '#F59E0B' }]}>
              <View style={styles.pendingHeader}>
                <View style={styles.pendingTitleRow}>
                  <View style={styles.pendingDot} />
                  <Text style={[styles.pendingTitle, { color: colors.text }]}>
                    Onay Bekleyen Danışanlar
                  </Text>
                </View>
                <View style={[styles.pendingBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.pendingBadgeText}>{pendingPatients.length}</Text>
                </View>
              </View>
              {pendingPatients.map((p) => (
                <View key={p.id} style={[styles.pendingCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.pendingCardInfo}>
                    <Text style={[styles.pendingName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.pendingEmail, { color: colors.textLight }]}>{p.email}</Text>
                    <Text style={[styles.pendingDate, { color: colors.textLight }]}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[styles.pendingBtn, styles.acceptBtn]}
                      onPress={() => handleAccept(p)}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.pendingBtnText}>Kabul</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pendingBtn, styles.rejectBtn]}
                      onPress={() => handleReject(p)}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                      <Text style={styles.pendingBtnText}>Reddet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          pendingPatients.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Henüz danışan yok"
              subtitle="Yeni danışan eklemek için aşağıdaki butona tıklayın."
              buttonText="Danışan Ekle"
              onButtonPress={() => navigation.navigate('AddPatient')}
            />
          ) : null
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
    marginBottom: 10,
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
  // Mini istatistik satırı
  miniStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  miniChipEmoji: {
    fontSize: 13,
  },
  miniChipLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniMoodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 1,
  },
  arrow: {
    fontSize: 24,
    marginLeft: 10,
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
  // ── Pending section ──
  pendingSection: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    marginBottom: 16,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pendingBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingCardInfo: {
    flex: 1,
    gap: 2,
  },
  pendingName: {
    fontSize: 15,
    fontWeight: '700',
  },
  pendingEmail: {
    fontSize: 13,
  },
  pendingDate: {
    fontSize: 11,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'column',
    gap: 6,
  },
  pendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
    minWidth: 80,
  },
  acceptBtn: {
    backgroundColor: '#22C55E',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  pendingBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
