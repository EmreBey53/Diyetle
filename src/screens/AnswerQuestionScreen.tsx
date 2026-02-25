import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { answerQuestion, deleteQuestion } from '../services/questionService';
import { Question, getQuestionStatusColor, getQuestionStatusText } from '../models/Question';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function AnswerQuestionScreen({ route, navigation }: any) {
  const { question } = route.params as { question: Question };
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [answer, setAnswer] = useState(question.answer || '');
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      Alert.alert('Hata', 'Lütfen cevabınızı yazın!');
      return;
    }

    setLoading(true);

    try {
      await answerQuestion(question.id!, answer.trim());

      Alert.alert('Başarılı!', 'Cevabınız gönderildi!', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Soruyu Sil',
      'Bu soruyu silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuestion(question.id!);
              Alert.alert('Başarılı!', 'Soru silindi!', [
                {
                  text: 'Tamam',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Soru Kartı */}
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.patientName}>👤 {question.patientName}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getQuestionStatusColor(question.isAnswered) }
              ]}>
                <Text style={styles.statusText}>
                  {getQuestionStatusText(question.isAnswered)}
                </Text>
              </View>
            </View>

            <View style={styles.questionBody}>
              <Text style={styles.questionLabel}>❓ Soru:</Text>
              <Text style={styles.questionText}>{question.question}</Text>
            </View>

            <Text style={styles.questionDate}>
              📅 {formatDate(question.createdAt)}
            </Text>
          </View>

          {/* Cevap Kartı */}
          {question.isAnswered && question.answer ? (
            <View style={styles.existingAnswerCard}>
              <Text style={styles.existingAnswerLabel}>✅ Verdiğiniz Cevap:</Text>
              <Text style={styles.existingAnswerText}>{question.answer}</Text>
              {question.answeredAt && (
                <Text style={styles.answeredDate}>
                  📅 {formatDate(question.answeredAt)}
                </Text>
              )}
            </View>
          ) : null}

          {/* Cevap Formu */}
          <View style={styles.answerCard}>
            <Text style={styles.answerLabel}>
              {question.isAnswered ? '✏️ Cevabı Düzenle:' : '💬 Cevabınız:'}
            </Text>
            
            <TextInput
              style={styles.answerInput}
              placeholder="Cevabınızı buraya yazın..."
              value={answer}
              onChangeText={setAnswer}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {question.isAnswered ? '✅ Cevabı Güncelle' : '✅ Cevapla'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sil Butonu */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>🗑️ Soruyu Sil</Text>
          </TouchableOpacity>

          <View style={{ height: 50 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  questionCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionBody: {
    marginBottom: 15,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  questionDate: {
    fontSize: 13,
    color: colors.textLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  existingAnswerCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  existingAnswerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  existingAnswerText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 10,
  },
  answeredDate: {
    fontSize: 13,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
  answerCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  answerInput: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});