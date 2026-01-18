// src/services/encryptionService.ts
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY = 'diyetle_secure_key_2024'; // Production'da environment variable olmalı

export class EncryptionService {
  // Hassas verileri şifreleme
  static encrypt(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error('❌ Şifreleme hatası:', error);
      throw error;
    }
  }

  // Şifrelenmiş verileri çözme
  static decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error('❌ Şifre çözme hatası:', error);
      throw error;
    }
  }

  // Güvenli depolama
  static async secureStore(key: string, value: string): Promise<void> {
    try {
      const encrypted = this.encrypt(value);
      await SecureStore.setItemAsync(key, encrypted);
    } catch (error) {
      console.error('❌ Güvenli depolama hatası:', error);
      throw error;
    }
  }

  // Güvenli okuma
  static async secureRetrieve(key: string): Promise<string | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(key);
      if (!encrypted) return null;
      
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('❌ Güvenli okuma hatası:', error);
      return null;
    }
  }

  // Hash oluşturma (şifreler için)
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  // Rastgele token oluşturma
  static generateToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
}

// Hassas veri tipleri için wrapper'lar
export const encryptSensitiveData = (data: any) => {
  const jsonString = JSON.stringify(data);
  return EncryptionService.encrypt(jsonString);
};

export const decryptSensitiveData = (encryptedData: string) => {
  const decrypted = EncryptionService.decrypt(encryptedData);
  return JSON.parse(decrypted);
};