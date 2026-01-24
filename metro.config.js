const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Sadece temel polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  stream: 'stream-browserify',
  buffer: '@craftzdog/react-native-buffer',
  'safe-buffer': '@craftzdog/react-native-buffer',
};

module.exports = config;