import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type PermissionStatus = 'granted' | 'denied' | 'undetermined'
export type EveningRolloverSource = 'notification' | 'app_open'

interface NotificationStore {
  // Device-specific notification identifiers (must be local, not in DB)
  planningReminderId: string | null
  // Note: executionReminderId removed - execution reminders now handled server-side
  // Cached permission status
  permissionStatus: PermissionStatus
  // Flag to track if we've validated IDs after hydration
  hasValidatedIds: boolean
  // Tracks which flow owns the current evening rollover session (session-only, not persisted)
  // null (not undefined) — survives JSON serialization in persist middleware
  eveningRolloverSource: EveningRolloverSource | null
  // Dev-only: incremented to force useEveningRolloverOnAppOpen to reset and re-check
  devRolloverRecheckCounter: number

  setPlanningReminderId: (id: string | null) => void
  setPermissionStatus: (status: PermissionStatus) => void
  setHasValidatedIds: (validated: boolean) => void
  setEveningRolloverSource: (source: EveningRolloverSource | null) => void
  devTriggerRolloverRecheck: () => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      planningReminderId: null,
      permissionStatus: 'undetermined' as PermissionStatus,
      hasValidatedIds: false,
      eveningRolloverSource: null,
      devRolloverRecheckCounter: 0,

      setPlanningReminderId: (id) => set({ planningReminderId: id }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      setHasValidatedIds: (validated) => set({ hasValidatedIds: validated }),
      setEveningRolloverSource: (source) => set({ eveningRolloverSource: source }),
      devTriggerRolloverRecheck: () =>
        set((state) => ({ devRolloverRecheckCounter: state.devRolloverRecheckCounter + 1 })),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist device-level state; session-only fields are excluded
      partialize: (state) => ({
        planningReminderId: state.planningReminderId,
        permissionStatus: state.permissionStatus,
      }),
      // On rehydrate, reset session-only fields to their defaults via setState
      // (safer than direct mutation — uses the public store API)
      // The useNotificationObserver hook will handle actual validation
      // by calling cancelAllReminders() before scheduling
      onRehydrateStorage: () => () => {
        useNotificationStore.setState({
          hasValidatedIds: false,
          eveningRolloverSource: null,
          devRolloverRecheckCounter: 0,
        })
      },
    },
  ),
)
