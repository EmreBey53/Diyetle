import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerUser, signInWithGoogle } from '../services/authService';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sendPushNotification } from '../services/notificationService';
import { colors } from '../constants/colors';
import { UserRole } from '../models/User';
import { sendWelcomeEmailPatient, sendWelcomeEmailDietitian } from '../services/emailService';

export default function RegisterScreen({ navigation }: any) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  const [googleUid, setGoogleUid] = useState<string | null>(null);

  // Diyetisyen profil alanları
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState('');
  const [sessionFee, setSessionFee] = useState('');
  const [education, setEducation] = useState('');

  const handleGooglePrefill = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.isNewUser) {
        // Zaten kayıtlı — giriş yap
        if (result.user?.role === 'dietitian') {
          navigation.replace('DietitianHome');
        } else {
          navigation.replace('PatientHome');
        }
        return;
      }
      // Yeni kullanıcı — formu prefill et
      setGoogleUid(result.uid);
      setDisplayName(result.displayName || '');
      setEmail(result.email || '');
      Alert.alert(
        'Google Hesabı Bağlandı',
        'Bilgileriniz dolduruldu. Hesap türünüzü seçin ve "Kaydı Tamamla" butonuna basın.',
        [{ text: 'Tamam' }]
      );
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== 'SIGN_IN_REQUIRED') {
        Alert.alert('Google Hatası', error.message || 'Giriş yapılamadı.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = useCallback(async () => {
    if (!displayName || !email) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun!');
      return;
    }

    // Normal kayıt — şifre kontrolü (Google ile kayıtta şifre alanları boş olabilir)
    if (!googleUid) {
      if (!password || !confirmPassword) {
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
    }

    setLoading(true);
    try {
      if (googleUid) {
        // Google ile kayıt — Firebase Auth zaten oluşturuldu, Firestore'a yaz
        const userData: any = {
          id: googleUid,
          email,
          displayName,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(role === 'dietitian' && {
            isApproved: false,
            specialization: specialization || undefined,
            bio: bio || undefined,
            city: city || undefined,
            experience: experience ? Number(experience) : undefined,
            sessionFee: sessionFee ? Number(sessionFee) : undefined,
            education: education || undefined,
            phone: phone || undefined,
          }),
        };
        await setDoc(doc(db, 'users', googleUid), userData);

        if (role === 'dietitian') {
          // Admin'e bildirim
          try {
            const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
            const adminTokens = adminSnap.docs.map((d) => d.data().pushToken).filter(Boolean);
            await Promise.all(adminTokens.map((token: string) =>
              sendPushNotification(token, '🆕 Yeni Diyetisyen Başvurusu', `${displayName} platforma başvurdu.`)
            ));
          } catch {}
          sendWelcomeEmailDietitian(email, displayName).catch(() => {});
          navigation.replace('PendingApproval');
        } else {
          sendWelcomeEmailPatient(email, displayName, undefined).catch(() => {});
          navigation.replace('KVKKConsent', { user: userData, selectedDietitianId: undefined });
        }
        return;
      }

      // Normal email/şifre kaydı
      const user = await registerUser(
        email,
        password,
        displayName,
        role,
        undefined,
        undefined,
        undefined,
        role === 'dietitian' ? {
          specialization: specialization || undefined,
          bio: bio || undefined,
          city: city || undefined,
          experience: experience ? Number(experience) : undefined,
          sessionFee: sessionFee ? Number(sessionFee) : undefined,
          education: education || undefined,
          phone: phone || undefined,
        } : undefined,
      );

      if (role === 'patient') {
        sendWelcomeEmailPatient(email, displayName, undefined).catch(() => {});

        Alert.alert('Hesabınız Oluşturuldu!', 'Doğrulama e-postası "' + email + '" adresinize gönderildi.\n\nLütfen e-postasınızı onayladıktan sonra giriş yapın.', [
          {
            text: 'Tamam',
            onPress: () => {
              navigation.replace('KVKKConsent', {
                user: user,
                selectedDietitianId: undefined,
              });
            },
          },
        ]);
      } else {
        sendWelcomeEmailDietitian(email, displayName).catch(() => {});
        navigation.replace('PendingApproval');
      }
    } catch (error: any) {
      Alert.alert('Kayıt Hatası', error.message);
    } finally {
      setLoading(false);
    }
  }, [displayName, email, password, confirmPassword, role, specialization, bio, city, experience, sessionFee, education, phone, googleUid, navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Kayıt Ol</Text>
        <Text style={styles.subtitle}>Yeni hesap oluşturun</Text>

        {/* TODO: Development build gerektirir — npx expo run:android/ios sonrası aktif et */}
        <TouchableOpacity
          style={[styles.googleButton, styles.buttonDisabled]}
          onPress={handleGooglePrefill}
          disabled={true}
        >
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya e-posta ile</Text>
          <View style={styles.dividerLine} />
        </View>

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

        {!googleUid && (
          <>
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
          </>
        )}

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

        {role === 'dietitian' && (
          <View style={styles.dietitianProfileSection}>
            <View style={styles.dietitianProfileHeader}>
              <Ionicons name="medical" size={20} color={colors.primary} />
              <Text style={styles.dietitianProfileHeaderText}>Diyetisyen Profil Bilgileri</Text>
            </View>
            <Text style={styles.dietitianProfileNote}>
              Bu bilgiler hastalar tarafından görüntülenecektir. Onaylandıktan sonra değiştirebilirsiniz.
            </Text>

            <Text style={styles.label}>Uzmanlık Alanı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Sporcu Beslenmesi, Çocuk Diyeti..."
              placeholderTextColor={colors.textLight}
              value={specialization}
              onChangeText={setSpecialization}
            />

            <Text style={styles.label}>Eğitim</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Hacettepe Üniv. Beslenme ve Diyetetik"
              placeholderTextColor={colors.textLight}
              value={education}
              onChangeText={setEducation}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Şehir</Text>
                <TextInput
                  style={styles.input}
                  placeholder="İstanbul"
                  placeholderTextColor={colors.textLight}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Deneyim (Yıl)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor={colors.textLight}
                  value={experience}
                  onChangeText={setExperience}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>Seans Ücreti (TL)</Text>
            <TextInput
              style={styles.input}
              placeholder="500"
              placeholderTextColor={colors.textLight}
              value={sessionFee}
              onChangeText={setSessionFee}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Hakkımda</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Kendinizi kısaca tanıtın..."
              placeholderTextColor={colors.textLight}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.approvalInfoBanner}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={styles.approvalInfoText}>
                Kayıt sonrası hesabınız admin onayına gönderilecektir. Onaylanana kadar sisteme giriş yapılamaz.
              </Text>
            </View>
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
            <Text style={styles.registerButtonText}>{googleUid ? 'Kaydı Tamamla' : 'Kayıt Ol'}</Text>
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
    color: colors.text,
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
  dietitianProfileSection: {
    marginBottom: 10,
  },
  dietitianProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    marginTop: 10,
  },
  dietitianProfileHeaderText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  dietitianProfileNote: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 8,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  bioInput: {
    minHeight: 90,
    paddingTop: 12,
  },
  approvalInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    padding: 14,
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  approvalInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 19,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textLight,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
