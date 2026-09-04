import * as Keychain from 'react-native-keychain'

import { secureStorage } from '../secureStorage'

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
}))

const mockGetGenericPassword = Keychain.getGenericPassword as jest.Mock
const mockResetGenericPassword = Keychain.resetGenericPassword as jest.Mock
const mockSetGenericPassword = Keychain.setGenericPassword as jest.Mock

describe('secureStorage', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns a stored credential value', async () => {
    mockGetGenericPassword.mockResolvedValue({ username: 'session', password: 'secret' })

    await expect(secureStorage.getItem('auth-session')).resolves.toBe('secret')
  })

  it.each([
    ['read', () => secureStorage.getItem('auth-session'), mockGetGenericPassword],
    ['write', () => secureStorage.setItem('auth-session', 'secret'), mockSetGenericPassword],
    ['remove', () => secureStorage.removeItem('auth-session'), mockResetGenericPassword],
  ])('propagates a Keychain %s failure', async (_operation, invoke, keychainMethod) => {
    const failure = new Error('keychain unavailable')
    keychainMethod.mockRejectedValue(failure)

    await expect(invoke()).rejects.toBe(failure)
  })
})
