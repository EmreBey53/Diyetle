// src/services/kvkkService.ts
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, collection, getDocs } from 'firebase/firestore';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService';

export interface KVKKConsent {
  userId: string;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
  thirdPartyConsent: boolean;
  consentDate: Timestamp;
  consentVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataPortabilityRequest {
  userId: string;
  requestDate: Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  completedDate?: Timestamp;
  downloadUrl?: string;
}

// KVKK Rıza Yönetimi
export const saveKVKKConsent = async (consent: KVKKConsent) => {
  try {
    await setDoc(doc(db, 'kvkk_consents', consent.userId), consent);
    
    await logAuditEvent({
      userId: consent.userId,
      userRole: 'patient', // veya dinamik olarak belirlenebilir
      action: AUDIT_ACTIONS.CONSENT_GIVEN,
      resource: 'kvkk_consent',
      resourceId: consent.userId,
      details: {
        dataProcessing: consent.dataProcessingConsent,
        marketing: consent.marketingConsent,
        thirdParty: consent.thirdPartyConsent,
      },
      severity: 'medium',
    });
    
    console.log('✅ KVKK rızası kaydedildi');
  } catch (error) {
    console.error('❌ KVKK rızası kaydetme hatası:', error);
    throw error;
  }
};

export const getKVKKConsent = async (userId: string): Promise<KVKKConsent | null> => {
  try {
    const docRef = doc(db, 'kvkk_consents', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as KVKKConsent;
    }
    return null;
  } catch (error) {
    console.error('❌ KVKK rızası getirme hatası:', error);
    return null;
  }
};

// Veri Taşınabilirlik Hakkı
export const requestDataPortability = async (userId: string) => {
  try {
    const request: DataPortabilityRequest = {
      userId,
      requestDate: Timestamp.now(),
      status: 'pending',
    };
    
    await setDoc(doc(db, 'data_portability_requests', userId), request);
    
    await logAuditEvent({
      userId,
      userRole: 'patient',
      action: AUDIT_ACTIONS.DATA_PORTABILITY,
      resource: 'user_data',
      resourceId: userId,
      severity: 'high',
    });
    
    console.log('✅ Veri taşınabilirlik talebi oluşturuldu');
  } catch (error) {
    console.error('❌ Veri taşınabilirlik talebi hatası:', error);
    throw error;
  }
};

// Unutulma Hakkı (Veri Silme)
export const requestDataErasure = async (userId: string, reason: string) => {
  try {
    await logAuditEvent({
      userId,
      userRole: 'patient',
      action: AUDIT_ACTIONS.DATA_ERASURE,
      resource: 'user_data',
      resourceId: userId,
      details: { reason },
      severity: 'critical',
    });
    
    // Burada gerçek silme işlemi yapılacak
    console.log('✅ Veri silme talebi kaydedildi');
  } catch (error) {
    console.error('❌ Veri silme talebi hatası:', error);
    throw error;
  }
};

// Düzeltme Hakkı
export const requestDataRectification = async (userId: string, corrections: any) => {
  try {
    await logAuditEvent({
      userId,
      userRole: 'patient',
      action: AUDIT_ACTIONS.DATA_RECTIFICATION,
      resource: 'user_data',
      resourceId: userId,
      details: corrections,
      severity: 'medium',
    });

    console.log('✅ Veri düzeltme talebi kaydedildi');
  } catch (error) {
    console.error('❌ Veri düzeltme talebi hatası:', error);
    throw error;
  }
};

// Mevcut tüm kullanıcılar için KVKK onayı oluştur (migration)
export const migrateExistingUsersKVKK = async (): Promise<{ success: number; skipped: number; failed: number }> => {
  const results = { success: 0, skipped: 0, failed: 0 };

  try {
    // Tüm kullanıcıları getir
    const usersSnapshot = await getDocs(collection(db, 'users'));

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        // Zaten KVKK onayı var mı kontrol et
        const existingConsent = await getKVKKConsent(userId);

        if (existingConsent) {
          console.log(`⏭️ Kullanıcı ${userId} zaten KVKK onayı vermiş, atlanıyor...`);
          results.skipped++;
          continue;
        }

        // Yeni KVKK onayı oluştur
        const consent: KVKKConsent = {
          userId,
          dataProcessingConsent: true,
          marketingConsent: true,
          thirdPartyConsent: false,
          consentDate: Timestamp.now(),
          consentVersion: '1.0',
        };

        // Direkt kaydet (audit log olmadan - migration için)
        await setDoc(doc(db, 'kvkk_consents', userId), consent);

        console.log(`✅ Kullanıcı ${userId} için KVKK onayı oluşturuldu`);
        results.success++;
      } catch (userError) {
        console.error(`❌ Kullanıcı ${userId} için KVKK hatası:`, userError);
        results.failed++;
      }
    }

    console.log(`📊 KVKK Migration tamamlandı: ${results.success} başarılı, ${results.skipped} atlandı, ${results.failed} başarısız`);
    return results;
  } catch (error) {
    console.error('❌ KVKK migration hatası:', error);
    throw error;
  }
};