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
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

export default function ChangePasswordScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun!');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır!');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor!');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Hata', 'Yeni şifre mevcut şifreyle aynı olamaz!');
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

      // Önce mevcut şifreyi doğrula (reauthenticate)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Şifreyi güncelle
      await updatePassword(user, newPassword);

      Alert.alert('Başarılı!', 'Şifreniz başarıyla değiştirildi!', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Hata', 'Mevcut şifreniz yanlış!');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Hata', 'Yeni şifre çok zayıf!');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Hata', 'Güvenlik nedeniyle lütfen çıkış yapıp tekrar giriş yapın!');
      } else {
        Alert.alert('Hata', error.message || 'Şifre değiştirilemedi!');
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
          <Text style={styles.headerEmoji}>🔐</Text>
          <Text style={styles.headerTitle}>Şifre Değiştir</Text>
          <Text style={styles.headerSubtitle}>Hesap güvenliğinizi koruyun</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 Güçlü bir şifre için:
          </Text>
          <Text style={styles.infoItem}>• En az 6 karakter kullanın</Text>
          <Text style={styles.infoItem}>• Büyük ve küçük harf karışımı</Text>
          <Text style={styles.infoItem}>• Rakam ve özel karakter ekleyin</Text>
        </View>

        <Text style={styles.label}>Mevcut Şifre *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mevcut şifreniz"
            placeholderTextColor={colors.textLight}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowCurrent(!showCurrent)}
          >
            <Text style={styles.eyeIcon}>{showCurrent ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Yeni Şifre *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Yeni şifreniz (min. 6 karakter)"
            placeholderTextColor={colors.textLight}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNew(!showNew)}
          >
            <Text style={styles.eyeIcon}>{showNew ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Yeni Şifre (Tekrar) *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Yeni şifrenizi tekrar girin"
            placeholderTextColor={colors.textLight}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirm(!showConfirm)}
          >
            <Text style={styles.eyeIcon}>{showConfirm ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.changeButton, loading && styles.changeButtonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.changeButtonText}>🔐 Şifremi Değiştir</Text>
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
    backgroundColor: colors.warning + '22',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: colors.warning,
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