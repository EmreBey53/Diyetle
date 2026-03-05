import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { checkAndAwardBadges, BadgeDef } from '../services/badgeService';
import BadgeCelebrationModal from '../components/BadgeCelebrationModal';

interface MoodEntry {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  energy: number; // 1-5
  note?: string;
  createdAt: Date;
}

const MOODS = [
  { value: 1, emoji: '😞', label: 'Kötü' },
  { value: 2, emoji: '😕', label: 'Düşük' },
  { value: 3, emoji: '😐', label: 'Orta' },
  { value: 4, emoji: '🙂', label: 'İyi' },
  { value: 5, emoji: '😄', label: 'Harika' },
];

const ENERGIES = [
  { value: 1, emoji: '🪫', label: 'Bitkin' },
  { value: 2, emoji: '😴', label: 'Yorgun' },
  { value: 3, emoji: '😌', label: 'Normal' },
  { value: 4, emoji: '⚡', label: 'Enerjik' },
  { value: 5, emoji: '🔥', label: 'Süper' },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
};

export default function MoodTrackerScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [selectedEnergy, setSelectedEnergy] = useState<number>(0);
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeDef | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      setUserId(user.id);

      const today = todayStr();
      const q = query(
        collection(db, 'mood_entries'),
        where('userId', '==', user.id),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      const entries: MoodEntry[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MoodEntry));

      const todayE = entries.find((e) => e.date === today) || null;
      setTodayEntry(todayE);
      if (todayE) {
        setSelectedMood(todayE.mood);
        setSelectedEnergy(todayE.energy);
      }
      setHistory(entries.filter((e) => e.date !== today).slice(0, 14));
    } catch {
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!selectedMood || !selectedEnergy) {
      Alert.alert('Eksik', 'Lütfen ruh halinizi ve enerji seviyenizi seçin.');
      return;
    }
    try {
      setSaving(true);
      const today = todayStr();
      const entry: Omit<MoodEntry, 'id'> = {
        userId,
        date: today,
        mood: selectedMood,
        energy: selectedEnergy,
        createdAt: new Date(),
      };

      if (todayEntry?.id) {
        await setDoc(doc(db, 'mood_entries', todayEntry.id), entry);
      } else {
        await addDoc(collection(db, 'mood_entries'), entry);
      }
      await load();
      // Yeni rozet kontrolü
      const newBadges = await checkAndAwardBadges(userId).catch(() => []);
      if (newBadges.length > 0) {
        setCelebrationBadge(newBadges[0]);
      } else {
        Alert.alert('Kaydedildi', 'Bugünkü ruh haliniz kaydedildi!');
      }
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const moodAvg = history.length > 0
    ? (history.reduce((s, e) => s + e.mood, 0) / history.length).toFixed(1)
    : '-';
  const energyAvg = history.length > 0
    ? (history.reduce((s, e) => s + e.energy, 0) / history.length).toFixed(1)
    : '-';

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
        onClose={() => {
          setCelebrationBadge(null);
          Alert.alert('Kaydedildi', 'Bugünkü ruh haliniz kaydedildi!');
        }}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ruh Hali Takibi</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Bugün kartı */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {todayEntry ? '✏️ Bugünü Güncelle' : '📝 Bugünü Kaydet'}
          </Text>
          <Text style={[styles.dateLabel, { color: colors.textLight }]}>{formatDate(todayStr())}</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Nasıl hissediyorsun?</Text>
          <View style={styles.emojiRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.emojiBtn, selectedMood === m.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => setSelectedMood(m.value)}
              >
                <Text style={styles.emoji}>{m.emoji}</Text>
                <Text style={[styles.emojiLabel, { color: selectedMood === m.value ? colors.primary : colors.textLight }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Enerji seviyeniz?</Text>
          <View style={styles.emojiRow}>
            {ENERGIES.map((e) => (
              <TouchableOpacity
                key={e.value}
                style={[styles.emojiBtn, selectedEnergy === e.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => setSelectedEnergy(e.value)}
              >
                <Text style={styles.emoji}>{e.emoji}</Text>
                <Text style={[styles.emojiLabel, { color: selectedEnergy === e.value ? colors.primary : colors.textLight }]}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.btnDisabled]}
            onPress={save}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>

        {/* İstatistikler */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Son 14 Gün Ortalaması</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>
                  {MOODS.find((m) => m.value === Math.round(Number(moodAvg)))?.emoji ?? '😐'}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{moodAvg}</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Ruh Hali</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>
                  {ENERGIES.find((e) => e.value === Math.round(Number(energyAvg)))?.emoji ?? '😌'}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{energyAvg}</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Enerji</Text>
              </View>
            </View>
          </View>
        )}

        {/* Geçmiş */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Geçmiş</Text>
            {history.map((entry) => {
              const mood = MOODS.find((m) => m.value === entry.mood);
              const energy = ENERGIES.find((e) => e.value === entry.energy);
              return (
                <View key={entry.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.historyDate, { color: colors.textLight }]}>{formatDate(entry.date)}</Text>
                  <View style={styles.historyBadges}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                      <Text>{mood?.emoji}</Text>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{mood?.label}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                      <Text>{energy?.emoji}</Text>
                      <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{energy?.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {history.length === 0 && !todayEntry && (
          <View style={styles.emptyHint}>
            <Ionicons name="heart-outline" size={40} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Her gün nasıl hissettiğini kaydet. Diyetisyenin bu verileri görebilir.
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  dateLabel: { fontSize: 13 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  emojiRow: { flexDirection: 'row', gap: 6 },
  emojiBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  emoji: { fontSize: 22 },
  emojiLabel: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  saveBtn: {
    padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 32 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 60, marginHorizontal: 16 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  historyDate: { fontSize: 13 },
  historyBadges: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  emptyHint: { alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
