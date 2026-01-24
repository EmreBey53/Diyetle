// src/services/auditService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

export interface AuditLog {
  id?: string;
  userId: string;
  userRole: 'patient' | 'dietitian';
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const logAuditEvent = async (auditData: Omit<AuditLog, 'id' | 'timestamp'>) => {
  try {
    const auditLog: Omit<AuditLog, 'id'> = {
      ...auditData,
      timestamp: Timestamp.now(),
    };

    await addDoc(collection(db, 'audit_logs'), auditLog);
    console.log('🔍 Audit log kaydedildi:', auditData.action);
  } catch (error) {
    console.error('❌ Audit log kaydetme hatası:', error);
  }
};

export const getAuditLogs = async (userId?: string, startDate?: Date, endDate?: Date) => {
  try {
    // Parametre kontrolü
    if (userId && typeof userId !== 'string') {
      console.warn('⚠️ getAuditLogs: Geçersiz userId');
      return [];
    }

    // Index ile optimized query
    let q;
    if (userId) {
      q = query(
        collection(db, 'audit_logs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (error) {
    console.error('❌ Audit logs getirme hatası:', error);
    
    // Fallback: Index yoksa basit query
    try {
      let fallbackQ;
      if (userId) {
        fallbackQ = query(
          collection(db, 'audit_logs'),
          where('userId', '==', userId)
        );
      } else {
        fallbackQ = query(collection(db, 'audit_logs'));
      }
      
      const snapshot = await getDocs(fallbackQ);
      const logs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as AuditLog))
        .sort((a, b) => {
          if (!a.timestamp && !b.timestamp) return 0;
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp.toMillis() - a.timestamp.toMillis();
        });

      return logs;
    } catch (fallbackError) {
      console.error('❌ Fallback audit logs hatası:', fallbackError);
      return [];
    }
  }
};

// KVKK Compliance Actions
export const AUDIT_ACTIONS = {
  // Veri İşleme
  DATA_ACCESS: 'data_access',
  DATA_CREATE: 'data_create',
  DATA_UPDATE: 'data_update',
  DATA_DELETE: 'data_delete',
  DATA_EXPORT: 'data_export',
  
  // Kimlik Doğrulama
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // KVKK Hakları
  CONSENT_GIVEN: 'consent_given',
  CONSENT_WITHDRAWN: 'consent_withdrawn',
  DATA_PORTABILITY: 'data_portability',
  DATA_RECTIFICATION: 'data_rectification',
  DATA_ERASURE: 'data_erasure',
  
  // Güvenlik
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  SECURITY_BREACH: 'security_breach',
};