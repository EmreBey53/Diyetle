import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { logoutUser } from '../services/authService';

export default function PendingApprovalScreen({ navigation }: any) {
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.replace('Welcome');
    } catch {
      navigation.replace('Welcome');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="time" size={72} color={colors.warning} />
      </View>

      <Text style={styles.title}>Onay Bekleniyor</Text>
      <Text style={styles.subtitle}>
        Hesabınız başarıyla oluşturuldu!
      </Text>

      <View style={styles.card}>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Kayıt Tamamlandı</Text>
            <Text style={styles.stepDesc}>Profil bilgileriniz sisteme kaydedildi.</Text>
          </View>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Ionicons name="time" size={16} color={colors.white} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Admin Onayı Bekleniyor</Text>
            <Text style={styles.stepDesc}>Profiliniz inceleniyor. Bu işlem genellikle 24-48 saat sürer.</Text>
          </View>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotPending]}>
            <Text style={styles.stepDotNumber}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.textLight }]}>Sisteme Giriş</Text>
            <Text style={styles.stepDesc}>Onaylandıktan sonra giriş yapabilirsiniz.</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="mail-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Onay durumunuz için kayıtlı e-posta adresinizi kontrol edin.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="arrow-back-outline" size={20} color={colors.textLight} />
        <Text style={styles.logoutButtonText}>Giriş Ekranına Dön</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.white,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.warning + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepConnector: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 15,
    marginVertical: 4,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepDotDone: {
    backgroundColor: colors.success,
  },
  stepDotActive: {
    backgroundColor: colors.warning,
  },
  stepDotPending: {
    backgroundColor: colors.border,
  },
  stepDotNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    width: '100%',
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: {
    fontSize: 15,
    color: colors.textLight,
    fontWeight: '500',
  },
});
