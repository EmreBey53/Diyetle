export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
};

export const digestStringAsync = jest.fn(async (_algorithm: string, data: string) => {
  // Deterministic fake hash for testing
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
});

export const getRandomBytesAsync = jest.fn(async (length: number) => {
  return new Uint8Array(length).fill(42);
});
