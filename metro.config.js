process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

const { withNativeWind } = require('nativewind/metro')
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname)

// Apply NativeWind
const nativeWindConfig = withNativeWind(config, {
  input: './global.css',
  cliCommand: 'node ./node_modules/tailwindcss/lib/cli.js',
})

module.exports = nativeWindConfig
