import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getQuestionsByDietitian } from '../services/questionService';
import { getCurrentUser } from '../services/authService';
import { Question, getQuestionStatusColor, getQuestionStatusText } from '../models/Question';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function DietitianQuestionsScreen({ route, navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { patientFilter } = route?.params || {};

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all');

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadQuestions();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilters();
  }, [filter, allQuestions]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) return;

      let questionsData = await getQuestionsByDietitian(currentUser.id);

      // Eğer patientFilter varsa, sadece o danışanın sorularını göster
      if (patientFilter) {
        questionsData = questionsData.filter(q => q.patientId === patientFilter);
      }

      setAllQuestions(questionsData);
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allQuestions;

    switch (filter) {
      case 'unanswered':
        filtered = allQuestions.filter(q => !q.isAnswered);
        break;
      case 'answered':
        filtered = allQuestions.filter(q => q.isAnswered);
        break;
      default:
        filtered = allQuestions;
    }

    setQuestions(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuestions();
    setRefreshing(false);
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
    <TouchableOpacity
      style={[styles.questionCard, { backgroundColor: colors.cardBackground }]}
      onPress={() => navigation.navigate('AnswerQuestion', { question: item })}
    >
      <View style={styles.questionHeader}>
        <Text style={[styles.patientName, { color: colors.text }]}>👤 {item.patientName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getQuestionStatusColor(item.isAnswered) }
        ]}>
          <Text style={styles.statusText}>
            {getQuestionStatusText(item.isAnswered)}
          </Text>
        </View>
      </View>

      <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={3}>
        ❓ {item.question}
      </Text>

      <View style={[styles.questionFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.questionDate, { color: colors.textLight }]}>📅 {formatDate(item.createdAt)}</Text>
        {item.isAnswered && item.answeredAt && (
          <Text style={[styles.answeredDate, { color: colors.textLight }]}>✅ {formatDate(item.answeredAt)}</Text>
        )}
      </View>

      {!item.isAnswered && (
        <View style={[styles.actionHint, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.actionHintText, { color: colors.primary }]}>👉 Cevaplamak için dokunun</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const unansweredCount = allQuestions.filter(q => !q.isAnswered).length;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Sorular yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{allQuestions.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textLight }]}>Toplam</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning]}>
          <Text style={[styles.statNumber, styles.statNumberWhite]}>{unansweredCount}</Text>
          <Text style={[styles.statLabel, styles.statLabelWhite]}>Bekliyor</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSuccess]}>
          <Text style={[styles.statNumber, styles.statNumberWhite]}>
            {allQuestions.length - unansweredCount}
          </Text>
          <Text style={[styles.statLabel, styles.statLabelWhite]}>Cevaplandı</Text>
        </View>
      </View>

      {/* Filtreler */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: filter === 'all' ? colors.primary : colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, { color: filter === 'all' ? colors.white : colors.text }]}>
            Tümü
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: filter === 'unanswered' ? colors.primary : colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setFilter('unanswered')}
        >
          <Text style={[styles.filterText, { color: filter === 'unanswered' ? colors.white : colors.text }]}>
            Bekleyenler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: filter === 'answered' ? colors.primary : colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setFilter('answered')}
        >
          <Text style={[styles.filterText, { color: filter === 'answered' ? colors.white : colors.text }]}>
            Cevaplananlar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {questions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            {filter === 'all' ? 'Henüz Soru Yok' :
             filter === 'unanswered' ? 'Bekleyen Soru Yok' :
             'Cevaplanan Soru Yok'}
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardWarning: {
    backgroundColor: '#FF9800',
  },
  statCardSuccess: {
    backgroundColor: '#4CAF50',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statNumberWhite: {
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  statLabelWhite: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  questionCard: {
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
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  questionDate: {
    fontSize: 13,
  },
  answeredDate: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionHint: {
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
});