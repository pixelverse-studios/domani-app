module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)', '**/?(*.)+(test|spec).(ts|tsx|js)'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-.*|@expo/.*|@sentry/react-native|nativewind|react-native-css-interop|react-native-fbsdk-next|react-native-reanimated|react-native-svg|lucide-react-native)/)',
  ],
}
