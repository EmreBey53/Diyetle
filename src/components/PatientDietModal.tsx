import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

interface PatientDietModalProps {
  visible: boolean;
  onClose: () => void;
  onViewFullDiet: () => void;
}

export default function PatientDietModal({
  visible,
  onClose,
  onViewFullDiet,
}: PatientDietModalProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Diyet Planım</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                Günlük beslenme programınız
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="restaurant" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Günlük Diyet Programı
              </Text>
              <Text style={[styles.infoDescription, { color: colors.textLight }]}>
                Diyetisyeninizin size özel hazırladığı beslenme planını görüntüleyin.
                Günlük öğünlerinizi ve besin değerlerini takip edin.
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Ionicons name="flame" size={24} color="#FF9800" />
                <Text style={[styles.statValue, { color: colors.text }]}>1800</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Kalori/Gün</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Ionicons name="nutrition" size={24} color="#4CAF50" />
                <Text style={[styles.statValue, { color: colors.text }]}>3</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Ana Öğün</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Ionicons name="time" size={24} color="#2196F3" />
                <Text style={[styles.statValue, { color: colors.text }]}>2</Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>Ara Öğün</Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                onViewFullDiet();
                onClose();
              }}
            >
              <Ionicons name="calendar" size={24} color={colors.white} />
              <Text style={[styles.viewButtonText, { color: colors.white }]}>
                Detaylı Diyet Planını Görüntüle
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>

            {/* Tips */}
            <View style={[styles.tipsCard, { backgroundColor: colors.background }]}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb" size={20} color={colors.primary} />
                <Text style={[styles.tipTitle, { color: colors.text }]}>İpuçları</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.tipText, { color: colors.textLight }]}>
                  Öğünleri atlamayın, düzenli beslenin
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.tipText, { color: colors.textLight }]}>
                  Günlük su tüketiminizi takip edin
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.tipText, { color: colors.textLight }]}>
                  Öğün fotoğraflarınızı paylaşın
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 16,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
  },
});
