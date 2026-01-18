// src/screens/PatientProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Patient, getBMIStatus, getBMIColor } from '../models/Patient';
import { getPatientProfileByUserId } from '../services/patientService';
import { getCurrentUser } from '../services/authService';
import { getDietitianById } from '../services/firestoreService';
import { User } from '../models/User';
import { colors } from '../constants/colors';


export default function PatientProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Patient | null>(null);
  const [dietitian, setDietitian] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı!');
        return;
      }

      const profileData = await getPatientProfileByUserId(currentUser.id);
      setProfile(profileData);

      if (profileData?.dietitianId) {
        const dietitianData = await getDietitianById(profileData.dietitianId);
        setDietitian(dietitianData);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Profil yükleniyor...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>😕</Text>
        <Text style={styles.emptyText}>Profil bulunamadı</Text>
        <Text style={styles.emptySubtext}>
          Lütfen diyetisyeninizle iletişime geçin
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.nameText}>{profile.name}</Text>
          <Text style={styles.emailText}>{profile.email}</Text>
        </View>

        {/* Diyetisyen Kartı */}
        {dietitian && (
          <View style={styles.dietitianCard}>
            <Text style={styles.dietitianLabel}>👨‍⚕️ Diyetisyeniniz</Text>
            <Text style={styles.dietitianName}>{dietitian.displayName}</Text>
            <Text style={styles.dietitianEmail}>{dietitian.email}</Text>
          </View>
        )}

        {/* Kişisel Bilgiler */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Kişisel Bilgiler</Text>

          {profile.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefon:</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
          )}

          {profile.age && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Yaş:</Text>
              <Text style={styles.infoValue}>{profile.age}</Text>
            </View>
          )}

          {profile.gender && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cinsiyet:</Text>
              <Text style={styles.infoValue}>
                {profile.gender === 'male' ? 'Erkek' : 'Kadın'}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kayıt Tarihi:</Text>
            <Text style={styles.infoValue}>{formatDate(profile.createdAt)}</Text>
          </View>
        </View>

        {/* Vücut Ölçüleri */}
        {(profile.weight || profile.height) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📏 Vücut Ölçüleri</Text>

            {profile.weight && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kilo:</Text>
                <Text style={styles.infoValue}>{profile.weight} kg</Text>
              </View>
            )}

            {profile.height && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Boy:</Text>
                <Text style={styles.infoValue}>{profile.height} cm</Text>
              </View>
            )}

            {profile.bmi && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>BMI:</Text>
                  <Text style={styles.infoValue}>{profile.bmi}</Text>
                </View>

                <View style={styles.bmiStatusContainer}>
                  <View
                    style={[
                      styles.bmiStatusBadge,
                      { backgroundColor: getBMIColor(profile.bmi) },
                    ]}
                  >
                    <Text style={styles.bmiStatusText}>
                      {getBMIStatus(profile.bmi)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Düzenle Butonu */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>✏️ Profili Düzenle</Text>
        </TouchableOpacity>
      </View>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: colors.primary,
    padding: 20,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 30,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  dietitianCard: {
    backgroundColor: colors.white,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dietitianLabel: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 5,
  },
  dietitianName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  dietitianEmail: {
    fontSize: 14,
    color: colors.textLight,
  },
  card: {
    backgroundColor: colors.white,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  bmiStatusContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  bmiStatusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bmiStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});