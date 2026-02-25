export const PLANNING_PHILOSOPHY = {
  principle: 'Plan tomorrow tonight when calm, execute when it counts',
  planningBenefits: [
    'Reflective mode (not reactive)',
    'Clear-headed decision making',
    'No morning stress or rush',
    'Better prioritization',
  ],
  executionBenefits: [
    'Wake up with clarity',
    'No decision fatigue',
    'Immediate execution mode',
    'Momentum from minute one',
  ],
} as const

export const FREE_TIER_LOGIC = {
  rationale: 'Research shows 3-6 tasks is optimal for daily productivity',
  benefits: [
    'Forces prioritization',
    'Maintains focus',
    'Higher completion rates',
    'Reduces overwhelm',
  ],
  messaging: '3 tasks is enough for what truly matters',
} as const

export interface TierFeatures {
  none: {
    tasksPerDay: 0
    features: string[]
  }
  trialing: {
    tasksPerDay: 'unlimited'
    categories: 'unlimited'
    features: string[]
  }
  lifetime: {
    tasksPerDay: 'unlimited'
    categories: 'unlimited'
    features: string[]
    perks: string[]
  }
}

export const tierFeatures: TierFeatures = {
  none: {
    tasksPerDay: 0,
    features: ['Start a free trial to unlock all features'],
  },
  trialing: {
    tasksPerDay: 'unlimited',
    categories: 'unlimited',
    features: ['Unlimited tasks', 'Advanced analytics', 'Priority support'],
  },
  lifetime: {
    tasksPerDay: 'unlimited',
    categories: 'unlimited',
    features: ['Unlimited tasks', 'Advanced analytics', 'Priority support'],
    perks: ['One-time purchase', 'Founders club access'],
  },
}
