import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { Question, getQuestionStatusColor, getQuestionStatusText } from '../models/Question';

interface PatientQuestionsModalProps {
  visible: boolean;
  onClose: () => void;
  questions: Question[];
  onQuestionPress: (question: Question) => void;
  onSendNewQuestion: () => void;
}

export default function PatientQuestionsModal({
  visible,
  onClose,
  questions,
  onQuestionPress,
  onSendNewQuestion,
}: PatientQuestionsModalProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const answeredCount = questions.filter(q => q.isAnswered).length;
  const unansweredCount = questions.filter(q => !q.isAnswered).length;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mesajlarım</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                {answeredCount} cevaplanan • {unansweredCount} beklemede
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Sorular Listesi */}
          <FlatList
            data={questions}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.modalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalQuestionCard, { backgroundColor: colors.background }]}
                onPress={() => {
                  onQuestionPress(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalQuestionHeader}>
                  <View style={styles.modalDateContainer}>
                    <Ionicons name="time" size={16} color={colors.textLight} />
                    <Text style={[styles.modalQuestionDate, { color: colors.textLight }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: getQuestionStatusColor(item.isAnswered) }
                    ]}
                  >
                    <Text style={styles.modalStatusText}>
                      {getQuestionStatusText(item.isAnswered)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.modalQuestionText, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {item.question}
                </Text>

                {item.isAnswered && item.answer && (
                  <View style={[styles.modalAnswerPreview, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
                    <Text
                      style={[styles.modalAnswerText, { color: colors.textLight }]}
                      numberOfLines={1}
                    >
                      {item.answer}
                    </Text>
                  </View>
                )}

                <View style={styles.modalViewMore}>
                  <Text style={[styles.modalViewMoreText, { color: colors.primary }]}>
                    Detayları Gör
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Text style={styles.modalEmptyEmoji}>💬</Text>
                <Text style={[styles.modalEmptyText, { color: colors.textLight }]}>
                  Henüz mesaj göndermediniz
                </Text>
                <Text style={[styles.modalEmptySubtext, { color: colors.textLight }]}>
                  Diyetisyeninize soru sormak için yeni mesaj gönderin
                </Text>
              </View>
            }
          />

          {/* Yeni Mesaj Gönder Butonu */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalSendButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                onSendNewQuestion();
                onClose();
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.white} />
              <Text style={[styles.modalSendButtonText, { color: colors.white }]}>
                Yeni Mesaj Gönder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalListContent: {
    padding: 12,
  },
  modalQuestionCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  modalQuestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalQuestionDate: {
    fontSize: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalQuestionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
  },
  modalAnswerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  modalAnswerText: {
    fontSize: 13,
    flex: 1,
  },
  modalViewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  modalViewMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  modalEmptyEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
