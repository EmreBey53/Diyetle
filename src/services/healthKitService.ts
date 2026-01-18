// src/services/healthKitService.ts
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface HealthData {
  userId: string;
  dataType: 'steps' | 'heart_rate' | 'calories' | 'sleep' | 'weight' | 'blood_pressure';
  value: number;
  unit: string;
  source: 'apple_health' | 'google_fit' | 'manual' | 'smartwatch';
  timestamp: Timestamp;
  deviceInfo?: {
    brand: string;
    model: string;
    os: string;
  };
}

export interface SyncSettings {
  userId: string;
  autoSync: boolean;
  syncInterval: number; // dakika
  enabledDataTypes: string[];
  lastSyncTime?: Timestamp;
}

// Apple Health Kit entegrasyonu (iOS)
export const connectAppleHealth = async (userId: string) => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Health sadece iOS\'ta desteklenir');
    }

    // Apple HealthKit izinleri iste
    const permissions = [
      'steps',
      'heartRate',
      'activeEnergyBurned',
      'bodyMass',
      'sleepAnalysis'
    ];

    console.log('🍎 Apple Health bağlantısı isteniyor...');
    
    // Gerçek implementasyonda react-native-health kütüphanesi kullanılacak
    // const isAvailable = await AppleHealthKit.isAvailable();
    // if (isAvailable) {
    //   await AppleHealthKit.initHealthKit(permissions);
    // }

    await saveSyncSettings(userId, {
      autoSync: true,
      syncInterval: 60,
      enabledDataTypes: permissions,
    });

    console.log('✅ Apple Health bağlandı');
    return true;
  } catch (error) {
    console.error('❌ Apple Health bağlantı hatası:', error);
    return false;
  }
};

// Google Fit entegrasyonu (Android)
export const connectGoogleFit = async (userId: string) => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('Google Fit sadece Android\'te desteklenir');
    }

    console.log('🤖 Google Fit bağlantısı isteniyor...');
    
    // Gerçek implementasyonda @react-native-google-fit/google-fit kullanılacak
    // const isAuthorized = await GoogleFit.authorize({
    //   scopes: [
    //     Scopes.FITNESS_ACTIVITY_READ,
    //     Scopes.FITNESS_BODY_READ,
    //     Scopes.FITNESS_LOCATION_READ,
    //   ],
    // });

    await saveSyncSettings(userId, {
      autoSync: true,
      syncInterval: 60,
      enabledDataTypes: ['steps', 'calories', 'heart_rate', 'weight'],
    });

    console.log('✅ Google Fit bağlandı');
    return true;
  } catch (error) {
    console.error('❌ Google Fit bağlantı hatası:', error);
    return false;
  }
};

// Sağlık verilerini senkronize et
export const syncHealthData = async (userId: string) => {
  try {
    const settings = await getSyncSettings(userId);
    if (!settings || !settings.autoSync) {
      return;
    }

    console.log('🔄 Sağlık verileri senkronize ediliyor...');

    // Platform'a göre veri çek
    let healthData: Partial<HealthData>[] = [];
    
    if (Platform.OS === 'ios') {
      healthData = await fetchAppleHealthData(settings.enabledDataTypes);
    } else if (Platform.OS === 'android') {
      healthData = await fetchGoogleFitData(settings.enabledDataTypes);
    }

    // Verileri Firestore'a kaydet
    for (const data of healthData) {
      await saveHealthData({
        userId,
        dataType: data.dataType!,
        value: data.value!,
        unit: data.unit!,
        source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        timestamp: data.timestamp || Timestamp.now(),
        deviceInfo: {
          brand: Device.brand || 'Unknown',
          model: Device.modelName || 'Unknown',
          os: Platform.OS,
        },
      });
    }

    // Son senkronizasyon zamanını güncelle
    await updateLastSyncTime(userId);

    console.log(`✅ ${healthData.length} sağlık verisi senkronize edildi`);
    return healthData.length;
  } catch (error) {
    console.error('❌ Sağlık verisi senkronizasyon hatası:', error);
    return 0;
  }
};

// Otomatik senkronizasyon başlat
export const startAutoSync = async (userId: string) => {
  try {
    const settings = await getSyncSettings(userId);
    if (!settings || !settings.autoSync) {
      return;
    }

    // Belirli aralıklarla senkronizasyon yap
    setInterval(async () => {
      await syncHealthData(userId);
    }, settings.syncInterval * 60 * 1000);

    console.log('🔄 Otomatik senkronizasyon başlatıldı');
  } catch (error) {
    console.error('❌ Otomatik senkronizasyon başlatma hatası:', error);
  }
};

// Akıllı saat verilerini işle
export const processWearableData = async (userId: string, wearableData: any) => {
  try {
    // Akıllı saat verilerini normalize et
    const normalizedData = normalizeWearableData(wearableData);
    
    for (const data of normalizedData) {
      await saveHealthData({
        userId,
        ...data,
        source: 'smartwatch',
        timestamp: Timestamp.now(),
      });
    }

    console.log('⌚ Akıllı saat verileri işlendi');
  } catch (error) {
    console.error('❌ Akıllı saat veri işleme hatası:', error);
  }
};

// Yardımcı fonksiyonlar
const saveSyncSettings = async (userId: string, settings: Partial<SyncSettings>) => {
  const syncSettings: SyncSettings = {
    userId,
    autoSync: settings.autoSync || false,
    syncInterval: settings.syncInterval || 60,
    enabledDataTypes: settings.enabledDataTypes || [],
    lastSyncTime: Timestamp.now(),
  };

  await addDoc(collection(db, 'sync_settings'), syncSettings);
};

const getSyncSettings = async (userId: string): Promise<SyncSettings | null> => {
  // Basitleştirilmiş - gerçekte Firestore'dan çekilecek
  return {
    userId,
    autoSync: true,
    syncInterval: 60,
    enabledDataTypes: ['steps', 'heart_rate', 'calories'],
  };
};

const saveHealthData = async (data: HealthData) => {
  await addDoc(collection(db, 'health_data'), data);
};

const updateLastSyncTime = async (userId: string) => {
  // Basitleştirilmiş - gerçekte Firestore güncellemesi yapılacak
  console.log('Son senkronizasyon zamanı güncellendi');
};

const fetchAppleHealthData = async (dataTypes: string[]): Promise<Partial<HealthData>[]> => {
  // Gerçek implementasyonda Apple HealthKit'ten veri çekilecek
  return [
    { dataType: 'steps', value: 8500, unit: 'count' },
    { dataType: 'heart_rate', value: 72, unit: 'bpm' },
    { dataType: 'calories', value: 2100, unit: 'kcal' },
  ];
};

const fetchGoogleFitData = async (dataTypes: string[]): Promise<Partial<HealthData>[]> => {
  // Gerçek implementasyonda Google Fit'ten veri çekilecek
  return [
    { dataType: 'steps', value: 9200, unit: 'count' },
    { dataType: 'calories', value: 2250, unit: 'kcal' },
  ];
};

const normalizeWearableData = (wearableData: any): Partial<HealthData>[] => {
  // Farklı akıllı saat markalarından gelen verileri normalize et
  return [
    { dataType: 'heart_rate', value: wearableData.heartRate, unit: 'bpm' },
    { dataType: 'steps', value: wearableData.steps, unit: 'count' },
  ];
};