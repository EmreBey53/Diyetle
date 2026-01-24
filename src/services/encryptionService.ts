// src/services/encryptionService.ts
import * as SecureStore from 'expo-secure-store';

export class EncryptionService {
  // Hassas verileri şifreleme (sadece Base64)
  static encrypt(data: string): string {
    try {
      return btoa(data);
    } catch (error) {
      console.error('❌ Şifreleme hatası:', error);
      return data; // Fallback: şifrelenmemiş veri döndür
    }
  }

  // Şifrelenmiş verileri çözme (sadece Base64)
  static decrypt(encryptedData: string): string {
    try {
      return atob(encryptedData);
    } catch (error) {
      console.error('❌ Şifre çözme hatası:', error);
      return encryptedData; // Fallback: veriyi olduğu gibi döndür
    }
  }

  // Güvenli depolama (sadece SecureStore)
  static async secureStore(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('❌ Güvenli depolama hatası:', error);
      throw error;
    }
  }

  // Güvenli okuma (sadece SecureStore)
  static async secureRetrieve(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('❌ Güvenli okuma hatası:', error);
      return null;
    }
  }

  // Basit hash oluşturma
  static hash(data: string): string {
    try {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit integer'a çevir
      }
      return Math.abs(hash).toString(16);
    } catch (error) {
      console.error('❌ Hash oluşturma hatası:', error);
      return data.length.toString(); // Fallback: string length
    }
  }

  // Rastgele token oluşturma
  static generateToken(length: number = 32): string {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    } catch (error) {
      console.error('❌ Token oluşturma hatası:', error);
      return Date.now().toString(); // Fallback: timestamp
    }
  }
}

// Hassas veri tipleri için wrapper'lar
export const encryptSensitiveData = (data: any) => {
  try {
    const jsonString = JSON.stringify(data);
    return EncryptionService.encrypt(jsonString);
  } catch (error) {
    console.error('❌ Hassas veri şifreleme hatası:', error);
    return JSON.stringify(data); // Fallback: şifrelenmemiş JSON
  }
};

export const decryptSensitiveData = (encryptedData: string) => {
  try {
    const decrypted = EncryptionService.decrypt(encryptedData);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Hassas veri şifre çözme hatası:', error);
    try {
      return JSON.parse(encryptedData); // Fallback: direkt parse et
    } catch (parseError) {
      console.error('❌ JSON parse hatası:', parseError);
      return null;
    }
  }
};