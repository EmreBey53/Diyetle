// src/screens/LoginScreen.tsx
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
import { loginUser, saveCredentials } from '../services/authService';
import { colors } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun!');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(email, password);
      
      // Kullanıcı bilgilerini AsyncStorage'a kaydet
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Beni Hatırla seçiliyse credential'ları kaydet
      if (rememberMe) {
        await saveCredentials(email, password, true);
      }

      Alert.alert('Başarılı!', `Hoş geldin ${user.displayName}! 🎉`);

      // Role göre yönlendir
      if (user.role === 'dietitian') {
        navigation.replace('DietitianHome');
      } else {
        navigation.replace('PatientHome');
      }
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message);
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
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Giriş Yap</Text>
        <Text style={styles.subtitle}>Diyetle hesabınıza giriş yapın</Text>

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
          placeholder="Şifre"
          placeholderTextColor={colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {/* Beni Hatırla Custom Checkbox */}
        <TouchableOpacity 
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
        >
          <Ionicons
            name={rememberMe ? 'checkbox' : 'checkbox-outline'}
            size={24}
            color={rememberMe ? colors.primary : colors.textLight}
          />
          <Text style={styles.rememberMeText}>Beni Hatırla</Text>
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
  input: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
  },
  rememberMeText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
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
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textLight,
    fontSize: 16,
  },
});