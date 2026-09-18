module.exports = function (api) {
  const isProduction = api.env('production')
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      ...(isProduction ? ['./plugins/strip-production-console.cjs'] : []),
      'react-native-reanimated/plugin',
    ],
  }
}
