import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { getQuestionsByPatient, createQuestion } from '../services/questionService';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId } from '../services/patientService';
import { Question, getQuestionStatusColor, getQuestionStatusText } from '../models/Question';
import { colors } from '../constants/colors';

export default function PatientQuestionsScreen({ navigation }: any) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadQuestions();
    });
    return unsubscribe;
  }, [navigation]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) return;

      const profile = await getPatientProfileByUserId(currentUser.id);
      
      if (!profile) return;

      const questionsData = await getQuestionsByPatient(profile.id!);
      setQuestions(questionsData);
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuestions();
    setRefreshing(false);
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      Alert.alert('Hata', 'Lütfen sorunuzu yazın!');
      return;
    }

    setSubmitting(true);

    try {
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı!');
        return;
      }

      const profile = await getPatientProfileByUserId(currentUser.id);
      
      if (!profile) {
        Alert.alert('Hata', 'Profil bulunamadı!');
        return;
      }

      await createQuestion({
        patientId: profile.id!,
        patientName: profile.name,
        dietitianId: profile.dietitianId,
        question: newQuestion.trim(),
      });

      Alert.alert('Başarılı!', 'Sorunuz gönderildi! Diyetisyeniniz en kısa sürede cevaplayacak.');
      setNewQuestion('');
      setShowModal(false);
      loadQuestions();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderQuestionItem = ({ item }: { item: Question }) => (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <View style={styles.questionHeaderLeft}>
          <Text style={styles.questionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getQuestionStatusColor(item.isAnswered) }
        ]}>
          <Text style={styles.statusText}>
            {getQuestionStatusText(item.isAnswered)}
          </Text>
        </View>
      </View>

      <Text style={styles.questionText}>❓ {item.question}</Text>

      {item.answer && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>💬 Cevap:</Text>
          <Text style={styles.answerText}>{item.answer}</Text>
          {item.answeredAt && (
            <Text style={styles.answeredDate}>
              {formatDate(item.answeredAt)}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {questions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>Henüz Soru Sormadınız</Text>
          <Text style={styles.emptySubtext}>
            Diyetisyeninize soru sormak için aşağıdaki butona tıklayın
          </Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          renderItem={renderQuestionItem}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Soru Sor Butonu */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.floatingButtonText}>💬 Soru Sor</Text>
      </TouchableOpacity>

      {/* Soru Sorma Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Diyetisyenize Soru Sorun</Text>

            <TextInput
              style={styles.questionInput}
              placeholder="Sorunuzu buraya yazın..."
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setNewQuestion('');
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitQuestion}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
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
  questionHeaderLeft: {
    flex: 1,
  },
  questionDate: {
    fontSize: 14,
    color: colors.textLight,
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
  questionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 15,
  },
  answerContainer: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  answeredDate: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  questionInput: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});