import { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  process.env.EXPO_ROUTER_APP_ROOT = 'src/app';

  return {
    ...config,
    ...appJson.expo
  } as ExpoConfig;
};
