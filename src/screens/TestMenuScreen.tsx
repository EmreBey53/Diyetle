// src/screens/TestMenuScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../services/authService';

interface TestMenuScreenProps {
  navigation: any;
}

export default function TestMenuScreen({ navigation }: TestMenuScreenProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      addTestResult(`✅ Kullanıcı yüklendi: ${user?.displayName} (${user?.role})`);
    } catch (error) {
      addTestResult(`❌ Kullanıcı yükleme hatası: ${error}`);
    }
  };

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const goBack = () => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback navigation based on user role
        if (currentUser?.role === 'dietitian') {
          navigation.navigate('DietitianHome');
        } else {
          navigation.navigate('PatientHome');
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Last resort - navigate to welcome screen
      navigation.navigate('Welcome');
    }
  };

  // Basit test fonksiyonları
  const testChat = () => {
    try {
      navigation.navigate('ChatSelection');
      addTestResult('💬 Chat seçim ekranı açıldı');
    } catch (error) {
      addTestResult(`❌ Chat test hatası: ${error}`);
      Alert.alert('Chat Test', 'Chat sistemi test edildi!');
    }
  };

  const testChatNotifications = async () => {
    try {
      // Dinamik import ile circular dependency'yi önle
      const { sendChatNotification } = await import('../services/smartNotificationService');
      
      if (currentUser?.id) {
        // Test chat bildirimi gönder
        await sendChatNotification(
          currentUser.id,
          'Test Kullanıcısı',
          'Bu bir test mesajıdır! 💬 Chat bildirimi çalışıyor mu?',
          'test-chat-room-123'
        );
        
        addTestResult('💬 Chat bildirimi gönderildi');
        
        Alert.alert(
          '💬 Chat Bildirim Testi',
          'Test chat bildirimi gönderildi!\n\n✅ Bildirim gönderildi\n✅ Push notification hazırlandı\n\nBildirimi görmek için uygulamayı arka plana alın.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      addTestResult(`❌ Chat bildirim test hatası: ${error}`);
      Alert.alert('Hata', 'Chat bildirim testi başarısız oldu');
    }
  };

  const testVideoCall = () => {
    try {
      navigation.navigate('VideoCallSelection');
      addTestResult('📹 Video görüşme seçim ekranı açıldı');
    } catch (error) {
      addTestResult(`❌ Video call test hatası: ${error}`);
      Alert.alert('Video Call Test', 'Video görüşme sistemi test edildi!');
    }
  };

  const testAppointmentCalendar = () => {
    try {
      navigation.navigate('AppointmentCalendar');
      addTestResult('📅 Randevu takvimi açıldı');
    } catch (error) {
      addTestResult(`❌ Randevu takvimi test hatası: ${error}`);
      Alert.alert('Hata', 'Randevu takvimi açılamadı');
    }
  };

  const testNotifications = async () => {
    try {
      // Dinamik import ile circular dependency'yi önle
      const { registerForPushNotifications, createPersonalizedReminder, sendEmergencyNotification } = await import('../services/smartNotificationService');

      if (currentUser?.id) {
        // Push token kaydet
        const token = await registerForPushNotifications(currentUser.id);
        addTestResult(`🔔 Push token: ${token ? 'Başarılı' : 'Başarısız'}`);

        // Test bildirimi gönder
        await sendEmergencyNotification(
          currentUser.id,
          'Bu bir test bildirimidir! 🧪',
          'high'
        );
        addTestResult('🔔 Test bildirimi gönderildi');

        // Kişiselleştirilmiş hatırlatıcı oluştur
        await createPersonalizedReminder(currentUser.id, {
          bmi: 26,
          age: 35,
          weight: 75
        });
        addTestResult('🔔 Kişiselleştirilmiş hatırlatıcılar oluşturuldu');

        Alert.alert(
          '🔔 Bildirim Testi',
          'Bildirimler test edildi!\n\n✅ Push token kaydedildi\n✅ Test bildirimi gönderildi\n✅ Kişiselleştirilmiş hatırlatıcılar oluşturuldu\n\nBildirimleri görmek için uygulamayı arka plana alın.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      addTestResult(`❌ Bildirim test hatası: ${error}`);
      Alert.alert('Hata', 'Bildirim testi başarısız oldu');
    }
  };

  const runKVKKMigration = async () => {
    try {
      addTestResult('🔄 KVKK migration başlatılıyor...');

      const { migrateExistingUsersKVKK } = await import('../services/kvkkService');
      const results = await migrateExistingUsersKVKK();

      addTestResult(`✅ KVKK Migration tamamlandı: ${results.success} başarılı, ${results.skipped} atlandı, ${results.failed} başarısız`);

      Alert.alert(
        '🔒 KVKK Migration',
        `Tüm kullanıcılar için KVKK onayı oluşturuldu!\n\n✅ Başarılı: ${results.success}\n⏭️ Atlandı (zaten var): ${results.skipped}\n❌ Başarısız: ${results.failed}`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      addTestResult(`❌ KVKK migration hatası: ${error}`);
      Alert.alert('Hata', 'KVKK migration başarısız oldu');
    }
  };

  const testMenuItems = [
    {
      title: '💬 Chat Sistemi',
      subtitle: 'Real-time mesajlaşma',
      onPress: testChat,
      color: colors.primary,
    },
    {
      title: '💬 Chat Bildirimleri',
      subtitle: 'Mesaj bildirim testi',
      onPress: testChatNotifications,
      color: colors.info,
    },
    {
      title: '📹 Video Görüşme',
      subtitle: 'WebRTC video call',
      onPress: testVideoCall,
      color: colors.success,
    },
    {
      title: '📅 Randevu Takvimi',
      subtitle: 'Müsaitlik, rezervasyon',
      onPress: testAppointmentCalendar,
      color: colors.warning,
    },
    {
      title: '🔔 Akıllı Bildirimler',
      subtitle: 'Kişiselleştirilmiş hatırlatıcılar',
      onPress: testNotifications,
      color: colors.info,
    },
    {
      title: '🔒 KVKK Migration',
      subtitle: 'Tüm kullanıcılara KVKK onayı ekle',
      onPress: runKVKKMigration,
      color: colors.error,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧪 Test Menüsü</Text>
          <TouchableOpacity onPress={clearResults} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            👤 {currentUser?.displayName || 'Yükleniyor...'} ({currentUser?.role || '...'})
          </Text>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Test Menüsü</Text>
          {testMenuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { borderLeftColor: item.color }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Sonuçları</Text>
          <View style={styles.resultsContainer}>
            {testResults.length > 0 ? (
              testResults.slice(-10).map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))
            ) : (
              <Text style={styles.noResultsText}>Henüz test yapılmadı</Text>
            )}
          </View>
        </View>

        <View style={styles.exitSection}>
          <TouchableOpacity onPress={goBack} style={styles.exitButton}>
            <Ionicons name="exit-outline" size={20} color={colors.white} />
            <Text style={styles.exitButtonText}>Test Menüsünden Çık</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    marginLeft: 4,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  userInfo: {
    backgroundColor: colors.background,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  userText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  menuSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  resultsSection: {
    padding: 16,
    paddingTop: 0,
  },
  resultsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  resultText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  exitSection: {
    padding: 16,
    paddingTop: 8,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  exitButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
});