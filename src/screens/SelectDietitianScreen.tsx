import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getAllDietitians } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { doc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User } from '../models/User';

interface SelectDietitianScreenProps {
  navigation: any;
  route?: {
    params?: {
      // Questionnaire akışından geliyor: user + sonraki hedef
      user?: User;
      nextScreen?: 'PatientHome' | 'Questionnaire';
      // Değiştirme modu: ayarlar ekranından gelindiğinde true
      isChanging?: boolean;
    };
  };
}

export default function SelectDietitianScreen({ navigation, route }: SelectDietitianScreenProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const { user: routeUser, nextScreen = 'PatientHome', isChanging = false } = route?.params || {};

  const [dietitians, setDietitians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDietitians();
  }, []);

  const loadDietitians = async () => {
    try {
      const list = await getAllDietitians();
      setDietitians(list);
    } catch (error: any) {
      Alert.alert('Hata', 'Diyetisyen listesi yüklenemedi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return dietitians;
    const q = search.toLowerCase();
    return dietitians.filter(
      (d) =>
        d.displayName?.toLowerCase().includes(q) ||
        (d as any).specialization?.toLowerCase().includes(q) ||
        (d as any).city?.toLowerCase().includes(q)
    );
  }, [dietitians, search]);

  const handleConfirm = useCallback(async () => {
    if (!selected) {
      Alert.alert('Uyarı', 'Lütfen bir diyetisyen seçin.');
      return;
    }

    setSaving(true);
    try {
      const currentUser = routeUser || (await getCurrentUser());
      if (!currentUser) throw new Error('Kullanıcı bulunamadı.');

      // users/{uid} belgesine dietitianId yaz
      await updateDoc(doc(db, 'users', currentUser.id), { dietitianId: selected });

      // patients koleksiyonunda var olan kaydı kontrol et
      const patientsQuery = query(
        collection(db, 'patients'),
        where('userId', '==', currentUser.id)
      );
      const existingPatients = await getDocs(patientsQuery);

      if (!existingPatients.empty) {
        // Var olan kaydı güncelle (diyetisyen değiştirme) — yeni diyetisyen için pending
        await updateDoc(doc(db, 'patients', existingPatients.docs[0].id), {
          dietitianId: selected,
          status: 'pending',
          updatedAt: new Date(),
        });
      } else {
        // Yeni kayıt oluştur — diyetisyen onayına kadar pending
        await addDoc(collection(db, 'patients'), {
          userId: currentUser.id,
          dietitianId: selected,
          name: currentUser.displayName,
          email: currentUser.email,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (isChanging) {
        Alert.alert('Başarılı', 'Diyetisyeniniz güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else if (nextScreen === 'Questionnaire') {
        navigation.replace('Questionnaire', {
          user: { ...currentUser, dietitianId: selected },
          selectedDietitianId: selected,
        });
      } else {
        navigation.replace('PatientHome');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSaving(false);
    }
  }, [selected, routeUser, nextScreen, isChanging, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: User }) => {
      const isSelected = selected === item.id;
      const initials = item.displayName
        ? item.displayName
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '?';

      return (
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
          ]}
          onPress={() => setSelected(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: isSelected ? colors.primary : colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: isSelected ? '#fff' : colors.primary }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.name, { color: colors.text }]}>{item.displayName}</Text>
            {(item as any).specialization ? (
              <Text style={[styles.specialization, { color: colors.primary }]}>
                {(item as any).specialization}
              </Text>
            ) : null}
            <View style={styles.meta}>
              {(item as any).city ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.textLight} />
                  <Text style={[styles.metaText, { color: colors.textLight }]}>{(item as any).city}</Text>
                </View>
              ) : null}
              {(item as any).experience ? (
                <View style={styles.metaItem}>
                  <Ionicons name="briefcase-outline" size={12} color={colors.textLight} />
                  <Text style={[styles.metaText, { color: colors.textLight }]}>{(item as any).experience} yıl</Text>
                </View>
              ) : null}
              {(item as any).sessionFee ? (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={12} color={colors.textLight} />
                  <Text style={[styles.metaText, { color: colors.textLight }]}>{(item as any).sessionFee}₺</Text>
                </View>
              ) : null}
            </View>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [selected, colors]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        {isChanging && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {isChanging ? 'Diyetisyen Değiştir' : 'Diyetisyeninizi Seçin'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          {isChanging
            ? 'Yeni diyetisyeninizi seçin. Mevcut planlarınız korunacaktır.'
            : 'Size eşlik edecek diyetisyeninizi seçin. Daha sonra değiştirebilirsiniz.'}
        </Text>
      </View>

      {/* Arama */}
      <View style={[styles.searchBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="İsim, uzmanlık veya şehir ara..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={56} color={colors.textLight} />
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            {search ? 'Arama sonucu bulunamadı.' : 'Henüz onaylı diyetisyen bulunmuyor.\nLütfen daha sonra tekrar deneyin.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Devam Butonu */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: selected ? colors.primary : colors.border },
          ]}
          onPress={handleConfirm}
          disabled={!selected || saving || filtered.length === 0}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.confirmText}>
                {selected ? 'Diyetisyeni Seç ve Devam Et' : 'Diyetisyen Seçin'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  specialization: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
