import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

interface NotificationStore {
  // Device-specific notification identifiers (must be local, not in DB)
  planningReminderId: string | null
  // Note: executionReminderId removed - execution reminders now handled server-side
  // Cached permission status
  permissionStatus: PermissionStatus
  // Flag to track if we've validated IDs after hydration
  hasValidatedIds: boolean
  // Tracks which flow owns the current evening rollover session (session-only, resets on launch)
  eveningRolloverSource: 'notification' | 'app_open' | null

  setPlanningReminderId: (id: string | null) => void
  setPermissionStatus: (status: PermissionStatus) => void
  setHasValidatedIds: (validated: boolean) => void
  setEveningRolloverSource: (source: 'notification' | 'app_open' | null) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      planningReminderId: null,
      permissionStatus: 'undetermined' as PermissionStatus,
      hasValidatedIds: false,
      eveningRolloverSource: null,

      setPlanningReminderId: (id) => set({ planningReminderId: id }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      setHasValidatedIds: (validated) => set({ hasValidatedIds: validated }),
      setEveningRolloverSource: (source) => set({ eveningRolloverSource: source }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // On rehydrate, mark IDs as needing validation
      // The useNotificationObserver hook will handle actual validation
      // by calling cancelAllReminders() before scheduling
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset validation flag on each app launch
          // This ensures we always validate/reschedule notifications
          state.hasValidatedIds = false
          // Reset rollover source on each launch — this is session-only state
          state.eveningRolloverSource = null
        }
      },
    },
  ),
)
