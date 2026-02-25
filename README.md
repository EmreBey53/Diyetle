# Diyetle

Diyetisyen ve hasta arasındaki iletişimi kolaylaştıran, diyet planı yönetimi, randevu takibi ve sağlık verisi izleme özelliklerine sahip mobil uygulama.

## Teknolojiler

- **Framework**: React Native 0.81.5
- **Dil**: TypeScript 5.9.2
- **Backend**: Firebase (Authentication, Firestore)
- **Navigasyon**: React Navigation (Stack, Bottom Tabs)
- **Gerçek Zamanlı İletişim**: WebRTC (görüntülü görüşme), Firebase Chat
- **Güvenlik**: SecureStore, Crypto (SHA-256)
- **Test**: Jest + ts-jest (83 test)

## Kurulum

```bash
npm install
npm start
```

## Platformlar

```bash
npm run android   # Android
npm run ios       # iOS
npm run web       # Web
```

## Testler

```bash
npm test               # Tüm testleri çalıştır
npm run test:coverage  # Coverage raporu
```

## Özellikler

### Hasta
- Diyet planı görüntüleme ve takip
- Öğün fotoğrafı yükleme
- Randevu oluşturma ve takip
- İlerleme (kilo, ölçüm) kaydı
- Diyetisyene soru sorma
- Anket doldurma
- Video görüşme

### Diyetisyen
- Hasta yönetimi
- Diyet planı oluşturma / düzenleme
- Randevu takvimi
- Hasta fotoğraflarını inceleme
- Hasta ilerleme takibi
- Akıllı bildirim sistemi
- PDF rapor oluşturma

## Güvenlik

- Şifreler Firebase Auth ile yönetilir, cihazda saklanmaz
- Oturum verisi SecureStore ile şifreli olarak saklanır
- Token üretiminde kriptografik güvenli rastgele sayı üreteci kullanılır
- Hash işlemleri SHA-256 ile gerçekleştirilir
- KVKK uyumlu: kullanıcı verisi silme talebi `writeBatch` ile atomik olarak işlenir

## Proje Yapısı

```
src/
├── screens/       # Uygulama ekranları
├── services/      # Firebase ve iş mantığı servisleri
├── models/        # TypeScript veri modelleri
├── navigation/    # React Navigation yapılandırması
├── components/    # Yeniden kullanılabilir UI bileşenleri
├── contexts/      # React Context (global state)
├── config/        # Ortam değişkenleri
├── constants/     # Renkler, sabitler
└── utils/         # Yardımcı fonksiyonlar
__tests__/         # Jest test dosyaları
__mocks__/         # Test mock'ları
```
