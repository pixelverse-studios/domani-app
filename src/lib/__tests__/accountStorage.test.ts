import AsyncStorage from '@react-native-async-storage/async-storage'
import { accountStorage, clearAccountStorage } from '../accountStorage'
import {
  resetAccountLifecycleCoordinatorForTests,
  runAccountTransition,
  setActiveAccount,
} from '../accountLifecycleCoordinator'

jest.mock('../analyticsStorage', () => ({
  clearAccountAnalytics: jest.fn(async () => {}),
}))

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('account storage privacy', () => {
  beforeEach(async () => {
    resetAccountLifecycleCoordinatorForTests()
    await AsyncStorage.clear()
    jest.clearAllMocks()
    setActiveAccount('alice')
  })

  it('isolates reads and removes only outgoing account data plus legacy markers', async () => {
    await accountStorage.setItem('domani_name_prompt_dismissed', 'alice', 'true')
    await AsyncStorage.setItem('domani_name_prompt_dismissed:bob', 'false')
    await AsyncStorage.setItem('rollover_prompted_date', 'legacy')
    await AsyncStorage.setItem('domani-layout-preferences', 'device preference')
    expect(await accountStorage.getItem('domani_name_prompt_dismissed', 'bob')).toBe('false')
    expect(await accountStorage.getItem('domani_name_prompt_dismissed', null)).toBeNull()
    await runAccountTransition('alice', async () => {
      await clearAccountStorage('alice')
      setActiveAccount('bob')
    })
    expect(await accountStorage.getItem('domani_name_prompt_dismissed', 'alice')).toBeNull()
    expect(await accountStorage.getItem('domani_name_prompt_dismissed', 'bob')).toBe('false')
    expect(await AsyncStorage.getItem('rollover_prompted_date')).toBeNull()
    expect(await AsyncStorage.getItem('domani-layout-preferences')).toBe('device preference')
  })

  it('drains a started write, blocks late writes, then clears outgoing data', async () => {
    let finishWrite!: () => void
    const originalSet = AsyncStorage.setItem.bind(AsyncStorage)
    jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(async (key, value) => {
      await new Promise<void>((resolve) => {
        finishWrite = resolve
      })
      await originalSet(key, value)
    })
    const started = accountStorage.setItem('rollover_prompted_date', 'alice', 'today')
    await Promise.resolve()
    await Promise.resolve()
    const transition = runAccountTransition('alice', async () => {
      await clearAccountStorage('alice')
      setActiveAccount('bob')
    })
    const late = accountStorage.setItem('celebration_shown_date', 'alice', 'today')
    finishWrite()
    await Promise.all([started, transition, late])
    await accountStorage.setItem('domani_name_prompt_dismissed', 'alice', 'true')
    expect(await AsyncStorage.getAllKeys()).toEqual([])
  })

  it('propagates cleanup failure so a transition cannot claim success', async () => {
    const error = new Error('storage unavailable')
    jest.spyOn(AsyncStorage, 'multiRemove').mockRejectedValueOnce(error)
    await expect(clearAccountStorage('alice')).rejects.toBe(error)
    await expect(clearAccountStorage('alice')).resolves.toBeUndefined()
  })
})
