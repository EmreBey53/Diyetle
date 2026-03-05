import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getDietitianById } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { User } from '../models/User';

export default function DietitianProfileScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const { dietitianId: routeDietitianId } = route?.params || {};

  const [dietitian, setDietitian] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDietitian();
  }, []);

  const loadDietitian = async () => {
    try {
      setLoading(true);
      let id = routeDietitianId;

      if (!id) {
        const currentUser = await getCurrentUser();
        id = (currentUser as any)?.dietitianId;
      }

      if (!id) {
        Alert.alert('Hata', 'Diyetisyen bilgisi bulunamadı.');
        navigation.goBack();
        return;
      }

      const data = await getDietitianById(id);
      setDietitian(data);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dietitian) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="person-outline" size={56} color={colors.textLight} />
        <Text style={[styles.notFoundText, { color: colors.textLight }]}>
          Diyetisyen bilgisi bulunamadı.
        </Text>
      </View>
    );
  }

  const d = dietitian as any;

  const initials = dietitian.displayName
    ? dietitian.displayName
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Diyetisyen Profili</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + temel bilgi */}
        <View style={[styles.heroSection, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{dietitian.displayName}</Text>
          {d.specialization ? (
            <Text style={[styles.specialization, { color: colors.primary }]}>{d.specialization}</Text>
          ) : null}

          {/* Meta bilgiler */}
          <View style={styles.metaRow}>
            {d.city ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={15} color={colors.textLight} />
                <Text style={[styles.metaText, { color: colors.textLight }]}>{d.city}</Text>
              </View>
            ) : null}
            {d.experience ? (
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={15} color={colors.textLight} />
                <Text style={[styles.metaText, { color: colors.textLight }]}>{d.experience} yıl deneyim</Text>
              </View>
            ) : null}
            {d.sessionFee ? (
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={15} color={colors.textLight} />
                <Text style={[styles.metaText, { color: colors.textLight }]}>{d.sessionFee}₺ / seans</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Hakkında */}
        {d.bio ? (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hakkında</Text>
            <Text style={[styles.bioText, { color: colors.textLight }]}>{d.bio}</Text>
          </View>
        ) : null}

        {/* Eğitim */}
        {d.education ? (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.sectionRow}>
              <Ionicons name="school-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Eğitim</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textLight }]}>{d.education}</Text>
          </View>
        ) : null}

        {/* İletişim */}
        {d.email ? (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>İletişim</Text>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textLight }]}>{d.email}</Text>
            </View>
          </View>
        ) : null}

        {/* Diyetisyen değiştir */}
        <TouchableOpacity
          style={[styles.changeButton, { borderColor: colors.border }]}
          onPress={() => navigation.navigate('SelectDietitian', { isChanging: true })}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
          <Text style={[styles.changeButtonText, { color: colors.primary }]}>Diyetisyen Değiştir</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  notFoundText: { fontSize: 16, textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: 48,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  topBarTitle: { fontSize: 17, fontWeight: '700' },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  specialization: { fontSize: 15, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  bioText: { fontSize: 14, lineHeight: 22 },
  infoText: { fontSize: 14, lineHeight: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  changeButtonText: { fontSize: 15, fontWeight: '600' },
});
