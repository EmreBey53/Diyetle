import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, deleteDoc, Timestamp, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
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

export const saveKVKKConsent = async (consent: KVKKConsent) => {
  try {
    await setDoc(doc(db, 'kvkk_consents', consent.userId), consent);
    
    await logAuditEvent({
      userId: consent.userId,
      userRole: 'patient',
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
    
  } catch (error) {
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
    return null;
  }
};

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
    
  } catch (error) {
    throw error;
  }
};

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

    const batch = writeBatch(db);

    const collectionsToDelete = ['patients', 'diet_plans', 'progress', 'questions', 'meal_photos', 'water_intake', 'questionnaires', 'push_tokens', 'smart_notifications'];
    for (const col of collectionsToDelete) {
      const snap = await getDocs(query(collection(db, col), where('userId', '==', userId)));
      snap.docs.forEach(d => batch.delete(d.ref));
    }

    const patientSnap = await getDocs(query(collection(db, 'patients'), where('userId', '==', userId)));
    for (const patientDoc of patientSnap.docs) {
      const dietPlanSnap = await getDocs(query(collection(db, 'diet_plans'), where('patientId', '==', patientDoc.id)));
      dietPlanSnap.docs.forEach(d => batch.delete(d.ref));
    }

    const chatSnap = await getDocs(query(collection(db, 'chat_rooms'), where('participants', 'array-contains', userId)));
    chatSnap.docs.forEach(d => batch.delete(d.ref));

    batch.delete(doc(db, 'kvkk_consents', userId));
    batch.delete(doc(db, 'users', userId));

    await batch.commit();
  } catch (error) {
    throw error;
  }
};

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

  } catch (error) {
    throw error;
  }
};

export const migrateExistingUsersKVKK = async (): Promise<{ success: number; skipped: number; failed: number }> => {
  const results = { success: 0, skipped: 0, failed: 0 };

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        const existingConsent = await getKVKKConsent(userId);

        if (existingConsent) {
          results.skipped++;
          continue;
        }

        const consent: KVKKConsent = {
          userId,
          dataProcessingConsent: true,
          marketingConsent: true,
          thirdPartyConsent: false,
          consentDate: Timestamp.now(),
          consentVersion: '1.0',
        };

        await setDoc(doc(db, 'kvkk_consents', userId), consent);

        results.success++;
      } catch (userError) {
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};