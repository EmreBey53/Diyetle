import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { logoutUser, getCurrentUser, updateUserProfileImage } from '../services/authService';
import { User } from '../models/User';
import ProfilePicker from '../components/ProfilePicker';

export default function DietitianSettingsScreen({ navigation }: any) {
  const { isDark, themePreference, setThemePreference } = useTheme();
  const colors = getColors(isDark);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePickerVisible, setProfilePickerVisible] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              navigation.replace('Welcome');
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const handleProfileImageSelect = async (type: 'emoji' | 'avatar' | 'photo', value: string) => {
    if (!user) return;

    try {
      if (type === 'emoji') {
        await updateUserProfileImage(user.id, value, undefined);
      } else {
        await updateUserProfileImage(user.id, undefined, value);
      }
      await loadUser();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  // Render avatar helper
  const renderAvatar = () => {
    if (user?.profileEmoji) {
      return <Text style={styles.emojiAvatar}>{user.profileEmoji}</Text>;
    }

    if (user?.profileImage) {
      if (user.profileImage.startsWith('http')) {
        return (
          <Image
            source={{ uri: user.profileImage }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
        );
      }
      const avatarPreset = AVATAR_PRESETS.find(a => a.id === user.profileImage);
      if (avatarPreset) {
        return (
          <View style={[styles.avatarCircle, { backgroundColor: avatarPreset.color }]}>
            <Ionicons name={avatarPreset.icon as any} size={48} color="#FFFFFF" />
          </View>
        );
      }
    }

    // Default icon
    return <Ionicons name="person-circle" size={80} color={colors.primary} />;
  };

  // Avatar presets (same as ProfilePicker)
  const AVATAR_PRESETS = [
    { id: 'male1', icon: 'person', color: '#4CAF50' },
    { id: 'male2', icon: 'person', color: '#2196F3' },
    { id: 'male3', icon: 'person', color: '#9C27B0' },
    { id: 'male4', icon: 'person', color: '#FF9800' },
    { id: 'female1', icon: 'person-circle', color: '#E91E63' },
    { id: 'female2', icon: 'person-circle', color: '#00BCD4' },
    { id: 'female3', icon: 'person-circle', color: '#FFC107' },
    { id: 'female4', icon: 'person-circle', color: '#8BC34A' },
    { id: 'doctor1', icon: 'medical', color: '#F44336' },
    { id: 'doctor2', icon: 'medkit', color: '#3F51B5' },
    { id: 'nutritionist1', icon: 'nutrition', color: '#4CAF50' },
    { id: 'nutritionist2', icon: 'leaf', color: '#8BC34A' },
  ];

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    danger,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: danger ? '#FFEBEE' : colors.primary + '15' }]}>
        <Ionicons name={icon as any} size={22} color={danger ? '#FF5252' : colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: danger ? '#FF5252' : colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textLight }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => setProfilePickerVisible(true)}
              activeOpacity={0.7}
            >
              {renderAvatar()}
              <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'Diyetisyen'}</Text>
            <Text style={[styles.userEmail, { color: colors.textLight }]}>{user?.email}</Text>
            <TouchableOpacity
              style={[styles.changeProfileButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => setProfilePickerVisible(true)}
            >
              <Ionicons name="images" size={16} color={colors.primary} />
              <Text style={[styles.changeProfileText, { color: colors.primary }]}>Profil Görseli Değiştir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hesap Ayarları</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              icon="person-outline"
              title="Profil Bilgileri"
              subtitle="Adınızı ve bilgilerinizi düzenleyin"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="lock-closed-outline"
              title="Şifre Değiştir"
              subtitle="Hesap güvenliğinizi güncelleyin"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="mail-outline"
              title="E-posta Değiştir"
              subtitle="Hesabınızın e-posta adresini güncelleyin"
              onPress={() => navigation.navigate('ChangeEmail')}
            />
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Görünüm</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
            {/* System Theme Option */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setThemePreference('system')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Sistem Teması</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textLight }]}>
                  Telefonunuzun temasını takip eder
                </Text>
              </View>
              {themePreference === 'system' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Light Theme Option */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setThemePreference('light')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="sunny-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Açık Tema</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textLight }]}>
                  Her zaman açık tema
                </Text>
              </View>
              {themePreference === 'light' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Dark Theme Option */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setThemePreference('dark')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="moon-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Karanlık Tema</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textLight }]}>
                  Her zaman karanlık tema
                </Text>
              </View>
              {themePreference === 'dark' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirimler</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              icon="notifications-outline"
              title="Bildirim Ayarları"
              subtitle="Push bildirimlerini yönetin"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="mail-outline"
              title="E-posta Bildirimleri"
              subtitle="Hangi e-postaları alacağınızı seçin"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Uygulama</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              icon="information-circle-outline"
              title="Hakkında"
              subtitle="Versiyon 1.0.0"
              onPress={() => Alert.alert('Diyetle', 'Versiyon 1.0.0\n\nProfesyonel diyet takip uygulaması')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="shield-checkmark-outline"
              title="Güvenlik & KVKK"
              subtitle="Güvenlik ayarları, KVKK rızaları"
              onPress={() => navigation.navigate('SecuritySettings')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingItem
              icon="help-circle-outline"
              title="Yardım & Destek"
              subtitle="SSS ve iletişim"
              onPress={() => navigation.navigate('HelpSupport')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              icon="log-out-outline"
              title="Çıkış Yap"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Profile Picker Modal */}
      <ProfilePicker
        visible={profilePickerVisible}
        onClose={() => setProfilePickerVisible(false)}
        onSelect={handleProfileImageSelect}
        currentEmoji={user?.profileEmoji}
        currentAvatar={user?.profileImage}
        currentPhotoURL={user?.profileImage?.startsWith('http') ? user.profileImage : undefined}
        userId={user?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  emojiAvatar: {
    fontSize: 80,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  changeProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  changeProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingLeft: 4,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
});
