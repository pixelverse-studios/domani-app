import { ConfigContext, ExpoConfig } from 'expo/config'
import appJson from './app.json'

export default ({ config }: ConfigContext): ExpoConfig => {
  process.env.EXPO_ROUTER_APP_ROOT = 'src/app'

  return {
    ...config,
    ...appJson.expo,
    // iOS 16+ automatic light/dark mode icon switching
    ios: {
      ...appJson.expo.ios,
      icon: {
        light: './assets/icon-light.png',
        dark: './assets/icon-dark.png',
      },
    },
  } as ExpoConfig
}
