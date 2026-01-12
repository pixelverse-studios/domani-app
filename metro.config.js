process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const { withSentryConfig } = require('@sentry/react-native/metro')

const config = getDefaultConfig(__dirname)

// Apply NativeWind first, then Sentry
const nativeWindConfig = withNativeWind(config, {
  input: './global.css',
  cliCommand: 'node ./node_modules/tailwindcss/lib/cli.js',
})

module.exports = withSentryConfig(nativeWindConfig)
