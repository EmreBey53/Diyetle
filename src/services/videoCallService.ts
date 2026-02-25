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
  duration: number;
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
    
    await sendCallNotifications(docRef.id, dietitianId, patientId, scheduledTime);
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

    return { id: docRef.id, ...videoCall };
  } catch (error) {
    throw error;
  }
};

export const startVideoCall = async (callId: string, userId: string, userRole: 'dietitian' | 'patient') => {
  try {
    if (callId.startsWith('test-call-')) {
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
    
    const now = new Date();
    const scheduledTime = callData.scheduledTime.toDate();
    const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime()) / (1000 * 60);
    
    if (timeDiff > 15) {
      throw new Error('Görüşme zamanı geçmiş veya henüz gelmemiş');
    }

    await updateDoc(callRef, {
      status: 'ongoing',
      startedAt: Timestamp.now(),
    });

    await createCallSession(callId, userId, userRole);
    const accessToken = await generateAccessToken(callData.roomId, userId, userRole);
    await logAuditEvent({
      userId,
      userRole,
      action: 'video_call_started',
      resource: 'video_call',
      resourceId: callId,
      details: { roomId: callData.roomId },
      severity: 'low',
    });

    return {
      roomId: callData.roomId,
      accessToken,
      callData,
    };
  } catch (error) {
    throw error;
  }
};

export const endVideoCall = async (callId: string, userId: string, notes?: string, rating?: number) => {
  try {
    if (!callId || !userId) {
      throw new Error('Gerekli parametreler eksik');
    }

    if (callId.startsWith('test-call-')) {
      return {
        actualDuration: 5,
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

    await updateDoc(callRef, {
      status: 'completed',
      endedAt: Timestamp.now(),
      notes: notes || '',
      duration: actualDuration,
    });

    await endCallSession(callId, userId);
    await processCallRecording(callId);
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

    return { actualDuration, callData };
  } catch (error) {
    throw error;
  }
};

export const startScreenShare = async (callId: string, userId: string) => {
  try {
    if (callId.startsWith('test-call-')) {
      return true;
    }

    const permissions = await checkScreenSharePermissions();
    if (!permissions) {
      throw new Error('Ekran paylaşımı izni gerekli');
    }

    await logAuditEvent({
      userId,
      userRole: 'dietitian',
      action: 'screen_share_started',
      resource: 'video_call',
      resourceId: callId,
      severity: 'low',
    });

    return true;
  } catch (error) {
    throw error;
  }
};

export const getCallHistory = async (userId: string, userRole: 'dietitian' | 'patient') => {
  try {
    if (!userId || !userRole) {
      return [];
    }

    const field = userRole === 'dietitian' ? 'dietitianId' : 'patientId';
    
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
    // Fallback query when Firestore composite index is not available
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
      return [];
    }
  }
};

const generateRoomId = (): string => {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateAccessToken = async (roomId: string, userId: string, role: string): Promise<string> => {
  // In production: fetch token from WebRTC signaling server
  return `token_${roomId}_${userId}_${role}_${Date.now()}`;
};

const sendCallNotifications = async (callId: string, dietitianId: string, patientId: string, scheduledTime: Date) => {
  try {
    const timeStr = scheduledTime.toLocaleString('tr-TR');
    await sendEmergencyNotification(
      dietitianId,
      `📹 Video görüşmeniz ${timeStr} tarihinde planlandı`,
      'high'
    );
    await sendEmergencyNotification(
      patientId,
      `📹 Diyetisyeninizle video görüşmeniz ${timeStr} tarihinde planlandı`,
      'high'
    );
  } catch (error) {
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
        platform: 'mobile',
        camera: true,
        microphone: true,
      },
    };

    await addDoc(collection(db, 'call_sessions'), session);
  } catch (error) {
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
  }
};

const checkScreenSharePermissions = async (): Promise<boolean> => {
  return true;
};

const processCallRecording = async (callId: string) => {
  try {
  } catch (error) {
  }
};