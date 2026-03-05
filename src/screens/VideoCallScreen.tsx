import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import {
  startVideoCall,
  endVideoCall,
  generateJitsiEmbedHtml,
  sendVideoCallStartedNotification,
} from '../services/videoCallService';
import { getCurrentUser } from '../services/authService';

export default function VideoCallScreen({ route, navigation }: any) {
  const {
    callId,
    roomId: routeRoomId,
    participantName,
    patientId,
    isInstantCall,
  } = route.params || {};

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [jitsiRoomId, setJitsiRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showTopBar, setShowTopBar] = useState(true);
  const callTimer = useRef<NodeJS.Timeout | null>(null);
  const topBarTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeCall();
    return () => {
      if (callTimer.current) clearInterval(callTimer.current);
      if (topBarTimer.current) clearTimeout(topBarTimer.current);
    };
  }, []);

  const initializeCall = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (routeRoomId) {
        setJitsiRoomId(routeRoomId);
        setLoading(false);
        startTimer();
        return;
      }

      if (callId && user) {
        const role = user.role === 'admin' ? 'patient' : (user.role as 'dietitian' | 'patient');
        const callData = await startVideoCall(callId, user.id, role);
        setJitsiRoomId(callData.roomId);

        if (isInstantCall && patientId && role === 'dietitian') {
          await sendVideoCallStartedNotification(
            patientId,
            user.displayName || 'Diyetisyen',
            callData.roomId
          );
        }
      } else {
        const testRoom = `diyetle-test-${Date.now()}`;
        setJitsiRoomId(testRoom);
      }

      setLoading(false);
      startTimer();
    } catch (error: any) {
      const testRoom = `diyetle-test-${Date.now()}`;
      setJitsiRoomId(testRoom);
      setLoading(false);
      startTimer();
    }
  };

  const startTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    Alert.alert(
      'Gorusmeyi Sonlandir',
      'Gorusmeyi sonlandirmak istediginizden emin misiniz?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Sonlandir',
          style: 'destructive',
          onPress: async () => {
            if (callTimer.current) clearInterval(callTimer.current);
            try {
              if (callId && currentUser) {
                await endVideoCall(callId, currentUser.id);
              }
            } catch {}
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getJitsiUrl = () => `https://meet.jit.si/${jitsiRoomId}`;

  const handleShareLink = async () => {
    if (!jitsiRoomId) return;
    const url = getJitsiUrl();
    try {
      await Share.share({ message: `Gorusme linki: ${url}`, url });
    } catch {}
  };

  const handleOpenInBrowser = () => {
    if (!jitsiRoomId) return;
    Linking.openURL(getJitsiUrl());
  };

  const handleScreenTap = () => {
    setShowTopBar(true);
    if (topBarTimer.current) clearTimeout(topBarTimer.current);
    topBarTimer.current = setTimeout(() => setShowTopBar(false), 4000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Gorusme hazirlaniyor...</Text>
      </View>
    );
  }

  const jitsiHtml = jitsiRoomId
    ? generateJitsiEmbedHtml(jitsiRoomId, currentUser?.displayName || participantName || 'Kullanici')
    : null;

  const handleWebViewMessage = (event: any) => {
    if (event.nativeEvent.data === 'CALL_ENDED') {
      if (callTimer.current) clearInterval(callTimer.current);
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {jitsiHtml ? (
        <WebView
          source={{ html: jitsiHtml, baseUrl: 'https://meet.jit.si' }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          allowsFullscreenVideo
          onMessage={handleWebViewMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.webviewLoadingText}>Gorusme baglaniyor...</Text>
            </View>
          )}
          onTouchStart={handleScreenTap}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="videocam-off-outline" size={64} color={colors.textLight} />
          <Text style={styles.errorText}>Gorusme odasina baglanılamadi</Text>
        </View>
      )}

      {showTopBar && (
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>CANLI</Text>
          </View>
          <Text style={styles.participantName} numberOfLines={1}>
            {participantName || 'Gorusme'}
          </Text>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        </View>
      )}

      {showTopBar && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleShareLink}>
            <Ionicons name="share-social-outline" size={22} color={colors.white} />
            <Text style={styles.controlBtnText}>Paylas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
            <Ionicons name="call" size={26} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={handleOpenInBrowser}>
            <Ionicons name="open-outline" size={22} color={colors.white} />
            <Text style={styles.controlBtnText}>Tarayici</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  webviewLoadingText: {
    color: colors.white,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: colors.textLight,
    fontSize: 16,
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 70,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
  liveText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  participantName: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  durationText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  controlBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '500',
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
