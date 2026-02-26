import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { User } from '../models/User';

interface FAQItem {
  question: string;
  answer: string;
  icon: string;
}

const DIETITIAN_FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Danışan nasıl eklerim?',
    answer: 'Ana ekranda "Danışanlar" butonuna veya alt sekmedeki "Danışanlar" sekmesine tıklayarak açılan modal\'dan "Yeni Danışan Ekle" butonunu kullanabilirsiniz. Danışan bilgilerini girdikten sonra kaydedin.',
    icon: 'person-add',
  },
  {
    question: 'Diyet planı nasıl oluştururum?',
    answer: 'Danışan detay sayfasından "Diyet Planı Oluştur" butonuna tıklayın. Günlük öğünleri, besin değerlerini ve önerileri ekleyerek planınızı oluşturun.',
    icon: 'restaurant',
  },
  {
    question: 'Danışan mesajlarını nasıl görüntülerim?',
    answer: 'Alt sekmedeki "Mesajlar" butonuna tıklayarak tüm danışan sorularını görebilirsiniz. Cevaplanmamış mesajlar öne çıkarılır.',
    icon: 'chatbubbles',
  },
  {
    question: 'Bildirimler nasıl çalışır?',
    answer: 'Ayarlar > Bildirim Ayarları\'ndan tüm bildirim tercihlerinizi yönetebilirsiniz. Yeni danışan, mesaj, kilo güncellemesi gibi bildirimleri açıp kapatabilirsiniz.',
    icon: 'notifications',
  },
  {
    question: 'Karanlık mod nasıl açılır?',
    answer: 'Ayarlar ekranında "Görünüm" bölümünde bulunan "Karanlık Mod" ayarını kullanarak karanlık modu açıp kapatabilirsiniz.',
    icon: 'moon',
  },
  {
    question: 'Danışan ilerlemesi nasıl takip edilir?',
    answer: 'Danışan detay sayfasından "İlerleme" butonuna tıklayarak danışanınızın kilo değişimlerini, BMI değerlerini ve hedef durumunu görüntüleyebilirsiniz.',
    icon: 'trending-up',
  },
];

const PATIENT_FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Diyet planımı nasıl görüntülerim?',
    answer: 'Alt sekmedeki "Diyet" butonuna tıklayarak diyetisyeninizin size özel hazırladığı diyet planınıza ulaşabilirsiniz. Günlük öğünlerinizi ve beslenme önerilerinizi buradan takip edebilirsiniz.',
    icon: 'restaurant',
  },
  {
    question: 'İlerleme takibimi nasıl yaparım?',
    answer: 'Ayarlar > İlerleme Takibi bölümünden kilo değişimlerinizi, BMI değerlerinizi ve hedefinize olan uzaklığınızı görüntüleyebilirsiniz. Düzenli kilo güncellemeleri yaparak ilerlemenizi takip edebilirsiniz.',
    icon: 'trending-up',
  },
  {
    question: 'Diyetisyenime nasıl mesaj gönderebilirim?',
    answer: 'Alt sekmedeki "Mesajlar" butonuna tıklayarak diyetisyeninize sorularınızı iletebilirsiniz. Diyetisyeniniz cevapladığında bildirim alacaksınız.',
    icon: 'chatbubbles',
  },
  {
    question: 'Öğün fotoğrafı nasıl paylaşırım?',
    answer: 'Ayarlar > Öğün Fotoğrafları bölümünden yediğiniz yemeklerin fotoğraflarını diyetisyeninizle paylaşabilirsiniz. Bu, diyetisyeninizin beslenmenizi daha iyi takip etmesine yardımcı olur.',
    icon: 'camera',
  },
  {
    question: 'Su tüketimimi nasıl takip ederim?',
    answer: 'Ana ekranda bulunan "Su Tüketimi" kartından günlük su içme hedefinizi görebilir ve + / - butonları ile su tüketiminizi güncelleyebilirsiniz.',
    icon: 'water',
  },
  {
    question: 'Hatırlatıcıları nasıl ayarlarım?',
    answer: 'Ayarlar > Hatırlatıcılar bölümünden su içme, öğün zamanları ve egzersiz için hatırlatıcı alarmları kurabilirsiniz. Bildirimleri özelleştirerek diyet programınıza uygun hatırlatıcılar oluşturabilirsiniz.',
    icon: 'alarm',
  },
  {
    question: 'Karanlık mod nasıl açılır?',
    answer: 'Ayarlar ekranında "Görünüm" bölümünde bulunan "Karanlık Mod" ayarını kullanarak karanlık modu açıp kapatabilirsiniz.',
    icon: 'moon',
  },
];

interface ContactOption {
  type: 'email' | 'phone' | 'website' | 'whatsapp';
  label: string;
  value: string;
  icon: string;
}

const CONTACT_OPTIONS: ContactOption[] = [
  {
    type: 'email',
    label: 'E-posta',
    value: 'yuemreyzc@gmail.com',
    icon: 'mail',
  },
  {
    type: 'phone',
    label: 'Telefon',
    value: '+90 505 007 27 41',
    icon: 'call',
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    value: '+90 505 007 27 41',
    icon: 'logo-whatsapp',
  },
  {
    type: 'website',
    label: 'Web Sitesi',
    value: 'https://diyetle.com',
    icon: 'globe',
  },
];

export default function HelpSupportScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [faqItems, setFaqItems] = useState<FAQItem[]>(PATIENT_FAQ_ITEMS);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Kullanıcı tipine göre FAQ'leri ayarla
      if (currentUser?.role === 'dietitian') {
        setFaqItems(DIETITIAN_FAQ_ITEMS);
      } else {
        setFaqItems(PATIENT_FAQ_ITEMS);
      }
    } catch (error) {
      // Hata durumunda varsayılan olarak hasta FAQ'lerini göster
      setFaqItems(PATIENT_FAQ_ITEMS);
    }
  };

  const handleContact = async (option: ContactOption) => {
    let url = '';

    switch (option.type) {
      case 'email':
        url = `mailto:${option.value}`;
        break;
      case 'phone':
        url = `tel:${option.value}`;
        break;
      case 'whatsapp':
        url = `whatsapp://send?phone=${option.value.replace(/\s/g, '')}`;
        break;
      case 'website':
        url = option.value;
        break;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'Bu bağlantı açılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bağlantı açılırken bir hata oluştu');
    }
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Info Banner */}
        <View style={[styles.appInfoBanner, { backgroundColor: colors.primary }]}>
          <Ionicons name="leaf" size={48} color={colors.white} />
          <Text style={[styles.appName, { color: colors.white }]}>Diyetle</Text>
          <Text style={[styles.appVersion, { color: colors.white }]}>Versiyon 1.0.0</Text>
          <Text style={[styles.appDescription, { color: colors.white }]}>
            Profesyonel Diyet Takip Uygulaması
          </Text>
        </View>

        {/* Sık Sorulan Sorular */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sık Sorulan Sorular
            </Text>
          </View>

          <View style={styles.faqContainer}>
            {faqItems.map((item, index) => (
              <View key={index} style={[styles.faqCard, { backgroundColor: colors.cardBackground }]}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFAQ(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeaderLeft}>
                    <View style={[styles.faqIconContainer, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>
                      {item.question}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>

                {expandedFAQ === index && (
                  <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.faqAnswerText, { color: colors.textLight }]}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* İletişim */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>İletişim</Text>
          </View>

          <View style={styles.contactContainer}>
            {CONTACT_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.contactCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleContact(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: colors.primary }]}>
                  <Ionicons name={option.icon as any} size={24} color={colors.white} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactLabel, { color: colors.textLight }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.contactValue, { color: colors.text }]}>
                    {option.value}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Geliştirici Bilgisi */}
        <View style={styles.section}>
          <View style={[styles.developerCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.developerIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="code-slash" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.developerTitle, { color: colors.text }]}>
              Geliştirici
            </Text>
            <Text style={[styles.developerName, { color: colors.primary }]}>
              Yusuf Emre Yazıcı
            </Text>
            <Text style={[styles.developerEmail, { color: colors.textLight }]}>
              yuemreyzc@gmail.com
            </Text>
            <View style={styles.developerDivider} />
            <Text style={[styles.developerNote, { color: colors.textLight }]}>
              Bu uygulama, diyetisyenlerin danışanlarını daha etkili takip edebilmeleri için
              geliştirilmiştir. Geri bildirimleriniz ve önerileriniz için bizimle iletişime geçebilirsiniz.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            © 2025 Diyetle. Tüm hakları saklıdır.
          </Text>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Made with ❤️ in Turkey
          </Text>
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
  scrollView: {
    flex: 1,
  },
  appInfoBanner: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  appVersion: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  appDescription: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  faqContainer: {
    gap: 12,
  },
  faqCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  faqIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactContainer: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  developerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  developerIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  developerTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  developerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  developerEmail: {
    fontSize: 14,
    marginBottom: 16,
  },
  developerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  developerNote: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    marginVertical: 4,
  },
});
