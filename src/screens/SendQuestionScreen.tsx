
// src/screens/SendQuestionScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../services/authService';
import { User } from '../models/User';

export default function SendQuestionScreen({ route, navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const patient = route.params?.patient; // Optional - sadece diyetisyen için

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  // Kullanıcı tipine göre subtitle belirleme
  const getSubtitle = () => {
    if (patient) {
      // Diyetisyen danışana mesaj gönderiyor
      return `${patient.name} için`;
    } else if (user?.role === 'patient') {
      // Danışan diyetisyene mesaj gönderiyor
      return 'Diyetisyeninize mesaj gönderin';
    }
    return '';
  };

  const getCardText = () => {
    if (user?.role === 'patient') {
      return 'Diyetisyeninize soru sorabilir, görüşlerinizi iletebilirsiniz.';
    }
    return 'Danışanınıza mesaj ve sorular gönderebileceksiniz.';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💬</Text>
      <Text style={styles.title}>
        {user?.role === 'patient' ? 'Mesaj Gönder' : 'Soru Gönder'}
      </Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>
          Bu özellik yakında eklenecek! 🚀
        </Text>
        <Text style={styles.cardSubtext}>
          {getCardText()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: 40,
  },
  card: {
    backgroundColor: colors.white,
    padding: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  cardSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 30,
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: '100%',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});