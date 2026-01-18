// src/screens/WelcomeScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { autoLogin } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Hoş Geldiniz Diyetle\'ye',
    description: 'Sağlıklı yaşam yolculuğunuza başlamak için doğru yer. Kişiselleştirilmiş diyet planları ve uzman diyetisyen desteği ile hedeflerinize ulaşın.',
    icon: 'leaf',
    color: '#10B981',
  },
  {
    id: '2',
    title: 'Kişisel Diet Planı',
    description: 'Sizin için özel olarak hazırlanmış diet planları. Sağlık durumunuz, hedefleriniz ve tercihleriniz dikkate alınarak oluşturulan planlar.',
    icon: 'document-text',
    color: '#3B82F6',
  },
  {
    id: '3',
    title: 'Diyetisyen Desteği',
    description: 'Uzman diyetisyenlerimiz ile doğrudan iletişim. Sorularınızı sorun, tavsiye alın ve ilerleyişinizi takip edin.',
    icon: 'chatbubbles',
    color: '#F59E0B',
  },
  {
    id: '4',
    title: 'Yemek Takibi',
    description: 'Her öğünü fotoğrafla takip edin. AI destekli beslenme analizi ile kalori ve makronutrient tüketiminizi izleyin.',
    icon: 'camera',
    color: '#EC4899',
  },
  {
    id: '5',
    title: 'İlerlemenizi İzleyin',
    description: 'Detaylı istatistikler ve grafikler ile ilerlemişinizi görün. Kilo, ölçümler ve beslenme hedeflerinizi takip edin.',
    icon: 'stats-chart',
    color: '#8B5CF6',
  },
];

export default function WelcomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkAutoLogin = async () => {
      try {
        console.log('🔍 Kaydedilmiş giriş kontrol ediliyor...');
        
        // Onboarding'in gösterilip gösterilmediğini kontrol et
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        
        if (onboardingCompleted === 'true') {
          // Onboarding yapılmış, otomatik login kontrol et
          const user = await autoLogin();

          if (user) {
            console.log('✅ Otomatik giriş yapıldı:', user.displayName);
            if (user.role === 'dietitian') {
              navigation.replace('DietitianHome');
            } else {
              navigation.replace('PatientHome');
            }
          } else {
            console.log('ℹ️ Kaydedilmiş giriş bulunamadı');
            setShowOnboarding(false);
            setLoading(false);
          }
        } else {
          // Onboarding göster
          console.log('ℹ️ Onboarding gösteriliyor');
          setShowOnboarding(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Kontrol hatası:', error);
        setShowOnboarding(true);
        setLoading(false);
      }
    };

    checkAutoLogin();
  }, [navigation]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);
  };

  const handleContinue = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Onboarding tamamlandı
      try {
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        setShowOnboarding(false);
      } catch (error) {
        console.error('Error saving onboarding:', error);
      }
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const goToPreviousSlide = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  };

  // Loading ekranı
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.logo}>🥗</Text>
        <ActivityIndicator size="large" color={colors.white} />
        <Text style={styles.loadingText}>Kontrol ediliyor...</Text>
      </View>
    );
  }

  // Onboarding Carousel
  if (showOnboarding) {
    return (
      <View style={styles.onboardingContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>🥗</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipButton}>Atla</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={({ item }) => (
            <View
              style={[
                styles.slide,
                { backgroundColor: item.color + '15' },
              ]}
            >
              <View style={styles.iconContainer}>
                <View
                  style={[
                    styles.iconBackground,
                    { backgroundColor: item.color + '30' },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={80}
                    color={item.color}
                  />
                </View>
              </View>

              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDescription}>{item.description}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
        />

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: `${((currentIndex + 1) / slides.length) * 100}%`,
                  backgroundColor: slides[currentIndex].color,
                },
              ]}
            />
          </View>
        </View>

        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex
                      ? slides[currentIndex].color
                      : colors.border,
                  width: index === currentIndex ? 30 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Navigation */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={goToPreviousSlide}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={
                currentIndex === 0 ? colors.textLight : slides[currentIndex].color
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinue}
            style={[
              styles.continueButton,
              { backgroundColor: slides[currentIndex].color },
            ]}
          >
            <Text style={styles.continueButtonText}>
              {currentIndex === slides.length - 1 ? 'Başla' : 'İleri'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={currentIndex === slides.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={28}
              color={
                currentIndex === slides.length - 1
                  ? colors.textLight
                  : slides[currentIndex].color
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.pageCounter}>
          <Text style={styles.pageCounterText}>
            {currentIndex + 1}/{slides.length}
          </Text>
        </View>
      </View>
    );
  }

  // Login/Register seçim ekranı
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🥗</Text>
        <Text style={styles.title}>Diyetle</Text>
        <Text style={styles.subtitle}>Sağlıklı Yaşam Asistanınız</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.secondaryButtonText}>Kayıt Ol</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  onboardingContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  logo: {
    fontSize: 40,
  },
  skipButton: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '600',
  },
  slide: {
    width: screenWidth,
    paddingHorizontal: 20,
    paddingBottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  slideDescription: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  progressBackground: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pageCounter: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  pageCounterText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: colors.white,
    marginBottom: 60,
    opacity: 0.9,
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 15,
  },
  primaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.white,
    width: '80%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});