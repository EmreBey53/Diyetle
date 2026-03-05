import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { checkAndAwardBadges, BadgeDef } from '../services/badgeService';
import BadgeCelebrationModal from '../components/BadgeCelebrationModal';

interface ExerciseEntry {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  name: string;
  duration: number; // dakika
  type: ExerciseType;
  createdAt: Date;
}

type ExerciseType = 'cardio' | 'strength' | 'flexibility' | 'sport' | 'other';

const EXERCISE_TYPES: { key: ExerciseType; emoji: string; label: string; color: string }[] = [
  { key: 'cardio', emoji: '🏃', label: 'Kardiyo', color: '#EF4444' },
  { key: 'strength', emoji: '🏋️', label: 'Kuvvet', color: '#8B5CF6' },
  { key: 'flexibility', emoji: '🧘', label: 'Esneme', color: '#22C55E' },
  { key: 'sport', emoji: '⚽', label: 'Spor', color: '#3B82F6' },
  { key: 'other', emoji: '🎯', label: 'Diğer', color: '#F59E0B' },
];

const QUICK_EXERCISES = [
  'Yürüyüş', 'Koşu', 'Bisiklet', 'Yüzme', 'Pilates',
  'Yoga', 'Futbol', 'Basketbol', 'Tenis', 'Dans',
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
};

const getTypeInfo = (type: ExerciseType) => EXERCISE_TYPES.find((t) => t.key === type) ?? EXERCISE_TYPES[4];

export default function ExerciseLogScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayEntries, setTodayEntries] = useState<ExerciseEntry[]>([]);
  const [history, setHistory] = useState<{ date: string; entries: ExerciseEntry[] }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeDef | null>(null);

  // Form state
  const [exName, setExName] = useState('');
  const [exDuration, setExDuration] = useState('');
  const [exType, setExType] = useState<ExerciseType>('cardio');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      setUserId(user.id);

      const today = todayStr();
      const q = query(
        collection(db, 'exercise_logs'),
        where('userId', '==', user.id),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const entries: ExerciseEntry[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExerciseEntry));

      setTodayEntries(entries.filter((e) => e.date === today));

      // Geçmiş: bugün hariç, tarihe göre grupla
      const past = entries.filter((e) => e.date !== today);
      const grouped: { date: string; entries: ExerciseEntry[] }[] = [];
      past.forEach((e) => {
        const existing = grouped.find((g) => g.date === e.date);
        if (existing) {
          existing.entries.push(e);
        } else {
          grouped.push({ date: e.date, entries: [e] });
        }
      });
      setHistory(grouped.slice(0, 10));
    } catch {
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (quickName?: string) => {
    setExName(quickName ?? '');
    setExDuration('');
    setExType('cardio');
    setModalVisible(true);
  };

  const saveExercise = async () => {
    if (!exName.trim()) {
      Alert.alert('Hata', 'Egzersiz adı girin.');
      return;
    }
    const dur = parseInt(exDuration);
    if (!dur || dur <= 0) {
      Alert.alert('Hata', 'Geçerli bir süre girin (dakika).');
      return;
    }
    try {
      setSaving(true);
      const entry: Omit<ExerciseEntry, 'id'> = {
        userId,
        date: todayStr(),
        name: exName.trim(),
        duration: dur,
        type: exType,
        createdAt: new Date(),
      };
      await addDoc(collection(db, 'exercise_logs'), entry);
      setModalVisible(false);
      await load();
      // Yeni rozet kontrolü
      const newBadges = await checkAndAwardBadges(userId).catch(() => []);
      if (newBadges.length > 0) setCelebrationBadge(newBadges[0]);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (entry: ExerciseEntry) => {
    Alert.alert('Sil', `"${entry.name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'exercise_logs', entry.id!));
            await load();
          } catch {
            Alert.alert('Hata', 'Silinemedi.');
          }
        },
      },
    ]);
  };

  const todayTotal = todayEntries.reduce((s, e) => s + e.duration, 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Egzersiz Logu</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addBtn}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Bugün özet */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Bugün Toplam</Text>
          <Text style={styles.summaryValue}>{todayTotal} dk</Text>
          <Text style={styles.summaryCount}>{todayEntries.length} egzersiz</Text>
        </View>

        {/* Hızlı ekle */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Hızlı Ekle</Text>
          <View style={styles.quickGrid}>
            {QUICK_EXERCISES.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.quickBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => openModal(name)}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bugünkü egzersizler */}
        {todayEntries.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Bugün</Text>
            {todayEntries.map((entry) => {
              const typeInfo = getTypeInfo(entry.type);
              return (
                <View key={entry.id} style={[styles.entryRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>{typeInfo.emoji}</Text>
                  </View>
                  <View style={styles.entryContent}>
                    <Text style={[styles.entryName, { color: colors.text }]}>{entry.name}</Text>
                    <Text style={[styles.entryMeta, { color: colors.textLight }]}>
                      {typeInfo.label} • {entry.duration} dakika
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteEntry(entry)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.error ?? '#EF4444'} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Geçmiş */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Geçmiş</Text>
            {history.map((group) => {
              const total = group.entries.reduce((s, e) => s + e.duration, 0);
              return (
                <View key={group.date} style={[styles.historyGroup, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyGroupHeader}>
                    <Text style={[styles.historyDate, { color: colors.text }]}>{formatDate(group.date)}</Text>
                    <Text style={[styles.historyTotal, { color: colors.primary }]}>{total} dk</Text>
                  </View>
                  <View style={styles.historyBadges}>
                    {group.entries.map((e) => {
                      const ti = getTypeInfo(e.type);
                      return (
                        <View key={e.id} style={[styles.historyBadge, { backgroundColor: ti.color + '18' }]}>
                          <Text style={{ fontSize: 12 }}>{ti.emoji}</Text>
                          <Text style={[styles.historyBadgeText, { color: ti.color }]}>
                            {e.name} ({e.duration}dk)
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {todayEntries.length === 0 && history.length === 0 && (
          <View style={styles.emptyHint}>
            <Text style={{ fontSize: 48 }}>🏃</Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Henüz egzersiz eklemediniz. Hızlı ekle ile başlayın!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Ekle Modal */}
      <BadgeCelebrationModal
        badge={celebrationBadge}
        visible={!!celebrationBadge}
        onClose={() => setCelebrationBadge(null)}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Egzersiz Ekle</Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Egzersiz Adı</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Örn: Yürüyüş"
              placeholderTextColor={colors.textLight}
              value={exName}
              onChangeText={setExName}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Süre (dakika)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="30"
              placeholderTextColor={colors.textLight}
              value={exDuration}
              onChangeText={setExDuration}
              keyboardType="number-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tür</Text>
            <View style={styles.typeRow}>
              {EXERCISE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, { borderColor: exType === t.key ? t.color : colors.border, backgroundColor: exType === t.key ? t.color + '20' : 'transparent' }]}
                  onPress={() => setExType(t.key)}
                >
                  <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                  <Text style={[styles.typeBtnLabel, { color: exType === t.key ? t.color : colors.textLight }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.btnDisabled]}
              onPress={saveExercise}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textLight }]}>İptal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  addBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  summaryCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 4,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  summaryValue: { color: '#FFF', fontSize: 36, fontWeight: '700' },
  summaryCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '500' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  entryContent: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: '600' },
  entryMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 6 },
  historyGroup: { paddingVertical: 12, borderBottomWidth: 1 },
  historyGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyDate: { fontSize: 14, fontWeight: '600' },
  historyTotal: { fontSize: 14, fontWeight: '700' },
  historyBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  historyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  historyBadgeText: { fontSize: 12, fontWeight: '600' },
  emptyHint: { alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalWrapper: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 15,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5,
  },
  typeBtnLabel: { fontSize: 12, fontWeight: '600' },
  saveBtn: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelText: { fontSize: 15 },
});
