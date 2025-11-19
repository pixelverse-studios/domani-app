export const PLANNING_PHILOSOPHY = {
  principle: 'Plan tomorrow tonight when calm, execute when it counts',
  eveningBenefits: [
    'Reflective mode (not reactive)',
    'Clear-headed decision making',
    'No morning stress or rush',
    'Better prioritization'
  ],
  morningBenefits: [
    'Wake up with clarity',
    'No decision fatigue',
    'Immediate execution mode',
    'Momentum from minute one'
  ]
} as const;

export const FREE_TIER_LOGIC = {
  rationale: 'Research shows 3-6 tasks is optimal for daily productivity',
  benefits: [
    'Forces prioritization',
    'Maintains focus',
    'Higher completion rates',
    'Reduces overwhelm'
  ],
  messaging: '3 tasks is enough for what truly matters'
} as const;

export interface TierFeatures {
  free: {
    tasksPerDay: number;
    categories: number;
    features: string[];
  };
  premium: {
    tasksPerDay: 'unlimited';
    categories: 'unlimited';
    features: string[];
  };
  lifetime: {
    tasksPerDay: 'unlimited';
    categories: 'unlimited';
    features: string[];
    perks: string[];
  };
}

export const tierFeatures: TierFeatures = {
  free: {
    tasksPerDay: 3,
    categories: 4,
    features: ['Daily planning', 'Task completion tracking', 'Category focus']
  },
  premium: {
    tasksPerDay: 'unlimited',
    categories: 'unlimited',
    features: ['Unlimited tasks', 'Advanced analytics', 'Priority support']
  },
  lifetime: {
    tasksPerDay: 'unlimited',
    categories: 'unlimited',
    features: ['Unlimited tasks', 'Advanced analytics', 'Priority support'],
    perks: ['One-time purchase', 'Founders club access']
  }
};
