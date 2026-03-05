import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import {
  getTodayWaterIntake,
  addWaterIntake,
  removeWaterIntake,
  getWaterIntakeHistory,
  getWaterIntakeStats,
} from '../services/waterIntakeService';
import { checkAndAwardBadges, BadgeDef } from '../services/badgeService';
import BadgeCelebrationModal from '../components/BadgeCelebrationModal';
import { WaterIntake, getWaterPercentage, getWaterStatus } from '../models/WaterIntake';

const QUICK_AMOUNTS = [
  { label: '1 Bardak', amount: 0.2, emoji: '🥤' },
  { label: '1 Büyük Bardak', amount: 0.3, emoji: '🫗' },
  { label: '1 Şişe (500ml)', amount: 0.5, emoji: '🍶' },
  { label: '1 Büyük Şişe (1L)', amount: 1.0, emoji: '🍾' },
];

const GOAL_OPTIONS = [1.5, 2.0, 2.5, 3.0, 3.5];

export default function WaterTrackingScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [patientId, setPatientId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayIntake, setTodayIntake] = useState<WaterIntake | null>(null);
  const [waterAmount, setWaterAmount] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2.5);
  const [history, setHistory] = useState<WaterIntake[]>([]);
  const [stats, setStats] = useState<{ average: number; goalAchievedDays: number; totalDays: number } | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeDef | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      setUserId(user.id);

      const profile = await getPatientProfileByUserId(user.id);
      if (!profile) return;
      const pid = profile.id!;
      setPatientId(pid);

      // Hedefi patient profilinden veya varsayılan
      const goal = (profile as any).waterGoal ?? 2.5;
      setWaterGoal(goal);

      const intake = await getTodayWaterIntake(pid);
      setTodayIntake(intake);
      setWaterAmount(intake?.amount ?? 0);

      // Geçmiş 7 gün
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const hist = await getWaterIntakeHistory(
        pid,
        sevenDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
      );
      setHistory(hist);

      const s = await getWaterIntakeStats(pid);
      setStats(s);
    } catch {
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Progress animasyonu
  useEffect(() => {
    const pct = getWaterPercentage(waterAmount, waterGoal) / 100;
    Animated.spring(progressAnim, { toValue: pct, useNativeDriver: false, tension: 60, friction: 8 }).start();
  }, [waterAmount, waterGoal]);

  // Dalga animasyonu
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleAdd = async (amount: number) => {
    if (!patientId) return;
    try {
      setSaving(true);
      await addWaterIntake(patientId, amount, waterGoal);
      const newAmount = waterAmount + amount;
      setWaterAmount(newAmount);

      // Rozet kontrolü
      const newBadges = await checkAndAwardBadges(userId).catch(() => []);
      if (newBadges.length > 0) setCelebrationBadge(newBadges[0]);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally {
      setSaving(false);
      load();
    }
  };

  const handleRemove = async () => {
    if (!patientId || waterAmount <= 0) return;
    try {
      setSaving(true);
      await removeWaterIntake(patientId, 0.2, waterGoal);
      setWaterAmount(Math.max(0, waterAmount - 0.2));
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally {
      setSaving(false);
      load();
    }
  };

  const handleSetGoal = async (newGoal: number) => {
    setWaterGoal(newGoal);
    setGoalModalVisible(false);
    // Güncel kaydı da yeni hedefle güncelle
    if (patientId && waterAmount > 0) {
      await addWaterIntake(patientId, 0, newGoal).catch(() => {});
    }
  };

  const percentage = getWaterPercentage(waterAmount, waterGoal);
  const status = getWaterStatus(waterAmount, waterGoal);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BadgeCelebrationModal
        badge={celebrationBadge}
        visible={!!celebrationBadge}
        onClose={() => setCelebrationBadge(null)}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Su Takibi</Text>
        <TouchableOpacity onPress={() => setGoalModalVisible(true)} style={styles.goalBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Ana Su Göstergesi */}
        <View style={[styles.mainCard, { backgroundColor: '#0EA5E9', overflow: 'hidden' }]}>
          {/* Dalga arkaplanı */}
          <Animated.View
            style={[
              styles.waveBack,
              {
                transform: [{
                  translateX: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }),
                }],
                bottom: `${percentage}%`,
              },
            ]}
          />

          <View style={styles.mainCardContent}>
            <Text style={styles.dropEmoji}>💧</Text>
            <Text style={styles.mainAmount}>{waterAmount.toFixed(1)}</Text>
            <Text style={styles.mainUnit}>litre</Text>
            <Text style={styles.mainGoal}>Hedef: {waterGoal} L</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>

          {/* Dairesel ilerleme */}
          <View style={styles.circleProgressWrap}>
            <Text style={styles.circlePercent}>{percentage}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.text }]}>Günlük İlerleme</Text>
            <Text style={[styles.progressValue, { color: colors.primary }]}>{waterAmount.toFixed(1)} / {waterGoal} L</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: percentage >= 100 ? '#22C55E' : colors.primary,
                },
              ]}
            />
          </View>
          {/* Ara işaretler */}
          <View style={styles.progressTicks}>
            {[0.25, 0.5, 0.75].map((v) => (
              <View key={v} style={[styles.tick, { left: `${v * 100}%` as any }]}>
                <Text style={[styles.tickLabel, { color: colors.textLight }]}>{(waterGoal * v).toFixed(1)}L</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hızlı Ekleme */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Hızlı Ekle</Text>
          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((q) => (
              <TouchableOpacity
                key={q.label}
                style={[styles.quickBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => handleAdd(q.amount)}
                disabled={saving}
              >
                <Text style={styles.quickEmoji}>{q.emoji}</Text>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{q.label}</Text>
                <Text style={[styles.quickAmount, { color: colors.primary }]}>+{q.amount} L</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Geri Al */}
          <TouchableOpacity
            style={[styles.removeBtn, { borderColor: colors.error ?? '#EF4444' }]}
            onPress={handleRemove}
            disabled={saving || waterAmount <= 0}
          >
            <Ionicons name="remove-circle-outline" size={18} color={colors.error ?? '#EF4444'} />
            <Text style={[styles.removeBtnText, { color: colors.error ?? '#EF4444' }]}>1 Bardak Geri Al</Text>
          </TouchableOpacity>
        </View>

        {/* İstatistikler */}
        {stats && stats.totalDays > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Son 7 Gün</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>💧</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.average} L</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Ortalama</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🎯</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.goalAchievedDays}/{stats.totalDays}</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Hedef Günü</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>📅</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalDays}</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Kayıtlı Gün</Text>
              </View>
            </View>
          </View>
        )}

        {/* Geçmiş */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Geçmiş</Text>
            {history.map((item) => {
              const pct = getWaterPercentage(item.amount, item.goal);
              const [y, m, d] = item.date.split('-').map(Number);
              const dateStr = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
              return (
                <View key={item.id ?? item.date} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyDate, { color: colors.text }]}>{dateStr}</Text>
                    <View style={styles.historyBarWrap}>
                      <View style={[styles.historyBarTrack, { backgroundColor: colors.background }]}>
                        <View
                          style={[
                            styles.historyBarFill,
                            { width: `${pct}%` as any, backgroundColor: pct >= 100 ? '#22C55E' : colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyAmount, { color: pct >= 100 ? '#22C55E' : colors.primary }]}>
                      {item.amount.toFixed(1)} L
                    </Text>
                    {pct >= 100 && <Text style={styles.historyCheck}>✅</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Hedef Ayarlama Modal */}
      <Modal visible={goalModalVisible} transparent animationType="slide" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Günlük Hedef Ayarla</Text>

            <View style={styles.goalOptions}>
              {GOAL_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.goalOption,
                    { borderColor: waterGoal === g ? colors.primary : colors.border },
                    waterGoal === g && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => handleSetGoal(g)}
                >
                  <Text style={[styles.goalOptionText, { color: waterGoal === g ? colors.primary : colors.text }]}>
                    {g} L
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.orText, { color: colors.textLight }]}>veya özel gir</Text>
            <View style={styles.customRow}>
              <TextInput
                style={[styles.customInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Örn: 2.8"
                placeholderTextColor={colors.textLight}
                value={customGoalInput}
                onChangeText={setCustomGoalInput}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={[styles.customBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const val = parseFloat(customGoalInput.replace(',', '.'));
                  if (!val || val < 0.5 || val > 6) {
                    Alert.alert('Hata', '0.5 ile 6 litre arasında bir değer girin.');
                    return;
                  }
                  handleSetGoal(val);
                  setCustomGoalInput('');
                }}
              >
                <Text style={styles.customBtnText}>Ayarla</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setGoalModalVisible(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textLight }]}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  goalBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Ana kart
  mainCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 4,
    minHeight: 220,
    justifyContent: 'center',
  },
  waveBack: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: '120%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 40,
  },
  mainCardContent: { alignItems: 'center', gap: 4, zIndex: 1 },
  dropEmoji: { fontSize: 40, marginBottom: 4 },
  mainAmount: { fontSize: 56, fontWeight: '800', color: '#FFF' },
  mainUnit: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: -4 },
  mainGoal: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  statusText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  circleProgressWrap: {
    position: 'absolute',
    top: 16,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlePercent: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  // Progress bar
  progressCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressValue: { fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressTicks: { flexDirection: 'row', position: 'relative', height: 16 },
  tick: { position: 'absolute', alignItems: 'center' },
  tickLabel: { fontSize: 9 },

  // Kart
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },

  // Hızlı ekle
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: {
    width: '47%', borderRadius: 14, padding: 14, borderWidth: 1,
    alignItems: 'center', gap: 4,
  },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  quickAmount: { fontSize: 12, fontWeight: '700' },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  removeBtnText: { fontSize: 14, fontWeight: '600' },

  // İstatistikler
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 28 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  statDivider: { width: 1, height: 50, marginHorizontal: 8 },

  // Geçmiş
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  historyLeft: { flex: 1, gap: 4 },
  historyDate: { fontSize: 13, fontWeight: '600' },
  historyBarWrap: { paddingRight: 12 },
  historyBarTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  historyBarFill: { height: '100%', borderRadius: 3 },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyAmount: { fontSize: 14, fontWeight: '700' },
  historyCheck: { fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 14 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  goalOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  goalOption: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  goalOptionText: { fontSize: 15, fontWeight: '700' },
  orText: { textAlign: 'center', fontSize: 13 },
  customRow: { flexDirection: 'row', gap: 10 },
  customInput: {
    flex: 1, borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 15,
  },
  customBtn: { padding: 13, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  customBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelText: { fontSize: 15 },
});
