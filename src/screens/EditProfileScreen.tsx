import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getCurrentUser } from '../services/authService';
import { getPatientProfileByUserId, updatePatient } from '../services/patientService';
import { calculateBMI } from '../models/Progress';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function EditProfileScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) return;

      const profile = await getPatientProfileByUserId(currentUser.id);
      
      if (profile) {
        setProfileId(profile.id!);
        setName(profile.name);
        setPhone(profile.phone || '');
        setHeight(profile.height?.toString() || '');
        setWeight(profile.weight?.toString() || '');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen adınızı girin!');
      return;
    }

    if (!height || !weight) {
      Alert.alert('Hata', 'Boy ve kilo bilgileri zorunludur!');
      return;
    }

    const heightNum = Number(height);
    const weightNum = Number(weight);

    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      Alert.alert('Hata', 'Geçerli bir boy değeri girin! (100-250 cm)');
      return;
    }

    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      Alert.alert('Hata', 'Geçerli bir kilo değeri girin! (30-300 kg)');
      return;
    }

    setSaving(true);

    try {
      const bmi = calculateBMI(weightNum, heightNum);

      const updateData: any = {
        name: name.trim(),
        height: heightNum,
        weight: weightNum,
        bmi,
      };

      if (phone.trim()) {
        updateData.phone = phone.trim();
      }

      await updatePatient(profileId, updateData);

      Alert.alert('Başarılı!', 'Profiliniz güncellendi!', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSaving(false);
    }
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Profil yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profili Düzenle</Text>
          <Text style={styles.headerSubtitle}>Bilgilerinizi güncelleyin</Text>
        </View>

        <Text style={styles.label}>Ad Soyad *</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Ahmet Yılmaz"
          placeholderTextColor={colors.textLight}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: 0555 123 4567"
          placeholderTextColor={colors.textLight}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Boy (cm) *</Text>
            <TextInput
              style={styles.input}
              placeholder="170"
              placeholderTextColor={colors.textLight}
              value={height}
              onChangeText={(text) => setHeight(text.replace(',', '.'))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.halfInput}>
            <Text style={styles.label}>Kilo (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="70"
              placeholderTextColor={colors.textLight}
              value={weight}
              onChangeText={(text) => setWeight(text.replace(',', '.'))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {height && weight && (
          <View style={styles.bmiCard}>
            <Text style={styles.bmiLabel}>Güncel BMI:</Text>
            <Text style={styles.bmiValue}>
              {calculateBMI(Number(weight), Number(height))}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>💾 Değişiklikleri Kaydet</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textLight,
  },
  content: {
    padding: 20,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  halfInput: {
    flex: 1,
  },
  bmiCard: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});