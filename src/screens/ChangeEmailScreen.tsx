import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function ChangeEmailScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleChangeEmail = async () => {
    if (!currentPassword || !newEmail.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin!');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user || !user.email) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı!');
        return;
      }

      if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
        Alert.alert('Hata', 'Yeni e-posta adresi mevcut adresle aynı olamaz!');
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail.trim());

      Alert.alert(
        'Doğrulama E-postası Gönderildi',
        newEmail.trim() + ' adresine doğrulama linki gönderildi.\n\nLinke tıkladıktan sonra e-posta adresiniz güncellenecektir.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Hata', 'Mevcut şifreniz yanlış!');
      } else if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Hata', 'Bu e-posta adresi zaten kullanımda!');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Hata', 'Geçersiz e-posta adresi formatı!');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Hata', 'Güvenlik nedeniyle lütfen çıkış yapıp tekrar giriş yapın!');
      } else {
        Alert.alert('Hata', error.message || 'E-posta değiştirilemedi!');
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>✉️</Text>
          <Text style={styles.headerTitle}>E-posta Değiştir</Text>
          <Text style={styles.headerSubtitle}>Hesabınızın e-posta adresini güncelleyin</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>💡 Nasıl çalışır?</Text>
          <Text style={styles.infoItem}>• Yeni adresinize doğrulama linki gönderilir</Text>
          <Text style={styles.infoItem}>• Linke tıkladıktan sonra adresiniz güncellenir</Text>
          <Text style={styles.infoItem}>• Onaylanana kadar mevcut adresiniz geçerlidir</Text>
        </View>

        <Text style={styles.label}>Mevcut Şifre *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mevcut şifrenizi doğrulayın"
            placeholderTextColor={colors.textLight}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Yeni E-posta Adresi *</Text>
        <TextInput
          style={styles.input}
          placeholder="yeni@eposta.com"
          placeholderTextColor={colors.textLight}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.changeButton, loading && styles.changeButtonDisabled]}
          onPress={handleChangeEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.changeButtonText}>✉️ Doğrulama E-postası Gönder</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof import('../constants/colors').getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 30,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 60,
    marginBottom: 10,
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
  infoCard: {
    backgroundColor: colors.primary + '22',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 10,
    marginVertical: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 15,
  },
  eyeIcon: {
    fontSize: 20,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    fontSize: 16,
    color: colors.text,
  },
  changeButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  changeButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  changeButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});