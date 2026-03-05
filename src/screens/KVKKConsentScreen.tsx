import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { saveKVKKConsent } from '../services/kvkkService';
import { Timestamp } from 'firebase/firestore';

interface KVKKConsentScreenProps {
  navigation: any;
  route: any;
}

export default function KVKKConsentScreen({ navigation, route }: KVKKConsentScreenProps) {
  const { user, selectedDietitianId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState({
    dataProcessing: false,
    marketing: false,
    thirdParty: false,
  });

  const handleConsentChange = (type: string, value: boolean) => {
    setConsents(prev => ({ ...prev, [type]: value }));
  };

  const handleAccept = async () => {
    // Zorunlu rıza kontrolü
    if (!consents.dataProcessing) {
      Alert.alert(
        'Zorunlu Onay',
        'Uygulamayı kullanabilmek için "Kişisel Verilerin İşlenmesi" onayını vermeniz gerekmektedir.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    setLoading(true);
    try {
      await saveKVKKConsent({
        userId: user.id,
        dataProcessingConsent: consents.dataProcessing,
        marketingConsent: consents.marketing,
        thirdPartyConsent: consents.thirdParty,
        consentDate: Timestamp.now(),
        consentVersion: '1.0',
      });

      if (selectedDietitianId) {
        // Diyetisyen zaten seçilmiş → direkt Questionnaire'e git
        navigation.replace('Questionnaire', {
          user: user,
          selectedDietitianId: selectedDietitianId,
        });
      } else {
        // Diyetisyen seçilmemiş → önce diyetisyen seçim ekranı
        navigation.replace('SelectDietitian', {
          user: user,
          nextScreen: 'Questionnaire',
        });
      }
    } catch (error: any) {
      Alert.alert('Hata', 'KVKK onayı kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={60} color={colors.primary} />
          <Text style={styles.headerTitle}>KVKK Aydınlatma Metni</Text>
          <Text style={styles.headerSubtitle}>
            Kişisel verilerinizin korunması bizim için önemlidir
          </Text>
        </View>

        {/* Aydınlatma Metni */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Kişisel Verilerin Korunması Hakkında Bilgilendirme</Text>
          <Text style={styles.infoText}>
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz
            aşağıda açıklanan amaçlar kapsamında işlenebilecektir:
          </Text>
          <Text style={styles.infoText}>
            {'\n'}• Sağlık hizmetlerinin sunulması ve takibi
            {'\n'}• Diyet programlarının oluşturulması ve izlenmesi
            {'\n'}• Diyetisyen-danışan iletişiminin sağlanması
            {'\n'}• Yasal yükümlülüklerin yerine getirilmesi
          </Text>
        </View>

        {/* Rızalar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onay Seçenekleri</Text>

          {/* Zorunlu - Veri İşleme */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentText}>
                <View style={styles.titleRow}>
                  <Text style={styles.consentTitle}>Kişisel Verilerin İşlenmesi</Text>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Zorunlu</Text>
                  </View>
                </View>
                <Text style={styles.consentDescription}>
                  Sağlık verilerinizin (kilo, boy, diyet bilgileri vb.) işlenmesine ve
                  diyetisyeninizle paylaşılmasına onay veriyorum.
                </Text>
              </View>
              <Switch
                value={consents.dataProcessing}
                onValueChange={(value) => handleConsentChange('dataProcessing', value)}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={consents.dataProcessing ? colors.white : colors.gray}
              />
            </View>
          </View>

          {/* İsteğe Bağlı - Pazarlama */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentText}>
                <View style={styles.titleRow}>
                  <Text style={styles.consentTitle}>Pazarlama İletişimi</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalText}>İsteğe Bağlı</Text>
                  </View>
                </View>
                <Text style={styles.consentDescription}>
                  Kampanya, duyuru ve bilgilendirme amaçlı e-posta ve bildirim almak istiyorum.
                </Text>
              </View>
              <Switch
                value={consents.marketing}
                onValueChange={(value) => handleConsentChange('marketing', value)}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={consents.marketing ? colors.white : colors.gray}
              />
            </View>
          </View>

          {/* İsteğe Bağlı - Üçüncü Taraf */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentText}>
                <View style={styles.titleRow}>
                  <Text style={styles.consentTitle}>Üçüncü Taraf Paylaşımı</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalText}>İsteğe Bağlı</Text>
                  </View>
                </View>
                <Text style={styles.consentDescription}>
                  Verilerimin anonim olarak istatistiksel amaçlarla kullanılmasına onay veriyorum.
                </Text>
              </View>
              <Switch
                value={consents.thirdParty}
                onValueChange={(value) => handleConsentChange('thirdParty', value)}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={consents.thirdParty ? colors.white : colors.gray}
              />
            </View>
          </View>
        </View>

        {/* Haklar Bilgisi */}
        <View style={styles.rightsSection}>
          <Text style={styles.rightsTitle}>KVKK Kapsamındaki Haklarınız</Text>
          <Text style={styles.rightsText}>
            • Verilerinizin işlenip işlenmediğini öğrenme{'\n'}
            • Verilerinize erişim ve düzeltme talep etme{'\n'}
            • Verilerinizin silinmesini isteme{'\n'}
            • Verilerinizi taşıma hakkı
          </Text>
          <Text style={styles.rightsNote}>
            Bu haklarınızı uygulama içindeki "Güvenlik & KVKK" bölümünden kullanabilirsiniz.
          </Text>
        </View>

        {/* Onay Butonu */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            !consents.dataProcessing && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={loading || !consents.dataProcessing}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
              <Text style={styles.acceptButtonText}>Onaylıyorum ve Devam Et</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          "Onaylıyorum ve Devam Et" butonuna basarak KVKK aydınlatma metnini okuduğunuzu
          ve seçtiğiniz onayları verdiğinizi kabul etmiş olursunuz.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  infoSection: {
    padding: 20,
    backgroundColor: colors.primary + '10',
    margin: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 22,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  consentItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  consentText: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  requiredBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  optionalBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  consentDescription: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  rightsSection: {
    padding: 20,
    backgroundColor: colors.background,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  rightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  rightsText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 24,
  },
  rightsNote: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.lightGray,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  footerNote: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});
