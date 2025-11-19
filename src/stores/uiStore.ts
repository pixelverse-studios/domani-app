import { create } from 'zustand';

interface UIStore {
  showUpgradePrompt: boolean;
  planningDate: Date;
  toggleUpgradePrompt: (show: boolean) => void;
  setPlanningDate: (date: Date) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showUpgradePrompt: false,
  planningDate: new Date(),
  toggleUpgradePrompt: (show) => set({ showUpgradePrompt: show }),
  setPlanningDate: (date) => set({ planningDate: date })
}));
