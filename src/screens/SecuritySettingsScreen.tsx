// src/screens/SecuritySettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getCurrentUser } from '../services/authService';
import { getKVKKConsent, requestDataPortability, requestDataErasure } from '../services/kvkkService';
import { getAuditLogs } from '../services/auditService';

// KVKK Rıza Metinleri
const CONSENT_TEXTS = {
  dataProcessing: {
    title: 'Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni',
    content: `DİYETLE UYGULAMASI KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ

1. Veri Sorumlusu
Diyetle uygulaması olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.

2. İşlenen Kişisel Veriler
Uygulamamız kapsamında aşağıdaki kişisel verileriniz işlenmektedir:
• Kimlik Bilgileri: Ad, soyad, doğum tarihi, cinsiyet
• İletişim Bilgileri: E-posta adresi, telefon numarası
• Sağlık Verileri: Boy, kilo, vücut kitle indeksi, sağlık geçmişi, alerji bilgileri, kronik hastalıklar
• Beslenme Verileri: Günlük öğün bilgileri, besin tüketimi, su tüketimi
• Fiziksel Aktivite Verileri: Egzersiz bilgileri, adım sayısı

3. Kişisel Verilerin İşlenme Amaçları
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
• Size özel diyet programlarının oluşturulması ve takibi
• Diyetisyen-danışan iletişiminin sağlanması
• Sağlık durumunuzun izlenmesi ve raporlanması
• İlerleme analizlerinin yapılması
• Yasal yükümlülüklerin yerine getirilmesi

4. Kişisel Verilerin Aktarımı
Kişisel verileriniz, yalnızca seçtiğiniz diyetisyen ile paylaşılmakta olup, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmamaktadır.

5. Kişisel Verilerin Saklanma Süresi
Kişisel verileriniz, hesabınız aktif olduğu sürece ve hesap silme talebinizden itibaren 30 gün süreyle saklanmaktadır.

6. Veri Güvenliği
Verileriniz, endüstri standardı şifreleme yöntemleri ile korunmakta ve güvenli sunucularda saklanmaktadır.

Bu aydınlatma metnini okudum ve kişisel verilerimin yukarıda belirtilen amaçlarla işlenmesini kabul ediyorum.`,
  },
  marketing: {
    title: 'Pazarlama İletişimi Rıza Metni',
    content: `PAZARLAMA İLETİŞİMİ RIZA METNİ

Diyetle uygulaması olarak, sizinle pazarlama amaçlı iletişim kurmak için aşağıdaki konularda onayınızı talep etmekteyiz:

1. İletişim Kanalları
Onay vermeniz halinde aşağıdaki kanallar üzerinden sizinle iletişime geçebiliriz:
• E-posta bildirimleri
• Uygulama içi bildirimler (push notification)
• SMS mesajları

2. İletişim İçerikleri
Size göndereceğimiz iletişimler aşağıdaki konuları içerebilir:
• Yeni özellikler ve güncellemeler hakkında bilgilendirme
• Beslenme ve sağlıklı yaşam ile ilgili ipuçları
• Motivasyon mesajları ve hatırlatıcılar
• Özel kampanya ve indirimler
• Anket ve geri bildirim talepleri

3. Kişiselleştirilmiş İçerik
Kullanım alışkanlıklarınız ve tercihlerinize göre size özel içerikler sunulabilir.

4. İptal Hakkı
Pazarlama iletişimi onayınızı istediğiniz zaman geri çekebilirsiniz. Bunun için uygulama ayarlarından bildirim tercihlerinizi güncelleyebilir veya destek ekibimizle iletişime geçebilirsiniz.

5. Yasal Dayanak
Bu rıza, 6698 sayılı KVKK'nın 5. maddesi ve 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında alınmaktadır.

Bu metni okudum ve pazarlama amaçlı iletişim kurulmasını kabul ediyorum.`,
  },
  thirdParty: {
    title: 'Üçüncü Taraf Veri Paylaşımı Rıza Metni',
    content: `ÜÇÜNCÜ TARAF VERİ PAYLAŞIMI RIZA METNİ

Diyetle uygulaması olarak, verilerinizin üçüncü taraflarla paylaşılması konusunda aşağıdaki bilgilendirmeyi yapmaktayız:

1. Paylaşım Amaçları
Verileriniz, onay vermeniz halinde aşağıdaki amaçlarla üçüncü taraflarla paylaşılabilir:
• Anonim istatistiksel analizler ve araştırmalar
• Hizmet kalitesinin artırılması için veri analizi
• Akademik beslenme araştırmalarına katkı

2. Anonimleştirme
Üçüncü taraflarla paylaşılan veriler tamamen anonimleştirilmektedir. Bu verilerden kimliğinizin tespit edilmesi mümkün değildir.

3. Paylaşılabilecek Veri Türleri
Anonimleştirilerek paylaşılabilecek veriler:
• Yaş aralığı ve cinsiyet bilgisi
• Genel beslenme alışkanlıkları
• Diyet programı başarı oranları
• Genel sağlık göstergeleri (anonim)

4. Paylaşılmayacak Veriler
Aşağıdaki veriler hiçbir koşulda üçüncü taraflarla paylaşılmaz:
• Ad, soyad, e-posta gibi kimlik bilgileri
• Telefon numarası
• Detaylı sağlık geçmişi
• Diyetisyen ile yapılan özel yazışmalar

5. Üçüncü Taraf Kategorileri
Verilerinizin paylaşılabileceği üçüncü taraf kategorileri:
• Üniversiteler ve araştırma kurumları
• Sağlık sektörü veri analiz şirketleri
• Anonim istatistik yayıncıları

6. İptal Hakkı
Bu onayı istediğiniz zaman geri çekebilirsiniz. Onayınızı geri çekmeniz halinde, daha önce paylaşılmış anonim veriler geri alınamaz ancak yeni veri paylaşımı durdurulur.

Bu metni okudum ve verilerimin anonimleştirilerek istatistiksel amaçlarla kullanılmasını kabul ediyorum.`,
  },
};

export default function SecuritySettingsScreen({ navigation }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  // KVKK rıza durumu artık sadece onay tarihi için kullanılıyor
  // Tüm rızalar zorunlu olduğundan durumları gösterilmiyor
  const [consentDate, setConsentDate] = useState<Date | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<keyof typeof CONSENT_TEXTS | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user?.id) {
        // KVKK onay tarihini yükle
        const consent = await getKVKKConsent(user.id);
        if (consent?.consentDate) {
          setConsentDate(consent.consentDate.toDate());
        }

        // Son audit logları yükle
        const logs = await getAuditLogs(user.id);
        setAuditLogs(logs.slice(0, 10)); // Son 10 log
      }
    } catch (error) {
      console.error('❌ Kullanıcı verileri yükleme hatası:', error);
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
              if (currentUser?.id) {
                await requestDataPortability(currentUser.id);
                Alert.alert('Başarılı', 'Veri indirme talebiniz alındı. E-posta adresinize indirme bağlantısı gönderilecek.');
              }
            } catch (error) {
              console.error('❌ Veri taşınabilirlik hatası:', error);
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
              if (currentUser?.id) {
                await requestDataErasure(currentUser.id, 'Kullanıcı talebi');
                Alert.alert('Başarılı', 'Hesap silme talebiniz alındı. 30 gün içinde hesabınız silinecek.');
              }
            } catch (error) {
              console.error('❌ Hesap silme hatası:', error);
              Alert.alert('Hata', 'Hesap silme talebi oluşturulurken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const openConsentModal = (consentType: keyof typeof CONSENT_TEXTS) => {
    setSelectedConsent(consentType);
    setModalVisible(true);
  };

  // Tüm rızalar zorunlu - herkes onaylamış olarak gösterilir
  const getConsentStatus = () => {
    return (
      <View style={styles.statusBadgeAccepted}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.statusTextAccepted}>Onaylandı</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Güvenlik & Gizlilik</Text>
        </View>

        {/* KVKK Rızaları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 KVKK Rızalarım</Text>

          {consentDate && (
            <View style={styles.consentDateBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.consentDateText}>
                Onay tarihi: {consentDate.toLocaleDateString('tr-TR')}
              </Text>
            </View>
          )}

          <Text style={styles.readOnlyNote}>
            Aşağıdaki rıza metinlerini görüntülemek için kartlara dokunun.
          </Text>

          {/* Veri İşleme Rızası */}
          <TouchableOpacity
            style={styles.consentCard}
            onPress={() => openConsentModal('dataProcessing')}
            activeOpacity={0.7}
          >
            <View style={styles.consentCardHeader}>
              <View style={styles.consentIconContainer}>
                <Ionicons name="document-text" size={24} color={colors.primary} />
              </View>
              <View style={styles.consentCardContent}>
                <Text style={styles.consentCardTitle}>Kişisel Verilerin İşlenmesi</Text>
                <Text style={styles.consentCardSubtitle}>Zorunlu rıza metni</Text>
              </View>
              {getConsentStatus()}
            </View>
            <View style={styles.consentCardFooter}>
              <Text style={styles.tapToReadText}>Metni okumak için dokunun</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Pazarlama Rızası */}
          <TouchableOpacity
            style={styles.consentCard}
            onPress={() => openConsentModal('marketing')}
            activeOpacity={0.7}
          >
            <View style={styles.consentCardHeader}>
              <View style={styles.consentIconContainer}>
                <Ionicons name="megaphone" size={24} color={colors.warning} />
              </View>
              <View style={styles.consentCardContent}>
                <Text style={styles.consentCardTitle}>Pazarlama İletişimi</Text>
                <Text style={styles.consentCardSubtitle}>İsteğe bağlı rıza metni</Text>
              </View>
              {getConsentStatus()}
            </View>
            <View style={styles.consentCardFooter}>
              <Text style={styles.tapToReadText}>Metni okumak için dokunun</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Üçüncü Taraf Paylaşım */}
          <TouchableOpacity
            style={styles.consentCard}
            onPress={() => openConsentModal('thirdParty')}
            activeOpacity={0.7}
          >
            <View style={styles.consentCardHeader}>
              <View style={styles.consentIconContainer}>
                <Ionicons name="share-social" size={24} color={colors.info} />
              </View>
              <View style={styles.consentCardContent}>
                <Text style={styles.consentCardTitle}>Üçüncü Taraf Paylaşımı</Text>
                <Text style={styles.consentCardSubtitle}>İsteğe bağlı rıza metni</Text>
              </View>
              {getConsentStatus()}
            </View>
            <View style={styles.consentCardFooter}>
              <Text style={styles.tapToReadText}>Metni okumak için dokunun</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
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
          {auditLogs.length > 0 ? (
            auditLogs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logTime}>
                  {log.timestamp?.toDate?.()?.toLocaleString('tr-TR') || 'Bilinmiyor'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noLogsText}>Henüz aktivite kaydı bulunmuyor</Text>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Rıza Metni Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedConsent ? CONSENT_TEXTS[selectedConsent].title : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>
                {selectedConsent ? CONSENT_TEXTS[selectedConsent].content : ''}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
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
  consentDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  consentDateText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500',
  },
  readOnlyNote: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: 16,
  },
  consentCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  consentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  consentCardContent: {
    flex: 1,
  },
  consentCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 2,
  },
  consentCardSubtitle: {
    fontSize: 13,
    color: colors.gray,
  },
  statusBadgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusTextAccepted: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusTextRejected: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusTextPending: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  statusBadgeOptional: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusTextOptional: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
  consentCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  tapToReadText: {
    fontSize: 13,
    color: colors.textLight,
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
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: colors.gray,
  },
  noLogsText: {
    fontSize: 14,
    color: colors.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    flex: 1,
    marginRight: 16,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalText: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 22,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
