# Firebase Setup ve Index Deployment Rehberi
*Tarih: 18 Ocak 2026*

## 🔧 FIREBASE CLI KURULUMU

### 1. Firebase CLI Kurulumu
```bash
npm install -g firebase-tools
```

### 2. Firebase'e Giriş Yapın
```bash
firebase login
```
Bu komut browser açacak, Google hesabınızla giriş yapın.

### 3. Proje Bağlantısını Doğrulayın
```bash
firebase projects:list
```
`diyetle-43a12` projesinin listede olduğunu kontrol edin.

## 📁 OLUŞTURULAN DOSYALAR

Aşağıdaki Firebase konfigürasyon dosyaları oluşturuldu:

### ✅ `firebase.json`
- Firestore rules ve indexes konfigürasyonu
- Hosting ayarları
- Storage rules konfigürasyonu

### ✅ `.firebaserc`
- Proje ID: `diyetle-43a12`
- Default proje ayarı

### ✅ `firestore.rules`
- Firestore güvenlik kuralları
- Tüm collection'lar için auth kontrolü
- KVKK compliance kuralları

### ✅ `firestore.indexes.json`
- Tüm gerekli composite indexler
- Chat, video call, appointment, audit logs indexleri

### ✅ `storage.rules`
- Firebase Storage güvenlik kuralları
- Profil fotoğrafları, meal photos, documents

## 🚀 INDEX DEPLOYMENT

### Şimdi Indexleri Deploy Edin:
```bash
cd C:\Users\Emre\Desktop\Diyetle\Diyetle-master
firebase deploy --only firestore:indexes
```

### Beklenen Çıktı:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/diyetle-43a12/overview
```

### Index Durumunu Kontrol Edin:
```bash
firebase firestore:indexes
```

## ⏱️ INDEX OLUŞTURMA SÜRECİ

1. **Deploy Komutu Çalıştırıldıktan Sonra:**
   - Firebase Console'da indexler "Building" durumuna geçer
   - 5-15 dakika sürebilir
   - Bu süre boyunca fallback queries çalışır

2. **Index Hazır Olduğunda:**
   - Console'da "Enabled" durumuna geçer
   - Ana queries devreye girer
   - Performans artar, hatalar gider

## 🧪 TEST SONRASI

Index deployment tamamlandıktan sonra:

### 1. Uygulamayı Test Edin:
- **Test Menüsü → Güvenlik & KVKK** ✅
- **Test Menüsü → Chat Sistemi** ✅
- **Test Menüsü → Randevu Takvimi** ✅
- **Test Menüsü → Akıllı Bildirimler** ✅

### 2. Console Loglarını Kontrol Edin:
- Firebase query hataları azalmalı
- "Index requires" hataları gitmeli
- Fallback query logları azalmalı

## 🔍 SORUN GİDERME

### Eğer Hala Hata Alıyorsanız:

1. **Firebase Console'u Kontrol Edin:**
   ```
   https://console.firebase.google.com/project/diyetle-43a12/firestore/indexes
   ```

2. **Index Durumunu Kontrol Edin:**
   - "Building" → Bekleyin
   - "Enabled" → Hazır
   - "Error" → Tekrar deploy edin

3. **Fallback Queries:**
   - Index hazır olana kadar fallback queries çalışır
   - Bu normal bir durumdur
   - Performans biraz düşük olabilir

## 📊 DEPLOY EDİLECEK INDEXLER

Toplam **16 index** deploy edilecek:
- ✅ progress (1 index)
- ✅ questions (1 index)  
- ✅ patients (1 index)
- ✅ dietPlans (1 index)
- ✅ chat_messages (2 index)
- ✅ chat_rooms (2 index)
- ✅ video_calls (2 index)
- ✅ video_appointments (2 index)
- ✅ appointment_slots (1 index)
- ✅ call_sessions (1 index)
- ✅ audit_logs (2 index) **← YENİ**

---

**Sonraki Adım**: Yukarıdaki komutları sırasıyla çalıştırın!