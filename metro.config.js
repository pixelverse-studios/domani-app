process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, {
  input: './global.css',
  cliCommand: 'node ./node_modules/tailwindcss/lib/cli.js',
})
