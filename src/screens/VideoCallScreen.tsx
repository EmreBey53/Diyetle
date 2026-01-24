// src/screens/VideoCallScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { startVideoCall, endVideoCall, startScreenShare } from '../services/videoCallService';
import { getCurrentUser } from '../services/authService';

const { width, height } = Dimensions.get('window');

export default function VideoCallScreen({ route, navigation }: any) {
  const { callId, roomId, appointmentId, participantName, isTestMode: routeTestMode } = route.params || {};
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [showControls, setShowControls] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);

  const callTimer = useRef<NodeJS.Timeout | null>(null);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Test modu kontrolü
    const testMode = routeTestMode || callId?.startsWith('test-') || appointmentId?.startsWith('test-');
    setIsTestMode(testMode);
    
    initializeCall();
    startCallTimer();
    
    return () => {
      if (callTimer.current) clearInterval(callTimer.current);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  const initializeCall = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      // Eğer callId varsa mevcut görüşmeye katıl, yoksa test görüşmesi başlat
      if (user && (callId || appointmentId)) {
        const actualCallId = callId || `test-call-${Date.now()}`;
        const callData = await startVideoCall(actualCallId, user.id, user.role);
        setIsConnected(true);
        console.log('✅ Video görüşme başlatıldı:', callData.roomId);
      } else {
        // Test modu
        setIsConnected(true);
        console.log('✅ Test video görüşmesi başlatıldı');
      }
    } catch (error) {
      console.error('❌ Video görüşme başlatma hatası:', error);
      Alert.alert('Hata', 'Video görüşme başlatılamadı');
      navigation.goBack();
    }
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // WebRTC mute/unmute logic burada olacak
    console.log(isMuted ? '🔊 Mikrofon açıldı' : '🔇 Mikrofon kapatıldı');
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // WebRTC video on/off logic burada olacak
    console.log(isVideoOff ? '📹 Kamera açıldı' : '📹 Kamera kapatıldı');
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Audio output toggle logic burada olacak
    console.log(isSpeakerOn ? '🔇 Hoparlör kapatıldı' : '🔊 Hoparlör açıldı');
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const actualCallId = callId || `test-call-${Date.now()}`;
        await startScreenShare(actualCallId, currentUser?.id || 'test-user');
        setIsScreenSharing(true);
        console.log('🖥️ Ekran paylaşımı başlatıldı');
      } else {
        setIsScreenSharing(false);
        console.log('🖥️ Ekran paylaşımı durduruldu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Ekran paylaşımı başlatılamadı');
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Recording logic burada olacak
    console.log(isRecording ? '⏹️ Kayıt durduruldu' : '🔴 Kayıt başlatıldı');
  };

  const handleEndCall = async () => {
    try {
      if (callTimer.current) {
        clearInterval(callTimer.current);
        callTimer.current = null;
      }
      
      // Eğer gerçek callId varsa sonlandır
      if (callId && currentUser) {
        await endVideoCall(callId, currentUser.id, callNotes);
        console.log('✅ Video görüşme sonlandırıldı');
      } else {
        console.log('✅ Test video görüşmesi sonlandırıldı');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('❌ Görüşme sonlandırma hatası:', error);
      // Hata olsa bile geri git
      navigation.goBack();
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#8BC34A';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Container */}
      <TouchableOpacity 
        style={styles.videoContainer} 
        activeOpacity={1}
        onPress={showControlsTemporarily}
      >
        {/* Remote Video */}
        <View style={styles.remoteVideo}>
          {isVideoOff ? (
            <View style={styles.videoOffContainer}>
              <Ionicons name="videocam-off" size={60} color={colors.white} />
              <Text style={styles.videoOffText}>Kamera Kapalı</Text>
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.placeholderText}>
                {isTestMode ? '🧪 Test Video Stream' : 'Video Stream'}
              </Text>
              {isTestMode && (
                <Text style={styles.testModeText}>
                  Bu bir test görüşmesidir
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Local Video (Picture in Picture) */}
        <View style={styles.localVideo}>
          <View style={styles.localVideoPlaceholder}>
            <Ionicons name="person" size={30} color={colors.white} />
          </View>
        </View>

        {/* Top Info Bar */}
        {showControls && (
          <View style={styles.topBar}>
            <View style={styles.connectionInfo}>
              <View style={[styles.connectionDot, { backgroundColor: getConnectionQualityColor() }]} />
              <Text style={styles.connectionText}>{connectionQuality}</Text>
            </View>
            
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
            
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC</Text>
              </View>
            )}
          </View>
        )}

        {/* Screen Share Indicator */}
        {isScreenSharing && (
          <View style={styles.screenShareIndicator}>
            <Ionicons name="desktop" size={20} color={colors.white} />
            <Text style={styles.screenShareText}>Ekran Paylaşılıyor</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Controls */}
      {showControls && (
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <TouchableOpacity 
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? "mic-off" : "mic"} 
                size={24} 
                color={isMuted ? colors.error : colors.white} 
              />
            </TouchableOpacity>

            {/* Video Button */}
            <TouchableOpacity 
              style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Ionicons 
                name={isVideoOff ? "videocam-off" : "videocam"} 
                size={24} 
                color={isVideoOff ? colors.error : colors.white} 
              />
            </TouchableOpacity>

            {/* Speaker Button */}
            <TouchableOpacity 
              style={[styles.controlButton, !isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
            >
              <Ionicons 
                name={isSpeakerOn ? "volume-high" : "volume-mute"} 
                size={24} 
                color={colors.white} 
              />
            </TouchableOpacity>

            {/* Screen Share Button */}
            <TouchableOpacity 
              style={[styles.controlButton, isScreenSharing && styles.controlButtonActive]}
              onPress={handleScreenShare}
            >
              <Ionicons 
                name="desktop" 
                size={24} 
                color={isScreenSharing ? colors.primary : colors.white} 
              />
            </TouchableOpacity>

            {/* Recording Button */}
            <TouchableOpacity 
              style={[styles.controlButton, isRecording && styles.controlButtonActive]}
              onPress={toggleRecording}
            >
              <Ionicons 
                name="radio-button-on" 
                size={24} 
                color={isRecording ? colors.error : colors.white} 
              />
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity 
            style={styles.endCallButton}
            onPress={() => setShowEndCallModal(true)}
          >
            <Ionicons name="call" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* End Call Modal */}
      <Modal
        visible={showEndCallModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Görüşmeyi Sonlandır</Text>
            <Text style={styles.modalText}>
              Görüşmeyi sonlandırmak istediğinizden emin misiniz?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowEndCallModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalEndButton}
                onPress={handleEndCall}
              >
                <Text style={styles.modalEndText}>Sonlandır</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  videoOffContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  videoOffText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 10,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  placeholderText: {
    color: colors.white,
    fontSize: 18,
    textAlign: 'center',
  },
  testModeText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
  },
  localVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: colors.white,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  durationText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 4,
  },
  recordingText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  screenShareIndicator: {
    position: 'absolute',
    top: 70,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  screenShareText: {
    color: colors.white,
    fontSize: 12,
    marginLeft: 6,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: width * 0.8,
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  modalCancelText: {
    color: colors.gray,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalEndButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.error,
  },
  modalEndText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});