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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { addPatient, updatePatient } from '../services/patientService';
import { getCurrentUser } from '../services/authService';
import { Patient, calculateBMI } from '../models/Patient';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function AddEditPatientScreen({ route, navigation }: any) {
  const editPatient = route.params?.patient as Patient | undefined;
  const isEditMode = !!editPatient;
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  const [name, setName] = useState(editPatient?.name || '');
  const [email, setEmail] = useState(editPatient?.email || '');
  const [phone, setPhone] = useState(editPatient?.phone || '');
  const [age, setAge] = useState(editPatient?.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(editPatient?.gender || 'female');
  const [weight, setWeight] = useState(editPatient?.weight?.toString() || '');
  const [height, setHeight] = useState(editPatient?.height?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Validasyon
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen ad soyad girin!');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresi girin!');
      return;
    }

    setLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı!');
        return;
      }

      const patientData: any = {
        name: name.trim(),
        email: email.trim(),
        gender,
      };

      // Sadece dolu alanları ekle (undefined alanları Firebase'e gönderme)
      if (phone.trim()) patientData.phone = phone.trim();
      if (age) patientData.age = parseInt(age);
      if (weight) patientData.weight = parseFloat(weight);
      if (height) patientData.height = parseFloat(height);

      // BMI hesapla
      if (patientData.weight && patientData.height) {
        patientData.bmi = calculateBMI(patientData.weight, patientData.height);
      }

      if (isEditMode) {
        // Güncelle
        await updatePatient(editPatient.id!, patientData);
        Alert.alert('Başarılı!', 'Danışan bilgileri güncellendi!', [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Yeni ekle
        patientData.dietitianId = currentUser.id;
        patientData.userId = ''; // Şimdilik boş, sonra auth'dan alacağız
        
        await addPatient(patientData);
        Alert.alert('Başarılı!', 'Yeni danışan eklendi!', [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Temel Bilgiler */}
          <Text style={styles.sectionTitle}>👤 Temel Bilgiler</Text>

          <Text style={styles.label}>Ad Soyad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Ahmet Yılmaz"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>E-posta *</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            placeholder="05XX XXX XX XX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Yaş</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 35"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Cinsiyet</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
              onPress={() => setGender('female')}
            >
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                👩 Kadın
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
              onPress={() => setGender('male')}
            >
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                👨 Erkek
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vücut Ölçüleri */}
          <Text style={styles.sectionTitle}>📏 Vücut Ölçüleri</Text>

          <Text style={styles.label}>Kilo (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 75"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Boy (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 170"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
          />

          {/* BMI Preview */}
          {weight && height && parseFloat(weight) > 0 && parseFloat(height) > 0 && (
            <View style={styles.bmiPreview}>
              <Text style={styles.bmiPreviewLabel}>BMI:</Text>
              <Text style={styles.bmiPreviewValue}>
                {calculateBMI(parseFloat(weight), parseFloat(height))}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Kaydet Butonu */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? '✅ Kaydet' : '➕ Danışan Ekle'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperText: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 5,
    fontStyle: 'italic',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  genderButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  genderTextActive: {
    color: colors.white,
  },
  bmiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  bmiPreviewLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginRight: 10,
  },
  bmiPreviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
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