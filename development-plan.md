# Domani Development Plan

This file previously contained the original recurring-plan blueprint. That model is obsolete.

## Current Access Model

Domani does not support ongoing unpaid access or recurring paid subscription plans.

Users are expected to be in one of these states:

- `none`: no active app access
- `trialing`: active 14-day trial access
- `lifetime`: paid or granted lifetime access
- `refunded`: lifetime access revoked after refund

Trialing and lifetime users should receive the full app experience. Inactive users should be guided to start a trial or purchase lifetime access.

## Current Monetization

- RevenueCat is used for lifetime purchase products and entitlement checks.
- Production entitlement: `Domani Lifetime`
- Staging entitlement: `Domani Staging Lifetime`
- There are no monthly or annual subscription products in the supported model.

## Planning Philosophy

Domani still emphasizes focused daily planning: plan tomorrow tonight, choose the most important work, and execute with less morning decision fatigue.

Focused planning is a product philosophy, not a tier limit. Do not add task, category, or feature restrictions based on an old access split.

## Source Of Truth

Use the current code, Supabase migrations, RevenueCat configuration, and living docs for implementation details. Historical migrations may mention older concepts because they document the schema evolution; do not use those historical references as current product requirements.
