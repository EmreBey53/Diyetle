import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import * as Notifications from 'expo-notifications';
import { Notification } from '../models/Notification';
import { getUserNotifications, markNotificationAsRead, deleteAllNotifications } from '../services/notificationService';

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string, params?: any) => void; // Callback for navigation
  userId: string; // Current user's ID
}

export default function NotificationPanel({
  visible,
  onClose,
  onNavigate,
  userId,
}: NotificationPanelProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Firestore'dan kullanıcıya özel bildirimleri al
      const userNotifications = await getUserNotifications(userId);
      setNotifications(userNotifications);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Firestore'daki tüm bildirimleri sil
      await deleteAllNotifications(userId);
      // Cihaz bildirimlerini de temizle
      await Notifications.dismissAllNotificationsAsync();
      setNotifications([]);
    } catch (error) {
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meal_photo':
        return 'camera';
      case 'photo_response':
        return 'checkmark-circle';
      case 'diet_expiring':
      case 'diet_expired':
        return 'restaurant';
      case 'new_patient':
        return 'person-add';
      case 'new_question':
        return 'help-circle';
      case 'question_response':
        return 'chatbubble-ellipses';
      case 'water_reminder':
        return 'water';
      case 'new_diet':
      case 'diet_assigned':
        return 'document-text';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'meal_photo':
        return '#FF9800';
      case 'photo_response':
        return '#4CAF50';
      case 'diet_expiring':
        return '#FFC107';
      case 'diet_expired':
        return '#F44336';
      case 'new_patient':
        return '#4CAF50';
      case 'new_question':
        return '#2196F3';
      case 'question_response':
        return '#65C18C';
      case 'water_reminder':
        return '#03A9F4';
      case 'new_diet':
      case 'diet_assigned':
        return '#9C27B0';
      default:
        return colors.primary;
    }
  };

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return new Date(timestamp).toLocaleDateString('tr-TR');
  };

  const handleNotificationPress = async (item: Notification) => {
    // Bildirimi okundu olarak işaretle
    if (!item.read) {
      await markNotificationAsRead(item.id);
      // Local state'i güncelle
      setNotifications(prevNotifs =>
        prevNotifs.map(n => n.id === item.id ? { ...n, read: true } : n)
      );
    }

    if (!onNavigate) {
      onClose();
      return;
    }

    onClose(); // Önce paneli kapat

    const notifType = item.type;

    // Navigation'ı setTimeout ile geciktir (modal kapanma animasyonundan sonra)
    setTimeout(() => {
      switch (notifType) {
        case 'meal_photo':
          // Diyetisyen: Öğün fotoğrafları ekranına git
          const patientId = item.data?.patientId;
          if (patientId) {
            onNavigate('DietitianMealPhotos', { patientId });
          }
          break;
        case 'photo_response':
          // Danışan: Öğün fotoğrafları ekranına git
          onNavigate('PatientMealPhoto');
          break;
        case 'new_question':
          // Diyetisyen: Sorular ekranına git
          onNavigate('DietitianQuestions');
          break;
        case 'question_response':
          // Danışan: Sorular ekranına git
          onNavigate('PatientQuestions');
          break;
        case 'water_reminder':
          // Danışan: Ana ekranda zaten su takibi var, ana ekrana dön
          // Tab navigator'daysa zaten ana ekrandayız
          break;
        case 'new_diet':
        case 'diet_assigned':
          // Danışan: Diyet planı ekranına git
          onNavigate('PatientDiet');
          break;
        case 'diet_expiring':
        case 'diet_expired':
          // Diyet planı ekranına git (hem diyetisyen hem danışan için)
          const dietPlanId = item.data?.dietPlanId;
          if (item.data?.patientId) {
            // Diyetisyen view
            onNavigate('PatientDetail', { patientId: item.data.patientId });
          } else {
            // Danışan view
            onNavigate('PatientDiet');
          }
          break;
        case 'new_patient':
          // Diyetisyen: Danışanlar ekranına git (Tab içinde)
          onNavigate('DietitianPatients');
          break;
        default:
          break;
      }
    }, 300); // Modal kapanma animasyonunu bekle
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const notifType = item.type;
    const iconName = getNotificationIcon(notifType);
    const iconColor = getNotificationColor(notifType);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: colors.cardBackground,
            borderLeftColor: iconColor,
            opacity: item.read ? 0.6 : 1, // Okunmuş bildirimler daha soluk
          }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.notificationIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName as any} size={24} color={iconColor} />
        </View>
        <View style={styles.notificationContent}>
          <Text
            style={[
              styles.notificationTitle,
              {
                color: colors.text,
                fontWeight: item.read ? '400' : '600', // Okunmuş olanlar daha ince
              }
            ]}
            numberOfLines={1}
          >
            {item.read ? '✓ ' : ''}{item.title}
          </Text>
          <Text style={[styles.notificationBody, { color: colors.textLight }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.notificationTime, { color: colors.textLight }]}>
            {getTimeAgo(item.createdAt)}
          </Text>
        </View>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="notifications" size={24} color={colors.white} />
              <Text style={[styles.headerTitle, { color: colors.white }]}>
                Bildirimler
              </Text>
              {notifications.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.white }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {notifications.length}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Henüz bildirim bulunmuyor
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotification}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: colors.background }]}
                onPress={clearAllNotifications}
              >
                <Ionicons name="trash-outline" size={20} color="#F44336" />
                <Text style={styles.clearButtonText}>Tümünü Sil</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
});
