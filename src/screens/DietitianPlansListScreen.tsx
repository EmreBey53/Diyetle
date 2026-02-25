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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCurrentUser } from '../services/authService';
import { DietPlan } from '../models/DietPlan';
import { colors } from '../constants/colors';

export default function DietitianPlansListScreen({ navigation }: any) {
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPlans();
    });
    return unsubscribe;
  }, [navigation]);

  const loadPlans = async () => {
  try {
    setLoading(true);
    const currentUser = await getCurrentUser();
    
    if (!currentUser) return;

    const q = query(
      collection(db, 'dietPlans'),
      where('dietitianId', '==', currentUser.id)
    );

    const querySnapshot = await getDocs(q);
    const plansData: DietPlan[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as DietPlan;
    });

    // Client-side sorting (en yeni önce)
    plansData.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime();
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime();
      return dateB - dateA;
    });

    setPlans(plansData);
  } catch (error: any) {
  } finally {
    setLoading(false);
  }
};
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderPlanItem = ({ item }: { item: DietPlan }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() => navigation.navigate('DietPlanDetail', { plan: item })}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{item.title}</Text>
        {item.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Aktif</Text>
          </View>
        )}
      </View>

      <View style={styles.planInfo}>
        <Text style={styles.patientName}>👤 {item.patientName}</Text>
        <Text style={styles.mealCount}>🍽️ {item.meals.length} Öğün</Text>
      </View>

      {item.dailyCalorieTarget && (
        <Text style={styles.calorieInfo}>
          🎯 {item.dailyCalorieTarget} kcal/gün
        </Text>
      )}

      <View style={styles.planFooter}>
        <Text style={styles.dateText}>📅 {formatDate(item.startDate)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Planlar yükleniyor...</Text>
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyText}>Henüz Diyet Planı Yok</Text>
        <Text style={styles.emptySubtext}>
          Danışanlarınız için diyet planları oluşturun
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={plans}
        renderItem={renderPlanItem}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
    backgroundColor: colors.background,
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
  },
  planCard: {
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  mealCount: {
    fontSize: 16,
    color: colors.textLight,
  },
  calorieInfo: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 10,
  },
  planFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 5,
  },
  dateText: {
    fontSize: 14,
    color: colors.textLight,
  },
});