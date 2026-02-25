import { EncryptionService } from '../src/services/encryptionService';
import * as SecureStore from '../__mocks__/expo-secure-store';

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore._reset();
});

describe('EncryptionService.secureStore & secureRetrieve', () => {
  it('değer kaydeder ve geri okur', async () => {
    await EncryptionService.secureStore('test_key', 'test_value');
    const result = await EncryptionService.secureRetrieve('test_key');
    expect(result).toBe('test_value');
  });

  it('olmayan key için null döner', async () => {
    const result = await EncryptionService.secureRetrieve('nonexistent_key');
    expect(result).toBeNull();
  });

  it('JSON verisi kaydedip okuyabilir', async () => {
    const session = { uid: 'user123', role: 'patient', email: 'test@test.com' };
    await EncryptionService.secureStore('user_session', JSON.stringify(session));
    const raw = await EncryptionService.secureRetrieve('user_session');
    expect(JSON.parse(raw!)).toEqual(session);
  });
});

describe('EncryptionService.secureDelete', () => {
  it('kaydedilen değeri siler', async () => {
    await EncryptionService.secureStore('delete_me', 'value');
    await EncryptionService.secureDelete('delete_me');
    const result = await EncryptionService.secureRetrieve('delete_me');
    expect(result).toBeNull();
  });

  it('olmayan key silinirken hata fırlatmaz', async () => {
    await expect(EncryptionService.secureDelete('not_existing')).resolves.not.toThrow();
  });
});

describe('EncryptionService.generateToken', () => {
  it('varsayılan 32 karakter token üretir', async () => {
    const token = await EncryptionService.generateToken();
    expect(token).toHaveLength(32);
  });

  it('farklı uzunlukta token üretir', async () => {
    const token = await EncryptionService.generateToken(16);
    expect(token).toHaveLength(16);
  });

  it('sadece alfanümerik karakterler içerir', async () => {
    const token = await EncryptionService.generateToken(64);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('encryptionService kaynak kodunda btoa/Math.random() yoktur', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../src/services/encryptionService.ts'),
      'utf-8'
    );
    expect(content).not.toContain('btoa(');
    expect(content).not.toContain('atob(');
    expect(content).not.toContain('Math.random()');
  });
});

describe('EncryptionService.hash', () => {
  it('string için hash üretir', async () => {
    const hash = await EncryptionService.hash('test_password');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('aynı input için aynı hash üretir (deterministik)', async () => {
    const hash1 = await EncryptionService.hash('same_input');
    const hash2 = await EncryptionService.hash('same_input');
    expect(hash1).toBe(hash2);
  });

  it('farklı inputlar farklı hash üretir', async () => {
    const hash1 = await EncryptionService.hash('input_a');
    const hash2 = await EncryptionService.hash('input_b');
    expect(hash1).not.toBe(hash2);
  });

  it('boş string de hash üretir', async () => {
    const hash = await EncryptionService.hash('');
    expect(typeof hash).toBe('string');
  });
});
