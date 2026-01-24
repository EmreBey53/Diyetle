# 📹 Diyetle - Telemedicine & Video Özellikleri

## 🎯 Eklenen Özellikler

### 1. **📹 Video Görüşme Sistemi**
**Dosya:** `src/services/videoCallService.ts`

#### Özellikler:
- ✅ **Video Görüşme Oluşturma** - Otomatik room ID ve access token
- ✅ **Görüşme Başlatma/Sonlandırma** - Zaman kontrolü ile güvenli başlatma
- ✅ **Ekran Paylaşımı** - Diyet planlarını canlı gösterme
- ✅ **Görüşme Kayıtları** - Otomatik kayıt ve transkripsiyon
- ✅ **Bağlantı Kalitesi Takibi** - Real-time kalite monitörü
- ✅ **Session Yönetimi** - Katılımcı takibi ve istatistikler

#### Fonksiyonlar:
```typescript
- createVideoCall() - Yeni görüşme oluştur
- startVideoCall() - Görüşme başlat
- endVideoCall() - Görüşme sonlandır
- startScreenShare() - Ekran paylaşımı
- getCallHistory() - Görüşme geçmişi
```

---

### 2. **📅 Randevu Takvimi Sistemi**
**Dosya:** `src/services/appointmentCalendarService.ts`

#### Özellikler:
- ✅ **Müsaitlik Slotları** - Diyetisyen müsaitlik oluşturma
- ✅ **Randevu Rezervasyonu** - Danışan rezervasyon sistemi
- ✅ **Otomatik Video Link** - Randevu onayında otomatik video call
- ✅ **Hatırlatıcı Sistemi** - 24h, 2h, 15dk öncesi hatırlatma
- ✅ **Randevu Onaylama** - Diyetisyen onay sistemi
- ✅ **İptal Yönetimi** - 24 saat kuralı ile iptal
- ✅ **Fiyatlandırma** - Opsiyonel ücretli randevu

#### Fonksiyonlar:
```typescript
- createAvailabilitySlots() - Müsaitlik oluştur
- bookAppointment() - Randevu rezerve et
- confirmAppointment() - Randevu onayla
- cancelAppointment() - Randevu iptal et
- getAvailableSlots() - Müsait saatleri getir
- getAppointmentHistory() - Randevu geçmişi
```

---

### 3. **📱 Video Görüşme Ekranı**
**Dosya:** `src/screens/VideoCallScreen.tsx`

#### UI Özellikleri:
- ✅ **Full Screen Video** - Tam ekran video deneyimi
- ✅ **Picture-in-Picture** - Küçük pencerede kendi görüntü
- ✅ **Kontrol Paneli** - Mikrofon, kamera, hoparlör kontrolleri
- ✅ **Ekran Paylaşımı UI** - Tek dokunuşla ekran paylaşımı
- ✅ **Kayıt Göstergesi** - Görsel kayıt durumu
- ✅ **Bağlantı Kalitesi** - Real-time kalite göstergesi
- ✅ **Süre Sayacı** - Görüşme süresi takibi
- ✅ **Güvenli Sonlandırma** - Onay modalı ile güvenli çıkış

#### Kontroller:
- 🎤 Mikrofon açma/kapama
- 📹 Kamera açma/kapama  
- 🔊 Hoparlör kontrolü
- 🖥️ Ekran paylaşımı
- 🔴 Kayıt başlatma/durdurma
- ❌ Görüşme sonlandırma

---

### 4. **📅 Randevu Takvimi Ekranı**
**Dosya:** `src/screens/AppointmentCalendarScreen.tsx`

#### UI Özellikleri:
- ✅ **Takvim Görünümü** - React Native Calendars entegrasyonu
- ✅ **Müsait Slot Gösterimi** - Tarih seçiminde slotları listele
- ✅ **Randevu Rezervasyon Modalı** - Detaylı rezervasyon formu
- ✅ **Slot Oluşturma** - Diyetisyen için müsaitlik oluşturma
- ✅ **Randevu Listesi** - Geçmiş ve gelecek randevular
- ✅ **Durum Rozetleri** - Görsel durum göstergeleri
- ✅ **Video Katılım Butonu** - Direkt video call başlatma

#### Kullanıcı Rolleri:
**Diyetisyen:**
- Müsaitlik slotları oluşturma
- Randevu onaylama/iptal etme
- Slot düzenleme
- Fiyat belirleme

**Danışan:**
- Müsait saatleri görme
- Randevu rezervasyonu
- Görüşme konusu belirtme
- Video görüşmeye katılma

---

## 🔧 Teknik Detaylar

### Yeni Bağımlılıklar:
```json
{
  "react-native-webrtc": "^124.0.4",
  "react-native-calendars": "^1.1313.0"
}
```

### Firebase Collections:
- `video_calls` - Video görüşme verileri
- `call_sessions` - Görüşme session'ları
- `call_recordings` - Görüşme kayıtları
- `appointment_slots` - Müsaitlik slotları
- `video_appointments` - Randevu verileri
- `appointment_reminders` - Hatırlatıcılar

### Güvenlik Özellikleri:
- ✅ **Audit Logging** - Tüm video aktiviteleri loglanır
- ✅ **Zaman Kontrolü** - Randevu saati kontrolü
- ✅ **Yetki Kontrolü** - Sadece ilgili kişiler katılabilir
- ✅ **Güvenli Token** - WebRTC için güvenli access token
- ✅ **KVKK Uyumlu** - Kayıt ve veri işleme rızası

---

## 🚀 Kullanım Senaryoları

### 1. **Diyetisyen Müsaitlik Oluşturma**
1. Takvim ekranını aç
2. Tarih seç
3. "+" butonuna bas
4. Saat aralığı, fiyat, notlar gir
5. Müsaitlik oluştur

### 2. **Danışan Randevu Rezervasyonu**
1. Takvim ekranını aç
2. Müsait tarih seç
3. Uygun saati seç
4. Görüşme konusu yaz
5. Rezerve et

### 3. **Video Görüşme**
1. Randevu zamanında bildirim al
2. "Katıl" butonuna bas
3. Video görüşme başlat
4. Ekran paylaş (isteğe bağlı)
5. Görüşmeyi sonlandır

### 4. **Görüşme Sonrası**
1. Otomatik kayıt işleme
2. Transkripsiyon oluşturma
3. Özet çıkarma
4. Takip randevusu planlama

---

## 📊 Avantajlar

### Diyetisyen İçin:
- 🏠 **Uzaktan Danışmanlık** - Evden çalışma imkanı
- ⏰ **Esnek Saatler** - Kendi müsaitliğini belirleme
- 💰 **Ek Gelir** - Ücretli online konsültasyon
- 📊 **Detaylı Raporlar** - Görüşme istatistikleri
- 🔄 **Otomatik Süreçler** - Randevu yönetimi otomasyonu

### Danışan İçin:
- 🚗 **Ulaşım Tasarrufu** - Evden katılım
- ⏰ **Zaman Tasarrufu** - Hızlı erişim
- 📱 **Kolay Kullanım** - Tek dokunuşla katılım
- 🔔 **Hatırlatıcılar** - Randevu unutma riski yok
- 💬 **Kayıt Erişimi** - Görüşme kayıtlarına erişim

---

## 🎯 Sonuç

**Diyetle uygulaması artık tam teşekküllü bir telemedicine platformu!**

- ✅ **Video Görüşme** - WebRTC tabanlı kaliteli görüşme
- ✅ **Randevu Sistemi** - Otomatik takvim yönetimi  
- ✅ **Ekran Paylaşımı** - Diyet planlarını canlı gösterme
- ✅ **Kayıt Sistemi** - Otomatik kayıt ve transkripsiyon
- ✅ **Hatırlatıcılar** - Akıllı bildirim sistemi
- ✅ **Güvenlik** - KVKK uyumlu ve güvenli

**Pandemi sonrası dünyada telemedicine çok değerli! 🌟**