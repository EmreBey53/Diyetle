import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { createQuestion } from '../services/questionService';
import { User } from '../models/User';

export default function SendQuestionScreen({ route, navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const patient = route.params?.patient; // Diyetisyen tarafında kullanılır

  const [user, setUser] = useState<User | null>(null);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazın.');
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Kullanıcı bulunamadı.');

      const profile = await getPatientProfileByUserId(currentUser.id);
      if (!profile) throw new Error('Profil bulunamadı.');

      await createQuestion({
        patientId: profile.id!,
        patientName: profile.name,
        dietitianId: profile.dietitianId,
        question: question.trim(),
      });

      Alert.alert('Gönderildi!', 'Mesajınız diyetisyeninize iletildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Mesaj gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Yeni Mesaj</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* To field */}
          <View style={[styles.toCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.toLabel, { color: colors.textLight }]}>Alıcı:</Text>
            <Text style={[styles.toValue, { color: colors.text }]}>Diyetisyeniniz</Text>
          </View>

          {/* Input */}
          <View style={[styles.inputCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textLight }]}>Mesajınız</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Diyetisyeninize soru sorabilir, görüşlerinizi iletebilirsiniz..."
              placeholderTextColor={colors.textLight}
              value={question}
              onChangeText={setQuestion}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={[styles.charCount, { color: colors.textLight }]}>{question.length} karakter</Text>
          </View>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.tipsTitle, { color: colors.primary }]}>💡 İpuçları</Text>
            <Text style={[styles.tipText, { color: colors.textLight }]}>• Sorunuzu açık ve net ifade edin</Text>
            <Text style={[styles.tipText, { color: colors.textLight }]}>• Belirtilerinizi ve süresini belirtin</Text>
            <Text style={[styles.tipText, { color: colors.textLight }]}>• Acil durumlar için doktorunuza başvurun</Text>
          </View>
        </View>
      </ScrollView>

      {/* Send Button */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: question.trim() ? colors.primary : colors.border },
          ]}
          onPress={handleSubmit}
          disabled={submitting || !question.trim()}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.sendBtnText}>Gönder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 14 },
  toCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  toLabel: { fontSize: 13 },
  toValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  inputCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  inputLabel: { fontSize: 13, fontWeight: '600' },
  input: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  charCount: { fontSize: 12, textAlign: 'right' },
  tipsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tipText: { fontSize: 13, lineHeight: 20 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
