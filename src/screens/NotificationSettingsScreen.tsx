import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import {
  getUserNotificationSettings,
  updateNotificationSettings,
  NotificationSettings
} from '../services/notificationSettingsService';

interface NotificationOption {
  id: keyof Omit<NotificationSettings, 'userId'>;
  title: string;
  description: string;
  icon: string;
  category: 'general' | 'patient' | 'messages' | 'reminders';
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  // Genel Bildirimler
  {
    id: 'allNotifications',
    title: 'Tüm Bildirimler',
    description: 'Tüm bildirimleri aç/kapat',
    icon: 'notifications',
    category: 'general',
  },
  {
    id: 'soundEnabled',
    title: 'Bildirim Sesleri',
    description: 'Bildirim geldiğinde ses çal',
    icon: 'volume-high',
    category: 'general',
  },
  {
    id: 'vibrationEnabled',
    title: 'Titreşim',
    description: 'Bildirim geldiğinde titreşim',
    icon: 'phone-portrait',
    category: 'general',
  },

  // Danışan Bildirimleri
  {
    id: 'newPatientNotification',
    title: 'Yeni Danışan',
    description: 'Yeni danışan eklendiğinde bildirim al',
    icon: 'person-add',
    category: 'patient',
  },
  {
    id: 'patientWeightUpdateNotification',
    title: 'Kilo Güncellemesi',
    description: 'Danışan kilosunu güncellediğinde bildirim al',
    icon: 'analytics',
    category: 'patient',
  },
  {
    id: 'patientProgressNotification',
    title: 'İlerleme Bildirimleri',
    description: 'Danışan hedefine ulaştığında bildirim al',
    icon: 'trophy',
    category: 'patient',
  },

  // Mesaj Bildirimleri
  {
    id: 'newQuestionNotification',
    title: 'Yeni Mesaj',
    description: 'Yeni soru geldiğinde bildirim al',
    icon: 'chatbubbles',
    category: 'messages',
  },
  {
    id: 'questionAnsweredNotification',
    title: 'Cevap Bildirimi',
    description: 'Soruya cevap verildiğinde bildirim al',
    icon: 'checkmark-circle',
    category: 'messages',
  },

  // Hatırlatma Bildirimleri
  {
    id: 'dailyReminderNotification',
    title: 'Günlük Hatırlatma',
    description: 'Günlük özet bildirimi al',
    icon: 'calendar',
    category: 'reminders',
  },
  {
    id: 'appointmentReminderNotification',
    title: 'Randevu Hatırlatması',
    description: 'Randevu yaklaştığında bildirim al',
    icon: 'time',
    category: 'reminders',
  },
  {
    id: 'followUpReminderNotification',
    title: 'Takip Hatırlatması',
    description: 'Danışan takibi için hatırlatma al',
    icon: 'alarm',
    category: 'reminders',
  },
];

const CATEGORIES = [
  { id: 'general', title: 'Genel Ayarlar', icon: 'settings' },
  { id: 'patient', title: 'Danışan Bildirimleri', icon: 'people' },
  { id: 'messages', title: 'Mesaj Bildirimleri', icon: 'chatbubbles' },
  { id: 'reminders', title: 'Hatırlatmalar', icon: 'notifications' },
];

export default function NotificationSettingsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userSettings = await getUserNotificationSettings(currentUser.id);
        setSettings(userSettings);
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Bildirim ayarları yüklenemedi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof Omit<NotificationSettings, 'userId'>) => {
    if (!settings) return;

    try {
      setSaving(true);
      const updatedSettings = { ...settings, [key]: !settings[key] };

      // Eğer "Tüm Bildirimler" kapatılıyorsa, diğer tüm bildirimleri kapat
      if (key === 'allNotifications' && !updatedSettings.allNotifications) {
        NOTIFICATION_OPTIONS.forEach(option => {
          if (option.id !== 'allNotifications') {
            updatedSettings[option.id] = false;
          }
        });
      }

      // Eğer herhangi bir bildirim açıldıysa, "Tüm Bildirimler" otomatik açılsın
      if (key !== 'allNotifications' && updatedSettings[key]) {
        updatedSettings.allNotifications = true;
      }

      await updateNotificationSettings(settings.userId, updatedSettings);
      setSettings(updatedSettings);
    } catch (error: any) {
      Alert.alert('Hata', 'Ayar güncellenemedi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderNotificationOption = (option: NotificationOption) => {
    if (!settings) return null;

    const isEnabled = settings[option.id];
    const isDisabled = !settings.allNotifications && option.id !== 'allNotifications';

    return (
      <View
        key={option.id}
        style={[
          styles.optionCard,
          { backgroundColor: colors.cardBackground },
          isDisabled && styles.disabledCard,
        ]}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={option.icon as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
            <Text style={[styles.optionDescription, { color: colors.textLight }]}>
              {option.description}
            </Text>
          </View>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={() => handleToggle(option.id)}
          disabled={isDisabled || saving}
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor={isEnabled ? colors.white : '#f4f3f4'}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Bildirim tercihlerinizi aşağıdan yönetebilirsiniz. Bildirimleri kapatmak uygulamanızın
            kullanımını etkilemeyecektir.
          </Text>
        </View>

        {/* Notification Options by Category */}
        {CATEGORIES.map(category => {
          const categoryOptions = NOTIFICATION_OPTIONS.filter(
            opt => opt.category === category.id
          );

          return (
            <View key={category.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name={category.icon as any} size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {category.title}
                </Text>
              </View>
              <View style={styles.optionsContainer}>
                {categoryOptions.map(renderNotificationOption)}
              </View>
            </View>
          );
        })}

        {/* Test Notification Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('Test Bildirimi', 'Bildirim ayarlarınız başarıyla kaydedildi!')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
            <Text style={[styles.testButtonText, { color: colors.white }]}>
              Test Bildirimi Gönder
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
