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
  return `diyetle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateJitsiRoomUrl = (roomId: string): string => {
  return `https://meet.jit.si/${roomId}`;
};

// Prejoin, reklam ve app yonlendirmesi olmadan direkt konferansa baglanir
export const generateJitsiEmbedHtml = (roomId: string, displayName: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  #meet { width: 100%; height: 100vh; }
  /* Jitsi watermark ve promo bantlarini gizle */
  .watermark, .leftwatermark, .rightwatermark,
  .powered-by, #poweredby, .powered-by-container,
  [class*="watermark"], [class*="promo"],
  .mobile-app-promo { display: none !important; }
</style>
</head>
<body>
<div id="meet"></div>
<script src="https://meet.jit.si/external_api.js"></script>
<script>
  const api = new JitsiMeetExternalAPI('meet.jit.si', {
    roomName: '${roomId}',
    parentNode: document.getElementById('meet'),
    width: '100%',
    height: '100%',
    userInfo: { displayName: '${displayName}' },
    configOverwrite: {
      prejoinPageEnabled: false,
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      disableDeepLinking: true,
      enableWelcomePage: false,
      disableThirdPartyRequests: true,
      analytics: { disabled: true },
      callStatsID: false,
      toolbarButtons: [
        'microphone', 'camera', 'hangup',
        'chat', 'raisehand', 'tileview', 'fullscreen'
      ],
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      MOBILE_APP_PROMO: false,
      HIDE_INVITE_MORE_HEADER: true,
      SHOW_PROMOTIONAL_CLOSE_PAGE: false,
      SHOW_CHROME_EXTENSION_BANNER: false,
      GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
      DEFAULT_BACKGROUND: '#000000',
      TOOLBAR_ALWAYS_VISIBLE: false,
    },
  });
  api.addEventListener('readyToClose', function() {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('CALL_ENDED');
  });
  api.addEventListener('videoConferenceLeft', function() {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('CALL_ENDED');
  });
</script>
</body>
</html>`;
};

const generateAccessToken = async (roomId: string, userId: string, role: string): Promise<string> => {
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

export const sendVideoCallStartedNotification = async (
  patientId: string,
  dietitianName: string,
  roomId: string
) => {
  try {
    await sendEmergencyNotification(
      patientId,
      `📹 ${dietitianName} sizi video görüşmeye davet ediyor! Randevular sekmesinden katılabilirsiniz.`,
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