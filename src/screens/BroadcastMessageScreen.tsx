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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getPatientsByDietitian } from '../services/patientService';
import { sendPushNotification } from '../services/notificationService';
import { Patient } from '../models/Patient';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Önceden tanımlı hızlı mesaj şablonları
const QUICK_MESSAGES = [
  { label: 'Motivasyon', emoji: '💪', title: 'Harika İlerleme!', body: 'Bu hafta hedeflerinize çok yaklaştınız. Devam edin!' },
  { label: 'Su Hatırlatma', emoji: '💧', title: 'Su İçmeyi Unutma!', body: 'Günlük su hedefini karşılamayı unutma. Şu an bir bardak su iç!' },
  { label: 'Kontrol', emoji: '📋', title: 'Haftalık Kontrol', body: 'Bu haftaki diyet planınıza uyum durumunuzu değerlendirme zamanı.' },
  { label: 'Randevu', emoji: '📅', title: 'Randevu Hatırlatması', body: 'Yaklaşan randevunuzu unutmayın. Sorularınızı hazırlayın!' },
  { label: 'Ölçüm', emoji: '⚖️', title: 'Ölçüm Zamanı', body: 'Bu haftaki kilonuzu kaydetmeyi unutmayın. İlerlemenizi takip ediyoruz!' },
];

interface PatientWithToken extends Patient {
  pushToken?: string;
  selected: boolean;
}

export default function BroadcastMessageScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [patients, setPatients] = useState<PatientWithToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectAll, setSelectAll] = useState(true);
  const [dietitianId, setDietitianId] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      setDietitianId(user.id);

      const pts = await getPatientsByDietitian(user.id);

      // patients koleksiyonundaki pushToken ve userId alanları mevcut, doğrudan kullanabiliriz
      const withTokens: PatientWithToken[] = pts.map((p: any) => ({
        ...p,
        pushToken: p.pushToken,
        userId: p.userId,
        selected: true,
      }));

      setPatients(withTokens);
    } catch {
      Alert.alert('Hata', 'Hastalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) => {
    setPatients((prev) => {
      const updated = prev.map((p) => p.id === id ? { ...p, selected: !p.selected } : p);
      setSelectAll(updated.every((p) => p.selected));
      return updated;
    });
  };

  const toggleAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setPatients((prev) => prev.map((p) => ({ ...p, selected: next })));
  };

  const applyQuickMessage = (q: typeof QUICK_MESSAGES[0]) => {
    setTitle(q.title);
    setBody(q.body);
  };

  const send = async () => {
    const selected = patients.filter((p) => p.selected);
    if (selected.length === 0) {
      Alert.alert('Hata', 'En az bir hasta seçin.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      Alert.alert('Eksik', 'Başlık ve mesaj girin.');
      return;
    }

    Alert.alert(
      'Toplu Mesaj',
      `${selected.length} hastaya bildirim gönderilecek. Devam edilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            try {
              setSending(true);
              let sent = 0;
              let failed = 0;

              for (const patient of selected) {
                try {
                  // Push notification gönder (token varsa)
                  if (patient.pushToken) {
                    await sendPushNotification(patient.pushToken, title.trim(), body.trim(), {
                      type: 'broadcast',
                      dietitianId,
                    });
                    sent++;
                  }

                  // Firestore'a bildirim kaydı yaz (token olmasa bile)
                  if (patient.userId) {
                    await addDoc(collection(db, 'notifications'), {
                      userId: patient.userId,
                      type: 'broadcast',
                      title: title.trim(),
                      body: body.trim(),
                      read: false,
                      data: { dietitianId },
                      createdAt: Timestamp.now(),
                    });
                  }
                } catch {
                  failed++;
                }
              }

              Alert.alert(
                'Gönderildi',
                `${selected.length} hastaya mesaj gönderildi.${failed > 0 ? ` (${failed} başarısız)` : ''}`,
              );
              setTitle('');
              setBody('');
            } catch {
              Alert.alert('Hata', 'Mesaj gönderilemedi.');
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  const selectedCount = patients.filter((p) => p.selected).length;

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Toplu Mesaj</Text>
          <Text style={[styles.headerSub, { color: colors.textLight }]}>{selectedCount} hasta seçili</Text>
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }, (sending || selectedCount === 0) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={sending || selectedCount === 0}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Gönder</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Hızlı Şablonlar */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Hızlı Şablonlar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
            {QUICK_MESSAGES.map((q) => (
              <TouchableOpacity
                key={q.label}
                style={[styles.quickChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
                onPress={() => applyQuickMessage(q)}
              >
                <Text style={styles.quickChipEmoji}>{q.emoji}</Text>
                <Text style={[styles.quickChipLabel, { color: colors.primary }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mesaj Formu */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Mesaj İçeriği</Text>

          <Text style={[styles.label, { color: colors.text }]}>Başlık</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Bildirim başlığı..."
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Text style={[styles.label, { color: colors.text }]}>Mesaj</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Hastalara gönderilecek mesaj..."
            placeholderTextColor={colors.textLight}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={[styles.charCount, { color: colors.textLight }]}>{body.length}/200</Text>
        </View>

        {/* Hasta Seçimi */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Hastalar ({patients.length})</Text>
            <TouchableOpacity
              style={[styles.selectAllBtn, { backgroundColor: selectAll ? colors.primary : 'transparent', borderColor: colors.primary }]}
              onPress={toggleAll}
            >
              <Text style={[styles.selectAllText, { color: selectAll ? '#FFF' : colors.primary }]}>
                {selectAll ? 'Tümünü Kaldır' : 'Tümünü Seç'}
              </Text>
            </TouchableOpacity>
          </View>

          {patients.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Henüz danışan yok.</Text>
          ) : (
            patients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[
                  styles.patientRow,
                  { borderBottomColor: colors.border },
                  patient.selected && { backgroundColor: colors.primary + '08' },
                ]}
                onPress={() => toggleSelect(patient.id!)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  {
                    borderColor: patient.selected ? colors.primary : colors.border,
                    backgroundColor: patient.selected ? colors.primary : 'transparent',
                  },
                ]}>
                  {patient.selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, { color: colors.text }]}>{patient.name}</Text>
                  {patient.email ? (
                    <Text style={[styles.patientEmail, { color: colors.textLight }]}>{patient.email}</Text>
                  ) : null}
                </View>
                {patient.pushToken ? (
                  <Ionicons name="notifications" size={16} color={colors.primary} />
                ) : (
                  <Ionicons name="notifications-off-outline" size={16} color={colors.textLight} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1, gap: 10,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickRow: { marginTop: 4 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, marginRight: 8,
  },
  quickChipEmoji: { fontSize: 16 },
  quickChipLabel: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right' },
  selectAllBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  selectAllText: { fontSize: 12, fontWeight: '600' },
  patientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '600' },
  patientEmail: { fontSize: 12, marginTop: 1 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});
