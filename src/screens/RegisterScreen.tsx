import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../services/authService';
import { getAllDietitians } from '../services/firestoreService';
import { colors } from '../constants/colors';
import { User, UserRole } from '../models/User';

export default function RegisterScreen({ navigation }: any) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [selectedDietitian, setSelectedDietitian] = useState('');
  const [dietitians, setDietitians] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDietitianModal, setShowDietitianModal] = useState(false);

  // Diyetisyenleri yükle
  const loadDietitians = useCallback(async () => {
    try {
      const data = await getAllDietitians();
      setDietitians(data);
    } catch (error: any) {
    }
  }, []);

  useEffect(() => {
    loadDietitians();
  }, [loadDietitians]);

  const handleRegister = useCallback(async () => {
    // Validasyon
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun!');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor!');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı!');
      return;
    }

    if (role === 'patient' && !selectedDietitian) {
      Alert.alert('Hata', 'Lütfen bir diyetisyen seçin!');
      return;
    }

    setLoading(true);
    try {
      const user = await registerUser(
        email,
        password,
        displayName,
        role,
        role === 'patient' ? selectedDietitian : undefined,
        undefined, // weight - Questionnaire'de sorulacak
        undefined  // height - Questionnaire'de sorulacak
      );


      // EĞER PATIENT İSE: Önce KVKK onay ekranına yönlendir
      if (role === 'patient') {
        Alert.alert('Başarılı!', 'Hesabınız oluşturuldu. KVKK onay ekranına yönlendiriliyorsunuz.', [
          {
            text: 'Tamam',
            onPress: () => {
              navigation.replace('KVKKConsent', {
                user: user,
                selectedDietitianId: selectedDietitian,
              });
            },
          },
        ]);
      } else {
        // DIYETISYEN İSE: Direkt giriş yap
        Alert.alert('Başarılı!', 'Hesabınız oluşturuldu! Giriş yapabilirsiniz.', [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Kayıt Hatası', error.message);
    } finally {
      setLoading(false);
    }
  }, [displayName, email, password, confirmPassword, role, selectedDietitian, navigation]);

  // Memoized FlatList render function
  const renderDietitianItem = useCallback(({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.dietitianItem,
        selectedDietitian === item.id && styles.dietitianItemSelected,
      ]}
      onPress={() => {
        setSelectedDietitian(item.id);
        setShowDietitianModal(false);
      }}
    >
      <View style={styles.dietitianItemContent}>
        <Text style={styles.dietitianItemName}>{item.displayName}</Text>
        {item.email && (
          <Text style={styles.dietitianItemEmail}>{item.email}</Text>
        )}
      </View>
      {selectedDietitian === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  ), [selectedDietitian]);

  const keyExtractor = useCallback((item: User) => item.id, []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  // Memoized selected dietitian name
  const selectedDietitianName = useMemo(() => {
    return dietitians.find((d) => d.id === selectedDietitian)?.displayName;
  }, [dietitians, selectedDietitian]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Kayıt Ol</Text>
        <Text style={styles.subtitle}>Yeni hesap oluşturun</Text>

        <TextInput
          style={styles.input}
          placeholder="Ad Soyad"
          placeholderTextColor={colors.textLight}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor={colors.textLight}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Telefon (İsteğe Bağlı)"
          placeholderTextColor={colors.textLight}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre (min. 6 karakter)"
          placeholderTextColor={colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre Tekrar"
          placeholderTextColor={colors.textLight}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Hesap Türü</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
            onPress={() => setRole('patient')}
          >
            <Text style={[styles.roleText, role === 'patient' && styles.roleTextActive]}>
              👤 Danışan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, role === 'dietitian' && styles.roleButtonActive]}
            onPress={() => setRole('dietitian')}
          >
            <Text style={[styles.roleText, role === 'dietitian' && styles.roleTextActive]}>
              👨‍⚕️ Diyetisyen
            </Text>
          </TouchableOpacity>
        </View>

        {role === 'patient' && (
          <View>
            <Text style={styles.label}>Diyetisyen Seçin</Text>

            <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 5 }}>
              Kayıtlı Diyetisyen Sayısı: {dietitians.length}
            </Text>

            {dietitians.length === 0 ? (
              <View style={styles.dietitianSelector}>
                <Text style={{ padding: 15, color: colors.error, textAlign: 'center' }}>
                  ⚠️ Sistemde kayıtlı diyetisyen bulunamadı!
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dietitianSelector}
                  onPress={() => setShowDietitianModal(true)}
                >
                  <Text style={styles.dietitianSelectorText}>
                    {selectedDietitian
                      ? selectedDietitianName
                      : 'Diyetisyen Seçin...'}
                  </Text>
                  <Ionicons name="chevron-down" size={24} color={colors.textLight} />
                </TouchableOpacity>

                {selectedDietitian && (
                  <Text style={styles.selectedDietitianText}>
                    ✓ {selectedDietitianName}
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.registerButtonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Zaten hesabınız var mı? <Text style={styles.linkBold}>Giriş Yap</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Geri Dön</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Diyetisyen Seçim Modal */}
      <Modal
        visible={showDietitianModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDietitianModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Diyetisyen Seçin</Text>
              <TouchableOpacity onPress={() => setShowDietitianModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={dietitians}
              keyExtractor={keyExtractor}
              renderItem={renderDietitianItem}
              ItemSeparatorComponent={ItemSeparator}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 20,
  },
  logo: {
    fontSize: 60,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textLight,
    marginBottom: 30,
  },
  input: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    marginTop: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  roleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  roleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  roleTextActive: {
    color: colors.white,
  },
  dietitianSelector: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dietitianSelectorText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  selectedDietitianText: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  dietitianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingHorizontal: 20,
  },
  dietitianItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  dietitianItemContent: {
    flex: 1,
  },
  dietitianItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  dietitianItemEmail: {
    fontSize: 14,
    color: colors.textLight,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  registerButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: colors.textLight,
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: colors.textLight,
    fontSize: 16,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textLight,
    fontSize: 16,
  },
});