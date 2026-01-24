# 🧪 Diyetle - Kapsamlı Test Rehberi

## 📱 Test Menüsüne Erişim

### Diyetisyen Kullanıcısı:
1. Ana ekranda **"🧪 Test Menüsü"** kartına tıklayın
2. Tüm özellikler listelenir

### Danışan Kullanıcısı:
1. Ana ekranda aşağı kaydırın
2. **"🧪 Test Menüsü"** (kırmızı) butonuna tıklayın

---

## 🔐 1. Güvenlik & KVKK Testleri

### Test Adımları:
1. **Test Menüsü** → **"🔐 Güvenlik & KVKK"**
2. **KVKK Rızaları** bölümünde switch'leri açıp kapatın
3. **"Verilerimi İndir"** butonunu test edin
4. **"Hesabımı Sil"** butonunu test edin (dikkatli!)
5. **Son Aktiviteler** bölümünde audit logları görün

### Beklenen Sonuçlar:
- ✅ Rıza değişiklikleri kaydedilir
- ✅ Veri indirme talebi oluşturulur
- ✅ Audit loglar görüntülenir
- ✅ Güvenlik işlemleri loglanır

---

## 💬 2. Chat Sistemi Testleri

### Test Adımları:
1. **Test Menüsü** → **"💬 Chat Sistemi"**
2. Otomatik test chat room'u oluşturulur
3. Test mesajı gönderilir
4. Chat ekranı açılır
5. Yeni mesajlar yazın ve gönderin

### Beklenen Sonuçlar:
- ✅ Chat room oluşturulur
- ✅ Mesajlar real-time görünür
- ✅ Zaman damgaları doğru
- ✅ Mesaj baloncukları düzgün

### Ek Testler:
- Uzun mesajlar yazın
- Emoji kullanın
- Video görüşme butonunu test edin

---

## 📹 3. Video Görüşme Testleri

### Test Adımları:
1. **Test Menüsü** → **"📹 Video Görüşme"**
2. Test video call oluşturulur
3. Video call ekranı açılır
4. Kontrolleri test edin:
   - 🎤 Mikrofon açma/kapama
   - 📹 Kamera açma/kapama
   - 🔊 Hoparlör kontrolü
   - 🖥️ Ekran paylaşımı
   - 🔴 Kayıt başlatma

### Beklenen Sonuçlar:
- ✅ Video ekranı açılır
- ✅ Kontroller çalışır
- ✅ Süre sayacı çalışır
- ✅ Bağlantı kalitesi gösterilir
- ✅ Güvenli sonlandırma

### Ek Testler:
- Kontrolleri gizleme/gösterme
- Ekran paylaşımı testi
- Kayıt göstergesi

---

## 📅 4. Randevu Takvimi Testleri

### Diyetisyen Testleri:
1. **Test Menüsü** → **"📅 Randevu Takvimi"**
2. **"+"** butonuna tıklayın
3. Yeni müsaitlik slotu oluşturun:
   - Tarih seçin
   - Saat aralığı girin (örn: 14:00-14:30)
   - Fiyat belirleyin
   - Notlar ekleyin
4. **"Oluştur"** butonuna tıklayın

### Danışan Testleri:
1. **Test Menüsü** → **"📅 Randevu Takvimi"**
2. Takvimde müsait tarihi seçin
3. Müsait saati seçin
4. Rezervasyon formunu doldurun
5. **"Rezerve Et"** butonuna tıklayın

### Beklenen Sonuçlar:
- ✅ Takvim görünümü çalışır
- ✅ Slotlar oluşturulur/görüntülenir
- ✅ Rezervasyon yapılır
- ✅ Otomatik video link oluşur
- ✅ Durum rozetleri görünür

---

## 🔔 5. Akıllı Bildirimler Testleri

### Test Adımları:
1. **Test Menüsü** → **"🔔 Akıllı Bildirimler"**
2. Test bildirimleri otomatik gönderilir
3. Birkaç saniye bekleyin
4. Bildirimler gelir:
   - Acil durum bildirimi (anında)
   - Test öğün hatırlatması (10 saniye sonra)

### Beklenen Sonuçlar:
- ✅ Anında bildirim gelir
- ✅ Zamanlanmış bildirim gelir
- ✅ Bildirim içerikleri doğru
- ✅ Öncelik seviyeleri çalışır

### Ek Testler:
- Bildirim ayarlarını kontrol edin
- Farklı bildirim türlerini test edin

---

## 🏆 6. Başarı Rozetleri Testleri

### Test Adımları:
1. **Test Menüsü** → **"🏆 Başarı Rozetleri"**
2. Rozet kontrol sistemi çalışır
3. Test aktiviteleri simüle edilir
4. Yeni rozetler kontrol edilir

### Beklenen Sonuçlar:
- ✅ Rozet sistemi çalışır
- ✅ Aktivite kontrolleri yapılır
- ✅ Yeni rozetler tespit edilir
- ✅ Bildirimler gönderilir

### Test Senaryoları:
- 7 gün düzenli takip → İlk Hafta rozeti
- Su içme hedefi → Su Ustası rozeti
- Egzersiz sayısı → Egzersiz Tutkunu rozeti

---

## ⌚ 7. Wearable Entegrasyon Testleri

### Test Adımları:
1. **Test Menüsü** → **"⌚ Wearable Entegrasyon"**
2. Sağlık verisi senkronizasyonu başlar
3. Mock veriler oluşturulur
4. Senkronizasyon sonuçları gösterilir

### Beklenen Sonuçlar:
- ✅ Senkronizasyon çalışır
- ✅ Sağlık verileri işlenir
- ✅ Platform tespiti yapılır
- ✅ Veri sayısı raporlanır

### Test Verileri:
- Adım sayısı: 8500-9200
- Kalp atışı: 72 bpm
- Kalori: 2100-2250 kcal

---

## 🚀 8. Tüm Sistemleri Test Et

### Test Adımları:
1. **Test Menüsü** → **"🚀 Tümünü Test Et"**
2. Tüm sistemler sırayla test edilir:
   - Akıllı bildirimler
   - Başarı rozetleri
   - Wearable entegrasyon
3. Her test arasında 1 saniye beklenir
4. Sonuçlar test loglarında görünür

### Beklenen Sonuçlar:
- ✅ Tüm testler sırayla çalışır
- ✅ Hata durumları yakalanır
- ✅ Test sonuçları loglanır
- ✅ Başarı mesajı gösterilir

---

## 📊 Test Sonuçları Takibi

### Test Logları:
- Her test sonucu zaman damgası ile kaydedilir
- Son 10 test sonucu görüntülenir
- Başarılı testler ✅ ile işaretlenir
- Hatalar ❌ ile işaretlenir

### Log Temizleme:
- Sağ üst köşedeki **🔄** butonuna tıklayın
- Tüm test logları temizlenir

---

## 🎯 Test Senaryoları

### Senaryo 1: Tam Randevu Süreci
1. Diyetisyen müsaitlik oluşturur
2. Danışan randevu rezerve eder
3. Diyetisyen randevuyu onaylar
4. Randevu zamanında video call başlar
5. Görüşme tamamlanır ve kaydedilir

### Senaryo 2: Acil Durum İletişimi
1. Danışan acil soru sorar
2. Chat sistemi ile mesajlaşır
3. Diyetisyen acil randevu oluşturur
4. Anında video görüşme yapılır

### Senaryo 3: İlerleme Takibi
1. Wearable veriler senkronize edilir
2. Başarı rozetleri kontrol edilir
3. Akıllı hatırlatıcılar gönderilir
4. İlerleme raporları oluşturulur

---

## 🔧 Sorun Giderme

### Yaygın Sorunlar:

**Bildirimler Gelmiyor:**
- Expo Go'da push notification sınırlı
- Development build kullanın

**Video Call Açılmıyor:**
- WebRTC izinleri kontrol edin
- Kamera/mikrofon erişimi verin

**Chat Mesajları Görünmüyor:**
- İnternet bağlantısını kontrol edin
- Firebase bağlantısını kontrol edin

**Test Sonuçları Görünmüyor:**
- Test logları bölümünü kontrol edin
- Sayfayı yenileyin

---

## 🎉 Test Tamamlama Kriterleri

### Başarılı Test:
- ✅ Tüm 8 test kategorisi çalışır
- ✅ Hata mesajı alınmaz
- ✅ UI responsive çalışır
- ✅ Veriler doğru kaydedilir
- ✅ Bildirimler gelir
- ✅ Navigasyon sorunsuz

### Test Raporu:
Her test sonrası aşağıdaki bilgileri kaydedin:
- Test tarihi ve saati
- Kullanıcı rolü (diyetisyen/danışan)
- Test edilen özellik
- Sonuç (başarılı/başarısız)
- Varsa hata mesajları

**Tüm testleri tamamladığınızda Diyetle uygulaması production'a hazır! 🚀**