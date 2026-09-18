import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNotificationStore } from '../notificationStore'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('notification storage privacy', () => {
  it('keeps account reminder identifiers in memory only', async () => {
    useNotificationStore.getState().setPlanningReminderId('private-account-reminder')
    const persisted = await AsyncStorage.getItem('notification-storage')
    expect(persisted).not.toContain('private-account-reminder')
    expect(JSON.parse(persisted!).state).toEqual({ permissionStatus: 'undetermined' })
  })

  it('discards legacy reminder identifiers during hydration', async () => {
    await AsyncStorage.setItem(
      'notification-storage',
      JSON.stringify({
        version: 0,
        state: { planningReminderId: 'old-account-reminder', permissionStatus: 'granted' },
      }),
    )
    await useNotificationStore.persist.rehydrate()
    expect(useNotificationStore.getState().planningReminderId).toBeNull()
    expect(await AsyncStorage.getItem('notification-storage')).not.toContain('old-account-reminder')
  })
})
