import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

interface ProfilePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'emoji' | 'avatar', value: string) => void;
  currentEmoji?: string;
  currentAvatar?: string;
}

const EMOJI_OPTIONS = [
  '😊', '😎', '🤗', '🥳', '😇', '🤩', '😋', '🤓',
  '🌟', '✨', '🎯', '🎨', '🎭', '🎪', '🎬', '🎸',
  '🍎', '🥗', '🥑', '🍇', '🥦', '🥕', '🍓', '🥝',
  '💪', '🏃', '🧘', '🚴', '⛹️', '🤸', '🏋️', '🥇',
  '❤️', '💚', '💙', '💜', '🧡', '💛', '🤍', '💖',
];

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

export default function ProfilePicker({
  visible,
  onClose,
  onSelect,
  currentEmoji,
  currentAvatar,
}: ProfilePickerProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [selectedTab, setSelectedTab] = useState<'emoji' | 'avatar'>('emoji');

  const handleSelectEmoji = (emoji: string) => {
    onSelect('emoji', emoji);
    Alert.alert('Başarılı', 'Profil emojiniz güncellendi!');
    onClose();
  };

  const handleSelectAvatar = (avatarId: string) => {
    onSelect('avatar', avatarId);
    Alert.alert('Başarılı', 'Profil avatarınız güncellendi!');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profil Görselinizi Seçin</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'emoji' && styles.activeTab,
                { backgroundColor: selectedTab === 'emoji' ? colors.primary : 'transparent' },
              ]}
              onPress={() => setSelectedTab('emoji')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTab === 'emoji' ? colors.white : colors.text },
                ]}
              >
                😊 Emoji
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'avatar' && styles.activeTab,
                { backgroundColor: selectedTab === 'avatar' ? colors.primary : 'transparent' },
              ]}
              onPress={() => setSelectedTab('avatar')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTab === 'avatar' ? colors.white : colors.text },
                ]}
              >
                👤 Avatar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {selectedTab === 'emoji' ? (
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.emojiButton,
                      currentEmoji === emoji && styles.selectedEmoji,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => handleSelectEmoji(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                    {currentEmoji === emoji && (
                      <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.avatarGrid}>
                {AVATAR_PRESETS.map((avatar) => (
                  <TouchableOpacity
                    key={avatar.id}
                    style={[
                      styles.avatarButton,
                      currentAvatar === avatar.id && styles.selectedAvatar,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => handleSelectAvatar(avatar.id)}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: avatar.color }]}>
                      <Ionicons name={avatar.icon as any} size={36} color="#FFFFFF" />
                    </View>
                    {currentAvatar === avatar.id && (
                      <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color={colors.textLight} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Seçtiğiniz görsel ana ekran profil bölümünde görünecektir
            </Text>
          </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  emojiButton: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedEmoji: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  emojiText: {
    fontSize: 40,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  avatarButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedAvatar: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
