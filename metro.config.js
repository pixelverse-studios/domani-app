process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
// TODO: Re-enable once Sentry Metro serializer issue is fixed
// const { withSentryConfig } = require('@sentry/react-native/metro')

const config = getDefaultConfig(__dirname)

// Apply NativeWind
const nativeWindConfig = withNativeWind(config, {
  input: './global.css',
  cliCommand: 'node ./node_modules/tailwindcss/lib/cli.js',
})

// TODO: Re-enable Sentry Metro wrapper once serializer issue is resolved
// module.exports = withSentryConfig(nativeWindConfig)
module.exports = nativeWindConfig
