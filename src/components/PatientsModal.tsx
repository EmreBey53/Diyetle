import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { Patient, getBMIStatus, getBMIColor } from '../models/Patient';

interface PatientsModalProps {
  visible: boolean;
  onClose: () => void;
  patients: Patient[];
  onPatientPress: (patient: Patient) => void;
  onAddPatient: () => void;
}

export default function PatientsModal({
  visible,
  onClose,
  patients,
  onPatientPress,
  onAddPatient,
}: PatientsModalProps) {
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Danışan Listesi</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Danışan Listesi */}
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.modalListContent}
            renderItem={({ item }) => (
              <View style={[styles.modalPatientCard, { backgroundColor: colors.cardBackground }]}>
                <TouchableOpacity
                  style={styles.modalPatientContent}
                  onPress={() => onPatientPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalPatientLeft}>
                    <View style={styles.modalAvatarPlaceholder}>
                      <Ionicons name="person" size={32} color={colors.textLight} />
                    </View>
                  </View>
                  <View style={styles.modalPatientInfo}>
                    <Text style={[styles.modalPatientName, { color: colors.text }]}>{item.name}</Text>
                    {item.age && item.weight && (
                      <Text style={[styles.modalPatientDetails, { color: colors.textLight }]}>
                        {item.age} yaş • Hedef: {item.weight} kg
                      </Text>
                    )}
                    {item.bmi && (
                      <Text style={[styles.modalBmiText, { color: colors.text }]}>BMI: {item.bmi}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
                </TouchableOpacity>
                {item.bmi && (
                  <View style={[styles.modalBmiBar, { backgroundColor: getBMIColor(item.bmi) }]}>
                    <Text style={styles.modalBmiBarText}>{getBMIStatus(item.bmi)}</Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Text style={styles.modalEmptyEmoji}>👥</Text>
                <Text style={[styles.modalEmptyText, { color: colors.textLight }]}>
                  Henüz danışan kaydı yok
                </Text>
              </View>
            }
          />

          {/* Yeni Danışan Ekle Butonu */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalAddButton, { backgroundColor: colors.primary }]}
              onPress={onAddPatient}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.white} />
              <Text style={[styles.modalAddButtonText, { color: colors.white }]}>Yeni Danışan Ekle</Text>
            </TouchableOpacity>
          </View>
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
  modalListContent: {
    padding: 12,
  },
  modalPatientCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modalPatientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalPatientLeft: {
    marginRight: 12,
  },
  modalAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPatientInfo: {
    flex: 1,
  },
  modalPatientName: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalPatientDetails: {
    fontSize: 13,
    marginBottom: 4,
  },
  modalBmiText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBmiBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  modalBmiBarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  modalAddButton: {
    flex: 1,
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
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
