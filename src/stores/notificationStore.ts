import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

interface NotificationStore {
  // Device-specific notification identifiers (must be local, not in DB)
  planningReminderId: string | null
  executionReminderId: string | null
  // Cached permission status
  permissionStatus: PermissionStatus

  setPlanningReminderId: (id: string | null) => void
  setExecutionReminderId: (id: string | null) => void
  setPermissionStatus: (status: PermissionStatus) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      planningReminderId: null,
      executionReminderId: null,
      permissionStatus: 'undetermined' as PermissionStatus,

      setPlanningReminderId: (id) => set({ planningReminderId: id }),
      setExecutionReminderId: (id) => set({ executionReminderId: id }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
