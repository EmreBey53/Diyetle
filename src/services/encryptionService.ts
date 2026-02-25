import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

export class EncryptionService {
  static async secureStore(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  static async secureRetrieve(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  static async secureDelete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
    }
  }

  static async generateToken(length: number = 32): Promise<string> {
    const bytes = await Crypto.getRandomBytesAsync(length);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(bytes)
      .map(b => chars[b % chars.length])
      .join('');
  }

  static async hash(data: string): Promise<string> {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }
}
