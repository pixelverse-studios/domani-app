import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

interface NotificationStore {
  // Device-specific notification identifier (must be local, not in DB)
  eveningReminderId: string | null
  // Cached permission status
  permissionStatus: PermissionStatus

  setEveningReminderId: (id: string | null) => void
  setPermissionStatus: (status: PermissionStatus) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      eveningReminderId: null,
      permissionStatus: 'undetermined' as PermissionStatus,

      setEveningReminderId: (id) => set({ eveningReminderId: id }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
