import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export default function AdminLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Şifremi Unuttum', 'Lütfen önce e-posta adresinizi girin.');
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
              const { sendPasswordResetEmail } = await import('firebase/auth');
              await sendPasswordResetEmail(auth, email.trim());
              Alert.alert('E-posta Gönderildi', 'Şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.');
            } catch {
              Alert.alert('Hata', 'E-posta gönderilemedi. Adresin doğru olduğundan emin olun.');
            }
          },
        },
      ]
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        await signOut(auth);
        Alert.alert('Yetkisiz Erişim', 'Bu hesabın admin yetkisi yok.');
        return;
      }

      // Admin'in push token'ını kaydet (bildirim alabilmek için)
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await updateDoc(doc(db, 'users', firebaseUser.uid), { pushToken: token });
        }
      } catch {}

      navigation.replace('AdminPanel');
    } catch (error: any) {
      const code = error?.code || '';
      let msg = 'E-posta veya şifre hatalı.';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        msg = 'E-posta veya şifre hatalı.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Çok fazla deneme. Lütfen bekleyin.';
      } else if (code) {
        msg = `Hata: ${code}`;
      }
      Alert.alert('Giriş Hatası', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={48} color="#6366F1" />
        </View>

        <Text style={styles.title}>Admin Paneli</Text>
        <Text style={styles.subtitle}>Yetkili giriş gereklidir</Text>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#6B7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>Şifremi Unuttum?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 36,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#F1F5F9',
    marginBottom: 14,
  },
  loginButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
});
