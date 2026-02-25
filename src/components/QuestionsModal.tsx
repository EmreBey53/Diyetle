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

interface QuestionsModalProps {
  visible: boolean;
  onClose: () => void;
  questions: Question[];
  onQuestionPress: (question: Question) => void;
}

export default function QuestionsModal({
  visible,
  onClose,
  questions,
  onQuestionPress,
}: QuestionsModalProps) {
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mesajlar</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                {unansweredCount} bekleyen mesaj
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
                onPress={() => onQuestionPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.modalQuestionHeader}>
                  <View style={styles.modalPatientInfo}>
                    <Ionicons name="person-circle" size={40} color={colors.primary} />
                    <View style={styles.modalPatientText}>
                      <Text style={[styles.modalPatientName, { color: colors.text }]}>
                        {item.patientName}
                      </Text>
                      <Text style={[styles.modalQuestionDate, { color: colors.textLight }]}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
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

                {!item.isAnswered && (
                  <View style={[styles.modalActionHint, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.modalActionText, { color: colors.primary }]}>
                      Cevaplamak için dokunun
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Text style={styles.modalEmptyEmoji}>📭</Text>
                <Text style={[styles.modalEmptyText, { color: colors.textLight }]}>
                  Henüz mesaj yok
                </Text>
              </View>
            }
          />
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
  modalPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalPatientText: {
    marginLeft: 12,
    flex: 1,
  },
  modalPatientName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  modalQuestionDate: {
    fontSize: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalQuestionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  modalActionHint: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
