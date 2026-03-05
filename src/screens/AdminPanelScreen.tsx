import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  AppState,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { logoutUser } from '../services/authService';
import { sendPushNotification } from '../services/notificationService';
import { getAppConfig, updateAppConfig, AppConfig } from '../services/appConfigService';
import { sendDietitianApprovedEmail, sendDietitianRejectedEmail } from '../services/emailService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DietitianUser {
  id: string;
  displayName: string;
  email: string;
  specialization?: string;
  city?: string;
  experience?: number;
  education?: string;
  sessionFee?: number;
  bio?: string;
  isApproved?: boolean;
  isSuspended?: boolean;
  pushToken?: string;
  createdAt?: any;
}

interface PatientUser {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  dietitianId?: string;
  pushToken?: string;
}

interface Stats {
  totalDietitians: number;
  totalPatients: number;
  pendingCount: number;
  suspendedCount: number;
}

type Tab = 'dashboard' | 'pending' | 'dietitians' | 'patients' | 'announce' | 'settings';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminPanelScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Biyometrik kilitleme
  const [isLocked, setIsLocked] = useState(false);
  const [bioAuthAvailable, setBioAuthAvailable] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Data
  const [pendingList, setPendingList] = useState<DietitianUser[]>([]);
  const [dietitianList, setDietitianList] = useState<DietitianUser[]>([]);
  const [patientList, setPatientList] = useState<PatientUser[]>([]);
  const [stats, setStats] = useState<Stats>({ totalDietitians: 0, totalPatients: 0, pendingCount: 0, suspendedCount: 0 });

  // Announce
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [announceTarget, setAnnounceTarget] = useState<'all' | 'dietitians' | 'patients'>('all');
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // App Settings
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configBanner, setConfigBanner] = useState('');
  const [configBannerColor, setConfigBannerColor] = useState('#3B82F6');

  // ─── Biyometrik Kilitleme ────────────────────────────────────────────────────

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Admin Paneli — Kimliğinizi Doğrulayın',
        fallbackLabel: 'Şifre Kullan',
        cancelLabel: 'İptal',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
      } else {
        // Doğrulama başarısız veya iptal — çıkış yap
        navigation.replace('Welcome');
      }
    } catch {
      navigation.replace('Welcome');
    }
  }, [navigation]);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      LocalAuthentication.isEnrolledAsync().then((enrolled) => {
        setBioAuthAvailable(has && enrolled);
      });
    });
  }, []);

  useEffect(() => {
    if (!bioAuthAvailable) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        // Arka plana geçince kilitle
        setIsLocked(true);
      }
      if (nextState === 'active' && isLocked) {
        authenticate();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [bioAuthAvailable, isLocked, authenticate]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [pendingSnap, approvedSnap, suspendedSnap, patientSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'dietitian'), where('isApproved', '==', false))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'dietitian'), where('isApproved', '==', true))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'dietitian'), where('isSuspended', '==', true))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'patient'))),
      ]);

      const pending: DietitianUser[] = pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DietitianUser));
      const approved: DietitianUser[] = approvedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DietitianUser));
      const patients: PatientUser[] = patientSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PatientUser));

      setPendingList(pending);
      setDietitianList(approved);
      setPatientList(patients);
      setStats({
        totalDietitians: approvedSnap.size,
        totalPatients: patientSnap.size,
        pendingCount: pendingSnap.size,
        suspendedCount: suspendedSnap.size,
      });
    } catch {
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    getAppConfig().then((cfg) => {
      setAppConfig(cfg);
      setConfigBanner(cfg.announcementBanner || '');
      setConfigBannerColor(cfg.announcementColor || '#3B82F6');
    }).catch(() => {});
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ─── Pending Actions ────────────────────────────────────────────────────────

  const handleApprove = (item: DietitianUser) => {
    Alert.alert('Onayla', `${item.displayName} onaylansın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla', onPress: async () => {
          setActionLoading(item.id);
          try {
            await updateDoc(doc(db, 'users', item.id), { isApproved: true });
            setPendingList((prev) => prev.filter((d) => d.id !== item.id));
            setStats((s) => ({ ...s, pendingCount: s.pendingCount - 1, totalDietitians: s.totalDietitians + 1 }));
            if (item.pushToken) {
              await sendPushNotification(item.pushToken, '✅ Başvurunuz Onaylandı!', 'Diyetle platformuna hoş geldiniz. Artık giriş yapabilirsiniz.');
            }
            try { await sendDietitianApprovedEmail(item.email, item.displayName); } catch { /* mail opsiyonel */ }
          } catch { Alert.alert('Hata', 'Onaylama başarısız.'); }
          finally { setActionLoading(null); }
        },
      },
    ]);
  };

  const handleReject = (item: DietitianUser) => {
    Alert.alert('Reddet', `${item.displayName} reddedilsin mi? Bu işlem geri alınamaz.`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Reddet', style: 'destructive', onPress: async () => {
          setActionLoading(item.id);
          try {
            try { await sendDietitianRejectedEmail(item.email, item.displayName); } catch { /* mail opsiyonel */ }
            await deleteDoc(doc(db, 'users', item.id));
            setPendingList((prev) => prev.filter((d) => d.id !== item.id));
            setStats((s) => ({ ...s, pendingCount: s.pendingCount - 1 }));
          } catch { Alert.alert('Hata', 'Red işlemi başarısız.'); }
          finally { setActionLoading(null); }
        },
      },
    ]);
  };

  // ─── Dietitian Actions ──────────────────────────────────────────────────────

  const handleSuspend = (item: DietitianUser) => {
    const isSuspended = !!item.isSuspended;
    const action = isSuspended ? 'Askıdan Kaldır' : 'Askıya Al';
    Alert.alert(action, `${item.displayName} ${action.toLowerCase()}mak istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: action, onPress: async () => {
          setActionLoading(item.id);
          try {
            await updateDoc(doc(db, 'users', item.id), { isSuspended: !isSuspended });
            setDietitianList((prev) => prev.map((d) => d.id === item.id ? { ...d, isSuspended: !isSuspended } : d));
          } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
          finally { setActionLoading(null); }
        },
      },
    ]);
  };

  // ─── Announce ───────────────────────────────────────────────────────────────

  const handleSendAnnounce = async () => {
    if (!announceTitle.trim() || !announceBody.trim()) {
      Alert.alert('Eksik Bilgi', 'Başlık ve mesaj alanlarını doldurun.');
      return;
    }
    setSendingAnnounce(true);
    try {
      let targets: string[] = [];
      if (announceTarget === 'all' || announceTarget === 'dietitians') {
        targets = [...targets, ...dietitianList.filter((d) => d.pushToken).map((d) => d.pushToken!)];
      }
      if (announceTarget === 'all' || announceTarget === 'patients') {
        targets = [...targets, ...patientList.filter((p) => p.pushToken).map((p) => p.pushToken!)];
      }

      await Promise.all(targets.map((token) => sendPushNotification(token, announceTitle, announceBody)));
      Alert.alert('Gönderildi', `${targets.length} kullanıcıya bildirim gönderildi.`);
      setAnnounceTitle('');
      setAnnounceBody('');
    } catch {
      Alert.alert('Hata', 'Bildirim gönderilemedi.');
    } finally {
      setSendingAnnounce(false);
    }
  };

  // ─── Patient Delete ─────────────────────────────────────────────────────────

  const handleDeletePatient = (item: PatientUser) => {
    Alert.alert(
      'Hastayı Sil',
      `${item.displayName} adlı hastanın tüm verileri (diyet planları, ilerlemeler, sorular) silinecek. Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(item.id);
            try {
              // patients koleksiyonundan bul (userId ile eşleştir)
              const patientsSnap = await getDocs(query(collection(db, 'patients'), where('userId', '==', item.id)));
              const patientDocId = patientsSnap.empty ? null : patientsSnap.docs[0].id;

              // dietPlans sil
              const plansSnap = await getDocs(query(collection(db, 'dietPlans'), where('patientId', '==', patientDocId || item.id)));
              const plansSnap2 = await getDocs(query(collection(db, 'dietPlans'), where('patientUserId', '==', item.id)));
              await Promise.all([
                ...plansSnap.docs.map((d) => deleteDoc(d.ref)),
                ...plansSnap2.docs.map((d) => deleteDoc(d.ref)),
              ]);

              // progress sil
              const progressSnap = await getDocs(query(collection(db, 'progress'), where('patientId', '==', patientDocId || item.id)));
              await Promise.all(progressSnap.docs.map((d) => deleteDoc(d.ref)));

              // questions sil
              const questionsSnap = await getDocs(query(collection(db, 'questions'), where('patientId', '==', patientDocId || item.id)));
              await Promise.all(questionsSnap.docs.map((d) => deleteDoc(d.ref)));

              // patients doc sil
              if (patientDocId) {
                await deleteDoc(doc(db, 'patients', patientDocId));
              }

              // users doc sil
              const userDocRef = doc(db, 'users', item.id);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists()) {
                await deleteDoc(userDocRef);
              }

              setPatientList((prev) => prev.filter((p) => p.id !== item.id));
              setStats((s) => ({ ...s, totalPatients: s.totalPatients - 1 }));
              Alert.alert('Silindi', `${item.displayName} başarıyla silindi.`);
            } catch (e: any) {
              Alert.alert('Hata', e.message || 'Silme işlemi başarısız.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try { await logoutUser(); } catch {}
    navigation.replace('Welcome');
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const initials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?';

  // ─── Tab Content ─────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}>
      <Text style={styles.sectionTitle}>Genel Bakış</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderColor: '#6366F1' }]}>
          <Ionicons name="people" size={28} color="#6366F1" />
          <Text style={styles.statNumber}>{stats.totalDietitians}</Text>
          <Text style={styles.statLabel}>Aktif Diyetisyen</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#22C55E' }]}>
          <Ionicons name="person" size={28} color="#22C55E" />
          <Text style={styles.statNumber}>{stats.totalPatients}</Text>
          <Text style={styles.statLabel}>Kayıtlı Hasta</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
          <Ionicons name="time" size={28} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.pendingCount}</Text>
          <Text style={styles.statLabel}>Bekleyen Başvuru</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#EF4444' }]}>
          <Ionicons name="ban" size={28} color="#EF4444" />
          <Text style={styles.statNumber}>{stats.suspendedCount}</Text>
          <Text style={styles.statLabel}>Askıdaki Hesap</Text>
        </View>
      </View>

      {stats.pendingCount > 0 && (
        <TouchableOpacity style={styles.alertBanner} onPress={() => setActiveTab('pending')}>
          <Ionicons name="alert-circle" size={20} color="#F59E0B" />
          <Text style={styles.alertBannerText}>{stats.pendingCount} bekleyen diyetisyen başvurusu var</Text>
          <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderPending = () => (
    <FlatList
      data={pendingList}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle" size={64} color="#22C55E" />
          <Text style={styles.emptyTitle}>Bekleyen Başvuru Yok</Text>
          <Text style={styles.emptySubtitle}>Tüm başvurular işlendi.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isProcessing = actionLoading === item.id;
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.avatarText}>{initials(item.displayName)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.specialization ? <Text style={styles.specialization}>{item.specialization}</Text> : null}
              </View>
            </View>
            <View style={styles.metaRow}>
              {item.city ? <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color="#9CA3AF" /><Text style={styles.metaText}>{item.city}</Text></View> : null}
              {item.experience ? <View style={styles.metaItem}><Ionicons name="briefcase-outline" size={13} color="#9CA3AF" /><Text style={styles.metaText}>{item.experience} yıl</Text></View> : null}
              {item.sessionFee ? <View style={styles.metaItem}><Ionicons name="cash-outline" size={13} color="#9CA3AF" /><Text style={styles.metaText}>{item.sessionFee}₺</Text></View> : null}
            </View>
            {item.education ? <Text style={styles.education}>{item.education}</Text> : null}
            {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.rejectButton, isProcessing && styles.buttonDisabled]} onPress={() => handleReject(item)} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator size="small" color="#EF4444" /> : <><Ionicons name="close-circle-outline" size={18} color="#EF4444" /><Text style={styles.rejectText}>Reddet</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approveButton, isProcessing && styles.buttonDisabled]} onPress={() => handleApprove(item)} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#FFF" /><Text style={styles.approveText}>Onayla</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );

  const renderDietitians = () => (
    <FlatList
      data={dietitianList}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>Onaylı diyetisyen yok</Text></View>}
      renderItem={({ item }) => {
        const isProcessing = actionLoading === item.id;
        const suspended = !!item.isSuspended;
        return (
          <View style={[styles.card, suspended && styles.cardSuspended]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: suspended ? '#475569' : '#10B981' }]}>
                <Text style={styles.avatarText}>{initials(item.displayName)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.specialization ? <Text style={styles.specialization}>{item.specialization}</Text> : null}
              </View>
              {suspended && (
                <View style={styles.suspendedBadge}>
                  <Text style={styles.suspendedBadgeText}>Askıda</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              {item.city ? <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color="#9CA3AF" /><Text style={styles.metaText}>{item.city}</Text></View> : null}
              {item.experience ? <View style={styles.metaItem}><Ionicons name="briefcase-outline" size={13} color="#9CA3AF" /><Text style={styles.metaText}>{item.experience} yıl</Text></View> : null}
            </View>
            <TouchableOpacity
              style={[styles.suspendButton, suspended ? styles.unsuspendButton : {}, isProcessing && styles.buttonDisabled]}
              onPress={() => handleSuspend(item)}
              disabled={isProcessing}
            >
              {isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name={suspended ? 'checkmark-circle-outline' : 'ban-outline'} size={16} color="#FFF" />
                  <Text style={styles.suspendButtonText}>{suspended ? 'Askıdan Kaldır' : 'Askıya Al'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );

  const renderPatients = () => (
    <FlatList
      data={patientList}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>Kayıtlı hasta yok</Text></View>}
      renderItem={({ item }) => {
        const dietitian = dietitianList.find((d) => d.id === item.dietitianId);
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.avatarText}>{initials(item.displayName)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.phone ? <Text style={styles.metaText}>{item.phone}</Text> : null}
              </View>
              <TouchableOpacity
                style={[styles.deletePatientBtn, actionLoading === item.id && styles.buttonDisabled]}
                onPress={() => handleDeletePatient(item)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Ionicons name="trash-outline" size={18} color="#EF4444" />
                }
              </TouchableOpacity>
            </View>
            {dietitian && (
              <View style={styles.dietitianTag}>
                <Ionicons name="medical-outline" size={13} color="#818CF8" />
                <Text style={styles.dietitianTagText}>{dietitian.displayName}</Text>
              </View>
            )}
          </View>
        );
      }}
    />
  );

  const renderAnnounce = () => (
    <ScrollView contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Bildirim Gönder</Text>
      <Text style={styles.sectionSubtitle}>Seçilen gruba push bildirim gönderin</Text>

      <Text style={styles.inputLabel}>Hedef Kitle</Text>
      <View style={styles.targetRow}>
        {(['all', 'dietitians', 'patients'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.targetChip, announceTarget === t && styles.targetChipActive]}
            onPress={() => setAnnounceTarget(t)}
          >
            <Text style={[styles.targetChipText, announceTarget === t && styles.targetChipTextActive]}>
              {t === 'all' ? 'Herkese' : t === 'dietitians' ? 'Diyetisyenler' : 'Hastalar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Başlık</Text>
      <TextInput
        style={styles.input}
        placeholder="Bildirim başlığı..."
        placeholderTextColor="#475569"
        value={announceTitle}
        onChangeText={setAnnounceTitle}
      />

      <Text style={styles.inputLabel}>Mesaj</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Bildirim mesajı..."
        placeholderTextColor="#475569"
        value={announceBody}
        onChangeText={setAnnounceBody}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <View style={styles.announceInfo}>
        <Ionicons name="information-circle-outline" size={16} color="#64748B" />
        <Text style={styles.announceInfoText}>
          {announceTarget === 'all'
            ? `${dietitianList.filter((d) => d.pushToken).length + patientList.filter((p) => p.pushToken).length} kullanıcıya gönderilecek`
            : announceTarget === 'dietitians'
            ? `${dietitianList.filter((d) => d.pushToken).length} diyetisyene gönderilecek`
            : `${patientList.filter((p) => p.pushToken).length} hastaya gönderilecek`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.sendButton, sendingAnnounce && styles.buttonDisabled]}
        onPress={handleSendAnnounce}
        disabled={sendingAnnounce}
      >
        {sendingAnnounce ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#FFF" />
            <Text style={styles.sendButtonText}>Gönder</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSettings = () => {
    if (!appConfig) return <View style={styles.center}><ActivityIndicator color="#6366F1" /></View>;

    const toggle = async (key: keyof AppConfig, value: boolean) => {
      setSavingConfig(true);
      try {
        await updateAppConfig({ [key]: value });
        setAppConfig((prev) => prev ? { ...prev, [key]: value } : prev);
      } catch { Alert.alert('Hata', 'Ayar kaydedilemedi.'); }
      finally { setSavingConfig(false); }
    };

    const saveBanner = async () => {
      setSavingConfig(true);
      try {
        await updateAppConfig({ announcementBanner: configBanner, announcementColor: configBannerColor });
        setAppConfig((prev) => prev ? { ...prev, announcementBanner: configBanner, announcementColor: configBannerColor } : prev);
        Alert.alert('Kaydedildi', 'Duyuru banner güncellendi.');
      } catch { Alert.alert('Hata', 'Kaydedilemedi.'); }
      finally { setSavingConfig(false); }
    };

    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
        <Text style={styles.sectionSubtitle}>Firebase Console'a girmeden değiştirin</Text>

        {/* Bakım Modu */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="construct-outline" size={20} color="#F59E0B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Bakım Modu</Text>
              <Text style={styles.settingDesc}>Açıkken kullanıcılar uygulamaya giremez</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, appConfig.maintenanceMode && styles.toggleButtonOn]}
              onPress={() => toggle('maintenanceMode', !appConfig.maintenanceMode)}
              disabled={savingConfig}
            >
              <Text style={styles.toggleText}>{appConfig.maintenanceMode ? 'AÇIK' : 'KAPALI'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kayıt Kapatma */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="person-add-outline" size={20} color="#22C55E" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Yeni Kayıt</Text>
              <Text style={styles.settingDesc}>Kapalıyken yeni kullanıcı kaydı durur</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, appConfig.registrationEnabled && styles.toggleButtonOn]}
              onPress={() => toggle('registrationEnabled', !appConfig.registrationEnabled)}
              disabled={savingConfig}
            >
              <Text style={styles.toggleText}>{appConfig.registrationEnabled ? 'AÇIK' : 'KAPALI'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Duyuru Banner */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="megaphone-outline" size={20} color="#6366F1" /></View>
            <Text style={styles.settingTitle}>Duyuru Banner</Text>
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Banner metni (boş bırakırsan gizlenir)..."
            placeholderTextColor="#475569"
            value={configBanner}
            onChangeText={setConfigBanner}
          />
          <Text style={[styles.inputLabel, { marginTop: 8 }]}>Banner Rengi</Text>
          <View style={styles.colorRow}>
            {['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, configBannerColor === c && styles.colorDotSelected]}
                onPress={() => setConfigBannerColor(c)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.sendButton, { marginTop: 12 }, savingConfig && styles.buttonDisabled]}
            onPress={saveBanner}
            disabled={savingConfig}
          >
            {savingConfig ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendButtonText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ─── Root ────────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: 'dashboard', icon: 'grid-outline', label: 'Genel' },
    { key: 'pending', icon: 'time-outline', label: 'Bekleyenler', badge: stats.pendingCount },
    { key: 'dietitians', icon: 'medical-outline', label: 'Diyetisyen' },
    { key: 'patients', icon: 'people-outline', label: 'Hastalar' },
    { key: 'announce', icon: 'megaphone-outline', label: 'Duyuru' },
    { key: 'settings', icon: 'settings-outline', label: 'Ayarlar' },
  ];

  // Biyometrik kilit ekranı
  if (isLocked) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed" size={64} color="#6366F1" />
        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 8, textAlign: 'center' }]}>
          Admin Paneli Kilitli
        </Text>
        <Text style={[styles.sectionSubtitle, { textAlign: 'center', marginBottom: 32 }]}>
          Devam etmek için kimliğinizi doğrulayın
        </Text>
        <TouchableOpacity style={styles.sendButton} onPress={authenticate}>
          <Ionicons name="finger-print" size={20} color="#FFF" />
          <Text style={styles.sendButtonText}>Doğrula</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.replace('Welcome')}>
          <Text style={{ color: '#64748B', fontSize: 14 }}>Çıkış Yap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Paneli</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'pending' && renderPending()}
          {activeTab === 'dietitians' && renderDietitians()}
          {activeTab === 'patients' && renderPatients()}
          {activeTab === 'announce' && renderAnnounce()}
          {activeTab === 'settings' && renderSettings()}
        </View>
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <View>
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={activeTab === tab.key ? '#6366F1' : '#475569'}
              />
              {tab.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F1F5F9' },
  logoutButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  tabContent: { padding: 16, gap: 12, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },

  // Stats
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#1E293B', borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#F1F5F9' },
  statLabel: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F59E0B20', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  alertBannerText: { flex: 1, fontSize: 14, color: '#F59E0B', fontWeight: '500' },

  // Cards
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardSuspended: { borderColor: '#EF444440', backgroundColor: '#1E293B' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', marginBottom: 2 },
  email: { fontSize: 13, color: '#64748B' },
  specialization: { fontSize: 13, color: '#818CF8', fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#9CA3AF' },
  education: { fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  bio: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 10, fontStyle: 'italic' },

  // Card Actions
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#EF4444' },
  rejectText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#22C55E' },
  approveText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },

  // Suspend
  suspendedBadge: { backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#EF444440' },
  suspendedBadgeText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  suspendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EF4444', marginTop: 4 },
  unsuspendButton: { backgroundColor: '#22C55E' },
  suspendButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  // Patient
  dietitianTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dietitianTagText: { fontSize: 13, color: '#818CF8' },
  deletePatientBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' },

  // Announce
  inputLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginBottom: 6 },
  targetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  targetChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#334155', alignItems: 'center' },
  targetChipActive: { borderColor: '#6366F1', backgroundColor: '#6366F115' },
  targetChipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  targetChipTextActive: { color: '#818CF8', fontWeight: '700' },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, fontSize: 15, color: '#F1F5F9', marginBottom: 14 },
  inputMultiline: { minHeight: 100, paddingTop: 14 },
  announceInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  announceInfoText: { fontSize: 13, color: '#64748B' },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366F1', paddingVertical: 15, borderRadius: 12 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Empty
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  emptySubtitle: { fontSize: 14, color: '#64748B' },

  // Settings
  settingCard: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 2 },
  settingDesc: { fontSize: 12, color: '#64748B' },
  toggleButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' },
  toggleButtonOn: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  colorRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#FFF' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#0F172A', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#1E293B',
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10, color: '#475569' },
  tabLabelActive: { color: '#6366F1' },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
});
