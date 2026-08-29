require('react-native-gesture-handler/jestSetup')

jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const { View } = require('react-native')

  const passthrough = (value) => value
  const chainableAnimation = {
    delay: () => chainableAnimation,
    duration: () => chainableAnimation,
    springify: () => chainableAnimation,
  }

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
    },
    Easing: {
      ease: jest.fn(),
      out: jest.fn(passthrough),
    },
    FadeIn: chainableAnimation,
    FadeOut: chainableAnimation,
    interpolate: jest.fn((value) => value),
    interpolateColor: jest.fn((_value, _input, output) => output[0]),
    runOnJS: jest.fn((fn) => fn),
    useAnimatedStyle: jest.fn((callback) => callback()),
    useDerivedValue: jest.fn((callback) => ({ value: callback() })),
    useSharedValue: jest.fn((value) => ({ value })),
    withDelay: jest.fn((_delay, value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withSpring: jest.fn(passthrough),
    withTiming: jest.fn(passthrough),
  }
})

global.__reanimatedWorkletInit = jest.fn()

jest.doMock('nativewind', () => {
  const actual = jest.requireActual('nativewind')

  return {
    ...actual,
    useColorScheme: jest.fn(() => ({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    })),
  }
})

jest.doMock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-US', languageCode: 'en' }]),
}))

jest.doMock('expo-router', () => ({
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: {
    Screen: 'Stack.Screen',
  },
  Tabs: {
    Screen: 'Tabs.Screen',
  },
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    dismissAll: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn((callback) => callback()),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    dismissAll: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
}))

jest.doMock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

const createSupabaseQueryMock = () => {
  const query = {
    select: jest.fn(() => query),
    insert: jest.fn(() => query),
    update: jest.fn(() => query),
    upsert: jest.fn(() => query),
    delete: jest.fn(() => query),
    eq: jest.fn(() => query),
    neq: jest.fn(() => query),
    in: jest.fn(() => query),
    is: jest.fn(() => query),
    gte: jest.fn(() => query),
    lte: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    then: jest.fn((resolve) => resolve({ data: null, error: null })),
  }

  return query
}

jest.doMock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      setSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithIdToken: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
    functions: {
      invoke: jest.fn(() =>
        Promise.resolve({ data: { status: 'synced', accessGranted: true }, error: null }),
      ),
    },
    from: jest.fn(() => createSupabaseQueryMock()),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
  sendAccountEmail: jest.fn(() => Promise.resolve({ ok: true })),
}))

jest.doMock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 'default', HIGH: 'high' },
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  getNotificationSettingsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-test-id')),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
}))

jest.doMock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    beginRefundRequestForActiveEntitlement: jest.fn(() => Promise.resolve(null)),
    collectDeviceIdentifiers: jest.fn(),
    configure: jest.fn(() => Promise.resolve()),
    isConfigured: jest.fn(() => Promise.resolve(false)),
    getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    logIn: jest.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
    logOut: jest.fn(() => Promise.resolve()),
    presentCodeRedemptionSheet: jest.fn(() => Promise.resolve()),
    purchasePackage: jest.fn(() =>
      Promise.resolve({ customerInfo: { entitlements: { active: {} } } }),
    ),
    restorePurchases: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    setAttributes: jest.fn(() => Promise.resolve()),
    setDisplayName: jest.fn(() => Promise.resolve()),
    setEmail: jest.fn(() => Promise.resolve()),
    setLogLevel: jest.fn(),
    setPushToken: jest.fn(() => Promise.resolve()),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  PACKAGE_TYPE: {
    ANNUAL: 'ANNUAL',
    LIFETIME: 'LIFETIME',
    MONTHLY: 'MONTHLY',
  },
  PURCHASES_ERROR_CODE: {},
  REFUND_REQUEST_STATUS: {
    SUCCESS: 0,
    USER_CANCELLED: 1,
  },
}))

jest.doMock('posthog-react-native', () => {
  const React = require('react')

  return {
    PostHogProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    usePostHog: jest.fn(() => ({
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      screen: jest.fn(),
    })),
  }
})

jest.doMock('~/providers/AnalyticsProvider', () => {
  const React = require('react')
  const analytics = {
    identify: jest.fn(),
    reset: jest.fn(),
    screen: jest.fn(),
    track: jest.fn(),
  }

  return {
    AnalyticsProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useAnalytics: jest.fn(() => analytics),
  }
})

jest.doMock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  setUser: jest.fn(),
}))

jest.doMock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Error: 'error', Success: 'success', Warning: 'warning' },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}))

jest.doMock('react-native-svg', () => {
  const React = require('react')

  const Element = ({ children }) => React.createElement(React.Fragment, null, children)

  return {
    __esModule: true,
    default: Element,
    Circle: Element,
    ClipPath: Element,
    Defs: Element,
    G: Element,
    LinearGradient: Element,
    Mask: Element,
    Path: Element,
    Rect: Element,
    Stop: Element,
    Text: Element,
  }
})

jest.doMock('lucide-react-native', () => {
  const React = require('react')
  const { View } = require('react-native')

  const Icon = ({ children, ...props }) => React.createElement(View, props, children)

  return new Proxy(
    {
      __esModule: true,
      default: Icon,
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop]
        return Icon
      },
    },
  )
})

jest.doMock('@react-native-masked-view/masked-view', () => {
  const React = require('react')
  const { View } = require('react-native')

  return {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement(View, props, children),
  }
})

beforeEach(() => {
  jest.clearAllMocks()
})
