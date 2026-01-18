// src/screens/SecuritySettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../services/authService';
import { getKVKKConsent, saveKVKKConsent, requestDataPortability, requestDataErasure } from '../services/kvkkService';
import { getAuditLogs } from '../services/auditService';

export default function SecuritySettingsScreen({ navigation }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [kvkkConsent, setKvkkConsent] = useState({
    dataProcessing: false,
    marketing: false,
    thirdParty: false,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // KVKK rızalarını yükle
        const consent = await getKVKKConsent(user.uid);
        if (consent) {
          setKvkkConsent({
            dataProcessing: consent.dataProcessingConsent,
            marketing: consent.marketingConsent,
            thirdParty: consent.thirdPartyConsent,
          });
        }

        // Son audit logları yükle
        const logs = await getAuditLogs(user.uid);
        setAuditLogs(logs.slice(0, 10)); // Son 10 log
      }
    } catch (error) {
      console.error('Kullanıcı verileri yükleme hatası:', error);
    }
  };

  const handleConsentChange = async (type: string, value: boolean) => {
    try {
      const newConsent = { ...kvkkConsent, [type]: value };
      setKvkkConsent(newConsent);

      if (currentUser) {
        await saveKVKKConsent({
          userId: currentUser.uid,
          dataProcessingConsent: newConsent.dataProcessing,
          marketingConsent: newConsent.marketing,
          thirdPartyConsent: newConsent.thirdParty,
          consentDate: new Date() as any,
          consentVersion: '1.0',
        });
      }

      Alert.alert('Başarılı', 'KVKK rızanız güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Rıza güncellenirken bir hata oluştu.');
    }
  };

  const handleDataPortability = () => {
    Alert.alert(
      'Veri Taşınabilirlik',
      'Verilerinizi indirmek istediğinizden emin misiniz? Bu işlem birkaç dakika sürebilir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İndir',
          onPress: async () => {
            try {
              if (currentUser) {
                await requestDataPortability(currentUser.uid);
                Alert.alert('Başarılı', 'Veri indirme talebiniz alındı. E-posta adresinize indirme bağlantısı gönderilecek.');
              }
            } catch (error) {
              Alert.alert('Hata', 'Veri indirme talebi oluşturulurken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleDataErasure = () => {
    Alert.alert(
      'Hesap Silme',
      'Hesabınızı ve tüm verilerinizi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (currentUser) {
                await requestDataErasure(currentUser.uid, 'Kullanıcı talebi');
                Alert.alert('Başarılı', 'Hesap silme talebiniz alındı. 30 gün içinde hesabınız silinecek.');
              }
            } catch (error) {
              Alert.alert('Hata', 'Hesap silme talebi oluşturulurken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Güvenlik & Gizlilik</Text>
      </View>

      {/* KVKK Rızaları */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 KVKK Rızaları</Text>
        
        <View style={styles.consentItem}>
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>Veri İşleme Rızası</Text>
            <Text style={styles.consentDescription}>
              Kişisel verilerinizin işlenmesine izin veriyorsunuz
            </Text>
          </View>
          <Switch
            value={kvkkConsent.dataProcessing}
            onValueChange={(value) => handleConsentChange('dataProcessing', value)}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
          />
        </View>

        <View style={styles.consentItem}>
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>Pazarlama Rızası</Text>
            <Text style={styles.consentDescription}>
              Pazarlama amaçlı iletişim kurulmasına izin veriyorsunuz
            </Text>
          </View>
          <Switch
            value={kvkkConsent.marketing}
            onValueChange={(value) => handleConsentChange('marketing', value)}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
          />
        </View>

        <View style={styles.consentItem}>
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>Üçüncü Taraf Paylaşım</Text>
            <Text style={styles.consentDescription}>
              Verilerinizin üçüncü taraflarla paylaşılmasına izin veriyorsunuz
            </Text>
          </View>
          <Switch
            value={kvkkConsent.thirdParty}
            onValueChange={(value) => handleConsentChange('thirdParty', value)}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
          />
        </View>
      </View>

      {/* Veri Hakları */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Veri Haklarım</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleDataPortability}>
          <Ionicons name="download-outline" size={24} color={colors.primary} />
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Verilerimi İndir</Text>
            <Text style={styles.actionDescription}>Tüm verilerinizi JSON formatında indirin</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDataErasure}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: colors.error }]}>Hesabımı Sil</Text>
            <Text style={styles.actionDescription}>Hesabınızı ve tüm verilerinizi kalıcı olarak silin</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Güvenlik Logları */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Son Aktiviteler</Text>
        {auditLogs.map((log, index) => (
          <View key={index} style={styles.logItem}>
            <Text style={styles.logAction}>{log.action}</Text>
            <Text style={styles.logTime}>
              {log.timestamp?.toDate?.()?.toLocaleString('tr-TR') || 'Bilinmiyor'}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
    marginLeft: 16,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 16,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  consentText: {
    flex: 1,
    marginRight: 16,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
  },
  consentDescription: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  actionText: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
  },
  actionDescription: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  logAction: {
    fontSize: 14,
    color: colors.darkGray,
  },
  logTime: {
    fontSize: 12,
    color: colors.gray,
  },
});