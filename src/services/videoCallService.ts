// src/services/videoCallService.ts
import { db } from '../firebaseConfig';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService';
import { sendEmergencyNotification } from './smartNotificationService';

export interface VideoCall {
  id?: string;
  appointmentId: string;
  dietitianId: string;
  patientId: string;
  dietitianName: string;
  patientName: string;
  scheduledTime: Timestamp;
  duration: number; // dakika
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'missed';
  roomId: string;
  accessToken?: string;
  recordingUrl?: string;
  notes?: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  callQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  connectionIssues?: string[];
}

export interface CallSession {
  id?: string;
  callId: string;
  participantId: string;
  participantRole: 'dietitian' | 'patient';
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  deviceInfo: {
    platform: string;
    browser?: string;
    camera: boolean;
    microphone: boolean;
  };
}

export interface CallRecording {
  id?: string;
  callId: string;
  recordingUrl: string;
  duration: number;
  fileSize: number;
  recordedAt: Timestamp;
  isProcessed: boolean;
  transcription?: string;
  summary?: string;
}

// Video görüşme oluşturma
export const createVideoCall = async (
  appointmentId: string,
  dietitianId: string,
  patientId: string,
  dietitianName: string,
  patientName: string,
  scheduledTime: Date,
  duration: number = 30
) => {
  try {
    const roomId = generateRoomId();
    
    const videoCall: Omit<VideoCall, 'id'> = {
      appointmentId,
      dietitianId,
      patientId,
      dietitianName,
      patientName,
      scheduledTime: Timestamp.fromDate(scheduledTime),
      duration,
      status: 'scheduled',
      roomId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'video_calls'), videoCall);
    
    // Katılımcılara bildirim gönder
    await sendCallNotifications(docRef.id, dietitianId, patientId, scheduledTime);
    
    // Audit log
    await logAuditEvent({
      userId: dietitianId,
      userRole: 'dietitian',
      action: 'video_call_scheduled',
      resource: 'video_call',
      resourceId: docRef.id,
      details: { 
        patientId, 
        scheduledTime: scheduledTime.toISOString(), 
        duration 
      },
      severity: 'low',
    });

    console.log('✅ Video görüşme oluşturuldu:', docRef.id);
    return { id: docRef.id, ...videoCall };
  } catch (error) {
    console.error('❌ Video görüşme oluşturma hatası:', error);
    throw error;
  }
};

// Video görüşme başlatma
export const startVideoCall = async (callId: string, userId: string, userRole: 'dietitian' | 'patient') => {
  try {
    // Test modu kontrolü - eğer callId test ile başlıyorsa mock data döndür
    if (callId.startsWith('test-call-')) {
      console.log('🧪 Test modu: Mock video call başlatılıyor');
      const testRoomId = `test-room-${Date.now()}`;
      return {
        roomId: testRoomId,
        accessToken: `test-token-${userId}`,
        callData: {
          id: callId,
          roomId: testRoomId,
          status: 'ongoing' as const,
          dietitianName: 'Test Diyetisyen',
          patientName: 'Test Danışan',
        },
      };
    }

    const callRef = doc(db, 'video_calls', callId);
    const callDoc = await getDoc(callRef);
    
    if (!callDoc.exists()) {
      throw new Error('Video görüşme bulunamadı');
    }

    const callData = callDoc.data() as VideoCall;
    
    // Görüşme zamanı kontrolü
    const now = new Date();
    const scheduledTime = callData.scheduledTime.toDate();
    const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime()) / (1000 * 60); // dakika
    
    if (timeDiff > 15) {
      throw new Error('Görüşme zamanı geçmiş veya henüz gelmemiş');
    }

    // Görüşme durumunu güncelle
    await updateDoc(callRef, {
      status: 'ongoing',
      startedAt: Timestamp.now(),
    });

    // Session kaydet
    await createCallSession(callId, userId, userRole);
    
    // Access token oluştur (WebRTC için)
    const accessToken = await generateAccessToken(callData.roomId, userId, userRole);
    
    // Audit log
    await logAuditEvent({
      userId,
      userRole,
      action: 'video_call_started',
      resource: 'video_call',
      resourceId: callId,
      details: { roomId: callData.roomId },
      severity: 'low',
    });

    console.log('✅ Video görüşme başlatıldı:', callId);
    return {
      roomId: callData.roomId,
      accessToken,
      callData,
    };
  } catch (error) {
    console.error('❌ Video görüşme başlatma hatası:', error);
    throw error;
  }
};

// Video görüşme sonlandırma
export const endVideoCall = async (callId: string, userId: string, notes?: string, rating?: number) => {
  try {
    // Parametre kontrolü
    if (!callId || !userId) {
      console.warn('⚠️ endVideoCall: callId veya userId eksik');
      throw new Error('Gerekli parametreler eksik');
    }

    // Test modu kontrolü
    if (callId.startsWith('test-call-')) {
      console.log('🧪 Test modu: Mock video call sonlandırılıyor');
      return { 
        actualDuration: 5, // 5 dakika test süresi
        callData: {
          id: callId,
          status: 'completed' as const,
          notes: notes || 'Test görüşmesi tamamlandı',
        }
      };
    }

    const callRef = doc(db, 'video_calls', callId);
    const callDoc = await getDoc(callRef);
    
    if (!callDoc.exists()) {
      throw new Error('Video görüşme bulunamadı');
    }

    const callData = callDoc.data() as VideoCall;
    const actualDuration = callData.startedAt 
      ? Math.round((Date.now() - callData.startedAt.toMillis()) / (1000 * 60))
      : 0;

    // Görüşme durumunu güncelle
    await updateDoc(callRef, {
      status: 'completed',
      endedAt: Timestamp.now(),
      notes: notes || '',
      duration: actualDuration,
    });

    // Session'ı sonlandır
    await endCallSession(callId, userId);
    
    // Kayıt işlemi başlat (eğer varsa)
    await processCallRecording(callId);
    
    // Audit log
    await logAuditEvent({
      userId,
      userRole: userId === callData.dietitianId ? 'dietitian' : 'patient',
      action: 'video_call_ended',
      resource: 'video_call',
      resourceId: callId,
      details: { 
        actualDuration, 
        notes: notes || '', 
        ...(rating !== undefined && { rating }) 
      },
      severity: 'low',
    });

    console.log('✅ Video görüşme sonlandırıldı:', callId);
    return { actualDuration, callData };
  } catch (error) {
    console.error('❌ Video görüşme sonlandırma hatası:', error);
    throw error;
  }
};

// Ekran paylaşımı başlatma
export const startScreenShare = async (callId: string, userId: string) => {
  try {
    // Test modu kontrolü
    if (callId.startsWith('test-call-')) {
      console.log('🧪 Test modu: Mock ekran paylaşımı başlatılıyor');
      return true;
    }

    // Ekran paylaşımı izinlerini kontrol et
    const permissions = await checkScreenSharePermissions();
    if (!permissions) {
      throw new Error('Ekran paylaşımı izni gerekli');
    }

    // Audit log
    await logAuditEvent({
      userId,
      userRole: 'dietitian', // Genelde diyetisyen paylaşır
      action: 'screen_share_started',
      resource: 'video_call',
      resourceId: callId,
      severity: 'low',
    });

    console.log('✅ Ekran paylaşımı başlatıldı:', callId);
    return true;
  } catch (error) {
    console.error('❌ Ekran paylaşımı hatası:', error);
    throw error;
  }
};

// Görüşme geçmişi getirme
export const getCallHistory = async (userId: string, userRole: 'dietitian' | 'patient') => {
  try {
    // Parametre kontrolü
    if (!userId || !userRole) {
      console.warn('⚠️ getCallHistory: userId veya userRole eksik');
      return [];
    }

    const field = userRole === 'dietitian' ? 'dietitianId' : 'patientId';
    
    // Index ile optimized query
    const q = query(
      collection(db, 'video_calls'),
      where(field, '==', userId),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VideoCall));
  } catch (error) {
    console.error('❌ Görüşme geçmişi getirme hatası:', error);
    
    // Fallback: Index yoksa basit query
    try {
      const field = userRole === 'dietitian' ? 'dietitianId' : 'patientId';
      const fallbackQ = query(
        collection(db, 'video_calls'),
        where(field, '==', userId)
      );

      const snapshot = await getDocs(fallbackQ);
      const calls = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as VideoCall))
        .sort((a, b) => {
          if (!a.scheduledTime && !b.scheduledTime) return 0;
          if (!a.scheduledTime) return 1;
          if (!b.scheduledTime) return -1;
          return b.scheduledTime.toMillis() - a.scheduledTime.toMillis();
        });

      return calls;
    } catch (fallbackError) {
      console.error('❌ Fallback görüşme geçmişi hatası:', fallbackError);
      return [];
    }
  }
};

// Yardımcı fonksiyonlar
const generateRoomId = (): string => {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateAccessToken = async (roomId: string, userId: string, role: string): Promise<string> => {
  // Gerçek implementasyonda WebRTC signaling server'dan token alınacak
  // Şimdilik mock token
  return `token_${roomId}_${userId}_${role}_${Date.now()}`;
};

const sendCallNotifications = async (callId: string, dietitianId: string, patientId: string, scheduledTime: Date) => {
  try {
    const timeStr = scheduledTime.toLocaleString('tr-TR');
    
    // Diyetisyene bildirim
    await sendEmergencyNotification(
      dietitianId,
      `📹 Video görüşmeniz ${timeStr} tarihinde planlandı`,
      'high'
    );
    
    // Danışana bildirim
    await sendEmergencyNotification(
      patientId,
      `📹 Diyetisyeninizle video görüşmeniz ${timeStr} tarihinde planlandı`,
      'high'
    );
  } catch (error) {
    console.error('❌ Görüşme bildirimi hatası:', error);
  }
};

const createCallSession = async (callId: string, userId: string, role: 'dietitian' | 'patient') => {
  try {
    const session: Omit<CallSession, 'id'> = {
      callId,
      participantId: userId,
      participantRole: role,
      joinedAt: Timestamp.now(),
      connectionQuality: 'good',
      deviceInfo: {
        platform: 'mobile', // Platform.OS
        camera: true,
        microphone: true,
      },
    };

    await addDoc(collection(db, 'call_sessions'), session);
  } catch (error) {
    console.error('❌ Session oluşturma hatası:', error);
  }
};

const endCallSession = async (callId: string, userId: string) => {
  try {
    const q = query(
      collection(db, 'call_sessions'),
      where('callId', '==', callId),
      where('participantId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const sessionRef = snapshot.docs[0].ref;
      await updateDoc(sessionRef, {
        leftAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('❌ Session sonlandırma hatası:', error);
  }
};

const checkScreenSharePermissions = async (): Promise<boolean> => {
  // Platform spesifik izin kontrolü
  return true; // Şimdilik true
};

const processCallRecording = async (callId: string) => {
  try {
    // Kayıt işleme ve transkripsiyon
    console.log('🎥 Görüşme kaydı işleniyor:', callId);
    // Gerçek implementasyonda video processing yapılacak
  } catch (error) {
    console.error('❌ Kayıt işleme hatası:', error);
  }
};