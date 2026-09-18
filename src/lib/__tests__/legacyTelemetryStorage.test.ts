import AsyncStorage from '@react-native-async-storage/async-storage'
import { deleteAsync } from 'expo-file-system/legacy'
import { clearLegacyTelemetryStorage } from '../legacyTelemetryStorage'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  deleteAsync: jest.fn(async () => {}),
}))

describe('legacy telemetry migration', () => {
  it('deletes old identities and queued payloads from both SDK storage backends', async () => {
    await AsyncStorage.setItem('.posthog-rn.json', '{"email":"private"}')
    await clearLegacyTelemetryStorage()
    expect(await AsyncStorage.getItem('.posthog-rn.json')).toBeNull()
    expect(deleteAsync).toHaveBeenCalledWith('file:///documents/.posthog-rn.json', {
      idempotent: true,
    })
    expect(deleteAsync).toHaveBeenCalledWith('file:///documents/.posthog-rn-logs.json', {
      idempotent: true,
    })
  })

  it('does not swallow file deletion failures', async () => {
    jest.mocked(deleteAsync).mockRejectedValueOnce(new Error('cannot remove'))
    await expect(clearLegacyTelemetryStorage()).rejects.toThrow('cannot remove')
  })
})
