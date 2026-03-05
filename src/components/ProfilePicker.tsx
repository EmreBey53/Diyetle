import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

interface ProfilePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'emoji' | 'avatar' | 'photo', value: string) => void;
  currentEmoji?: string;
  currentAvatar?: string;
  currentPhotoURL?: string;
  userId?: string;
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
  currentPhotoURL,
  userId,
}: ProfilePickerProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [selectedTab, setSelectedTab] = useState<'emoji' | 'avatar' | 'photo'>('emoji');
  const [uploading, setUploading] = useState(false);

  const handleSelectEmoji = (emoji: string) => {
    onSelect('emoji', emoji);
    Alert.alert('Başarılı', 'Profil emojin güncellendi!');
    onClose();
  };

  const handleSelectAvatar = (avatarId: string) => {
    onSelect('avatar', avatarId);
    Alert.alert('Başarılı', 'Profil avatarın güncellendi!');
    onClose();
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi alınamadı.');
      return;
    }

    try {
      setUploading(true);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profile_photos/${userId}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      onSelect('photo', downloadURL);
      Alert.alert('Başarılı', 'Profil fotoğrafın güncellendi!');
      onClose();
    } catch {
      Alert.alert('Hata', 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
    }
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
              <Text style={[styles.tabText, { color: selectedTab === 'emoji' ? colors.white : colors.text }]}>
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
              <Text style={[styles.tabText, { color: selectedTab === 'avatar' ? colors.white : colors.text }]}>
                👤 Avatar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'photo' && styles.activeTab,
                { backgroundColor: selectedTab === 'photo' ? colors.primary : 'transparent' },
              ]}
              onPress={() => setSelectedTab('photo')}
            >
              <Text style={[styles.tabText, { color: selectedTab === 'photo' ? colors.white : colors.text }]}>
                📷 Fotoğraf
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
            ) : selectedTab === 'avatar' ? (
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
            ) : (
              <View style={styles.photoContainer}>
                {currentPhotoURL ? (
                  <Image source={{ uri: currentPhotoURL }} style={styles.currentPhoto} />
                ) : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: colors.background }]}>
                    <Ionicons name="person" size={64} color={colors.textLight} />
                    <Text style={[styles.photoPlaceholderText, { color: colors.textLight }]}>
                      Henüz fotoğraf yok
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.pickPhotoButton, { backgroundColor: colors.primary }]}
                  onPress={handlePickPhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={22} color="#fff" />
                      <Text style={styles.pickPhotoButtonText}>Galeriden Seç</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={[styles.photoHint, { color: colors.textLight }]}>
                  Fotoğraf kare olarak kırpılacak
                </Text>
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
  photoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 20,
  },
  currentPhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  photoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 13,
  },
  pickPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  pickPhotoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 13,
  },
});
