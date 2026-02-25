module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.ts',
    '^expo-crypto$': '<rootDir>/__mocks__/expo-crypto.ts',
    '^../firebaseConfig$': '<rootDir>/__mocks__/firebaseConfig.ts',
    '^../../firebaseConfig$': '<rootDir>/__mocks__/firebaseConfig.ts',
    '^./firebaseConfig$': '<rootDir>/__mocks__/firebaseConfig.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
