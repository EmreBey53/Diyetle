import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { loginUser, signInWithGoogle } from '../services/authService';
import { colors } from '../constants/colors';

const REMEMBER_EMAIL_KEY = '@diyetle_remember_email';
const REMEMBER_FLAG_KEY = '@diyetle_remember_me';
const AUTOLOGIN_KEY = '@diyetle_autologin';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    loadSavedEmail();
  }, []);

  const loadSavedEmail = async () => {
    try {
      const savedFlag = await AsyncStorage.getItem(REMEMBER_FLAG_KEY);
      if (savedFlag === 'true') {
        const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      }
    } catch {}
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun!');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(email, password);

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email);
        await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'true');
        await AsyncStorage.setItem(AUTOLOGIN_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
        await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'false');
        await AsyncStorage.removeItem(AUTOLOGIN_KEY);
      }

      if (user.role === 'dietitian') {
        navigation.replace('DietitianHome');
      } else {
        navigation.replace('PatientHome');
      }
    } catch (error: any) {
      if (error.code === 'auth/pending-approval') {
        navigation.replace('PendingApproval');
      } else if (error.code === 'auth/email-not-verified') {
        Alert.alert(
          'E-posta Doğrulaması Gerekli',
          'Hesabınızı aktif edebilmek için e-posta adresinizi doğrulamanız gerekiyor.\n\nOnay e-postasını tekrar gönderelim mi?',
          [
            { text: 'Hayır', style: 'cancel' },
            {
              text: 'Yeniden Gönder',
              onPress: async () => {
                try {
                  const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
                  const cred = await signInWithEmailAndPassword(auth, email, password);
                  await sendEmailVerification(cred.user);
                  await signOut(auth);
                  Alert.alert('Gönderildi', 'Doğrulama e-postası gönderildi. Lütfen e-postasınızı kontrol edin.');
                } catch {
                  Alert.alert('Hata', 'E-posta gönderilemedi. Lütfen tekrar deneyin.');
                }
              },
            },
          ]
        );
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= 3 && email.trim()) {
          Alert.alert(
            'Giriş Hatası',
            `${error.message}\n\nArt arda ${newAttempts} kez yanlış giriş yaptınız. Şifrenizi sıfırlamak ister misiniz?`,
            [
              { text: 'Hayır', style: 'cancel' },
              {
                text: 'Şifremi Sıfırla',
                onPress: async () => {
                  try {
                    await sendResetEmail(email);
                    setFailedAttempts(0);
                  } catch {
                    Alert.alert('Hata', 'E-posta gönderilemedi. Lütfen tekrar deneyin.');
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Giriş Hatası', error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.isNewUser) {
        Alert.alert(
          'Hesap Bulunamadı',
          'Bu Google hesabıyla kayıtlı bir hesap yok. Kayıt olmak ister misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Kayıt Ol', onPress: () => navigation.navigate('Register') },
          ]
        );
        return;
      }
      if (result.user?.role === 'dietitian') {
        navigation.replace('DietitianHome');
      } else {
        navigation.replace('PatientHome');
      }
    } catch (error: any) {
      if (error.code === 'auth/pending-approval') {
        navigation.replace('PendingApproval');
      } else if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== 'SIGN_IN_REQUIRED') {
        Alert.alert('Google Giriş Hatası', error.message || 'Giriş yapılamadı.');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async (targetEmail: string) => {
    // Firestore'da mail kayıtlı mı kontrol et
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', targetEmail.trim())));
    if (snap.empty) {
      Alert.alert('Hata', 'Bu e-posta adresiyle kayıtlı hesap bulunamadı.');
      return;
    }
    await sendPasswordResetEmail(auth, targetEmail.trim());
    Alert.alert(
      'E-posta Gönderildi',
      `Şifre sıfırlama bağlantısı "${targetEmail}" adresine gönderildi. Gelen kutunuzu ve spam klasörünüzü kontrol edin.`,
      [{ text: 'Tamam' }]
    );
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert(
        'Şifremi Unuttum',
        'Lütfen önce e-posta adresinizi girin, ardından "Şifremi Unuttum?" butonuna basın.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    Alert.alert(
      'Şifremi Unuttum',
      `"${email}" adresine şifre sıfırlama bağlantısı gönderilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            try {
              await sendResetEmail(email);
            } catch {
              Alert.alert('Hata', 'E-posta gönderilemedi. Lütfen tekrar deneyin.');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Giriş Yap</Text>
        <Text style={styles.subtitle}>Diyetle hesabınıza giriş yapın</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
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
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Şifre"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Remember Me */}
        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
            {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={styles.rememberLabel}>Beni hatırla</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotText}>Şifremi Unuttum?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* TODO: Development build gerektirir — npx expo run:android/ios sonrası aktif et */}
        <TouchableOpacity
          style={[styles.googleButton, styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={true}
        >
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            Hesabınız yok mu? <Text style={styles.linkBold}>Kayıt Ol</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Geri Dön</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 60,
    textAlign: 'center',
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
    marginBottom: 40,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
  },
  eyeBtn: { padding: 4 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberLabel: {
    fontSize: 15,
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.textLight,
  },
  loginButtonText: {
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textLight,
    fontSize: 16,
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
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
