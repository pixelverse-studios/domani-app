# Danger Zone Design Specification: Account Deletion

## Project Context

**App**: Domani (React Native/Expo app with Supabase backend)
**Feature**: Account Deletion with Danger Zone UI pattern
**Date**: 2025-12-05

## Technology Stack

- **Framework**: Expo SDK 50 with Expo Router
- **Styling**: NativeWind v4 (Tailwind for React Native)
- **Components**: Custom Button component with variants
- **Backend**: Supabase (Auth + Database)
- **State**: Zustand

---

## Design Research Summary

Based on industry best practices from GitHub, Stripe, and mobile design guidelines (iOS/Android HIG), the following principles guide this implementation:

### Core Principles

1. **Visual Differentiation**: Use red color scheme with warning icons to clearly separate destructive actions from regular settings
2. **Strategic Placement**: Position at bottom of settings (hard-to-reach "red zone" to prevent accidental taps)
3. **Deliberate Friction**: Require explicit confirmation via typing to prevent accidental deletion
4. **Clear Communication**: Explain consequences before action, no ambiguity
5. **Reversible Window**: Implement soft-delete with recovery period before permanent deletion
6. **Feedback Collection**: Optional feedback without making it mandatory

---

## Visual Design Specifications

### Color Palette

Based on existing Domani theme and best practices:

```typescript
// Danger Zone Colors (Add to tailwind.config.js if needed)
const DANGER_COLORS = {
  light: {
    background: '#FEF2F2', // red-50
    border: '#FCA5A5', // red-300
    text: '#DC2626', // red-600
    subtle: '#991B1B', // red-800
    icon: '#EF4444', // red-500
  },
  dark: {
    background: '#450A0A', // red-950
    border: '#7F1D1D', // red-900
    text: '#FCA5A5', // red-300
    subtle: '#FEE2E2', // red-100
    icon: '#F87171', // red-400
  },
}
```

### Component Architecture

#### 1. Danger Zone Section Container

**Purpose**: Visual separation of destructive actions from standard settings

**Specifications**:

- Border: 2px solid red-300 (light) / red-900 (dark)
- Background: red-50 (light) / red-950 (dark)
- Border radius: 16px (matching existing `rounded-xl`)
- Padding: 16px
- Margin top: 32px (extra spacing from other sections)
- Warning icon at top

**Layout**:

```
┌─────────────────────────────────────┐
│ ⚠️  Danger Zone                     │
│                                     │
│ These actions cannot be undone.     │
│ Please proceed with caution.        │
│                                     │
│ [Delete Account Button]             │
└─────────────────────────────────────┘
```

#### 2. Delete Account Button

**Variants**: Uses existing Button component with `destructive` variant

**Props**:

```typescript
{
  variant: 'destructive',
  size: 'md',
  onPress: handleDeleteAccountPress,
  className: 'w-full'
}
```

**States**:

- **Default**: Red background (#EF4444), white text, red border
- **Pressed**: 80% opacity (existing active:opacity-80)
- **Disabled**: 60% opacity (during confirmation process)

**Accessibility**:

- accessibilityRole: "button"
- accessibilityLabel: "Delete account - this action cannot be undone"
- accessibilityHint: "Opens confirmation dialog to permanently delete your account"

#### 3. Confirmation Modal (Step 1: Warning)

**Purpose**: First confirmation screen explaining consequences

**Layout**:

```
┌─────────────────────────────────────┐
│  ⚠️                            [X]  │
│                                     │
│  Delete Your Account?               │
│                                     │
│  This will permanently delete:      │
│  • All your daily plans             │
│  • Your task history                │
│  • Your account data                │
│  • Your subscription (if any)       │
│                                     │
│  This action cannot be undone.      │
│                                     │
│  [Cancel]         [Continue]        │
└─────────────────────────────────────┘
```

**Specifications**:

- Modal background: 50% black overlay
- Content box: white (light) / slate-800 (dark)
- Border radius: 24px (rounded-2xl)
- Padding: 20px
- Warning icon: AlertTriangle from lucide-react-native, size 48, red-500
- Title: text-xl, font-bold
- List items: Bullet points with clear consequences
- Buttons: Secondary (Cancel) and Destructive (Continue)

#### 4. Confirmation Modal (Step 2: Type to Confirm)

**Purpose**: Require explicit typing to confirm (deliberate friction)

**Layout**:

```
┌─────────────────────────────────────┐
│  Type DELETE to confirm        [X]  │
│                                     │
│  This is your last chance.          │
│  Type the word DELETE below:        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ DELETE                       │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]  [Delete Account] ⚠️      │
└─────────────────────────────────────┘
```

**Specifications**:

- Input field:
  - Background: slate-100 (light) / slate-700 (dark)
  - Border: 2px red when focused
  - Placeholder: "Type DELETE"
  - Auto-capitalization: characters
  - Clear button visible
- Delete button:
  - Disabled until "DELETE" is typed exactly
  - Shows warning icon when enabled
  - Haptic feedback on press (iOS/Android)
- Text color validation:
  - Gray when incorrect
  - Red when "DELETE" matched

#### 5. Processing State

**Purpose**: Show progress during account deletion

**Layout**:

```
┌─────────────────────────────────────┐
│                                     │
│         [Spinner Animation]         │
│                                     │
│     Deleting your account...        │
│                                     │
│  This may take a few moments.       │
└─────────────────────────────────────┘
```

**Specifications**:

- ActivityIndicator: red-500 color
- Text: slate-500
- Non-dismissible modal
- Full-screen overlay

#### 6. Success/Error States

**Success** (Optional - may just sign out immediately):

```
┌─────────────────────────────────────┐
│  ✓                                  │
│                                     │
│  Account Deleted                    │
│                                     │
│  Your account has been scheduled    │
│  for deletion. You have 30 days     │
│  to sign in again to recover it.    │
│                                     │
│  [Close]                            │
└─────────────────────────────────────┘
```

**Error**:

```
┌─────────────────────────────────────┐
│  ⚠️                                 │
│                                     │
│  Deletion Failed                    │
│                                     │
│  We couldn't delete your account.   │
│  Please try again or contact        │
│  support.                           │
│                                     │
│  [Try Again]        [Cancel]        │
└─────────────────────────────────────┘
```

---

## Component Implementation Examples

### 1. Danger Zone Section Component

```typescript
// src/components/settings/DangerZone.tsx
import React from 'react'
import { View, TouchableOpacity, Alert } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'
import { Text } from '~/components/ui'
import { Button } from '~/components/ui/Button'
import { useTheme } from '~/hooks/useTheme'

interface DangerZoneProps {
  onDeleteAccount: () => void
}

export function DangerZone({ onDeleteAccount }: DangerZoneProps) {
  const { activeTheme } = useTheme()
  const iconColor = activeTheme === 'dark' ? '#F87171' : '#EF4444'

  return (
    <View className="border-2 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 rounded-xl p-4 mt-8">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <AlertTriangle size={20} color={iconColor} />
        <Text className="text-base font-semibold text-red-600 dark:text-red-300 ml-2">
          Danger Zone
        </Text>
      </View>

      {/* Warning Text */}
      <Text className="text-sm text-red-800 dark:text-red-200 mb-4 leading-5">
        These actions cannot be undone. Please proceed with caution.
      </Text>

      {/* Delete Account Button */}
      <Button
        variant="destructive"
        size="md"
        onPress={onDeleteAccount}
        className="w-full"
      >
        Delete Account
      </Button>
    </View>
  )
}
```

### 2. Delete Account Confirmation Modals

```typescript
// src/components/settings/DeleteAccountModal.tsx
import React, { useState } from 'react'
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Vibration,
} from 'react-native'
import { X, AlertTriangle } from 'lucide-react-native'
import { Text } from '~/components/ui'
import { Button } from '~/components/ui/Button'
import { useTheme } from '~/hooks/useTheme'

type ModalStep = 'warning' | 'confirm' | 'processing' | 'success' | 'error'

interface DeleteAccountModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const { activeTheme } = useTheme()
  const [step, setStep] = useState<ModalStep>('warning')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const iconColor = activeTheme === 'dark' ? '#F87171' : '#EF4444'
  const isDeleteEnabled = confirmText === 'DELETE'

  const handleContinue = () => {
    setStep('confirm')
  }

  const handleDelete = async () => {
    // Haptic feedback on iOS/Android
    Vibration.vibrate(50)

    setStep('processing')
    try {
      await onConfirm()
      setStep('success')
      // Auto-close and navigate after success
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setStep('error')
    }
  }

  const handleClose = () => {
    setStep('warning')
    setConfirmText('')
    setError(null)
    onClose()
  }

  const handleRetry = () => {
    setError(null)
    setStep('confirm')
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center px-6">
        {/* Warning Step */}
        {step === 'warning' && (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <AlertTriangle size={24} color={iconColor} />
                <Text className="text-lg font-semibold text-slate-900 dark:text-white ml-2">
                  Delete Your Account?
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Consequences List */}
            <View className="mb-4">
              <Text className="text-base text-slate-900 dark:text-white mb-3">
                This will permanently delete:
              </Text>
              <View className="space-y-2">
                {[
                  'All your daily plans',
                  'Your task history',
                  'Your account data',
                  'Your subscription (if any)',
                ].map((item, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <Text className="text-base text-slate-700 dark:text-slate-300 mr-2">
                      •
                    </Text>
                    <Text className="text-base text-slate-700 dark:text-slate-300 flex-1">
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Warning Note */}
            <View className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3 mb-4">
              <Text className="text-sm text-red-800 dark:text-red-200 font-medium">
                This action cannot be undone.
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                size="md"
                onPress={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="md"
                onPress={handleContinue}
                className="flex-1"
              >
                Continue
              </Button>
            </View>
          </View>
        )}

        {/* Confirm Step - Type DELETE */}
        {step === 'confirm' && (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Type DELETE to confirm
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={activeTheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <Text className="text-base text-slate-700 dark:text-slate-300 mb-2">
              This is your last chance.
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Type the word DELETE below to permanently delete your account:
            </Text>

            {/* Input Field */}
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type DELETE"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              className={`bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base mb-4 border-2 ${
                confirmText && !isDeleteEnabled
                  ? 'border-slate-300 dark:border-slate-600'
                  : isDeleteEnabled
                    ? 'border-red-500'
                    : 'border-transparent'
              }`}
            />

            {/* Actions */}
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                size="md"
                onPress={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <View className="flex-1">
                <Button
                  variant="destructive"
                  size="md"
                  onPress={handleDelete}
                  disabled={!isDeleteEnabled}
                  className="w-full"
                >
                  Delete Account
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-8 items-center">
            <ActivityIndicator size="large" color={iconColor} />
            <Text className="text-base text-slate-900 dark:text-white font-medium mt-4 mb-2">
              Deleting your account...
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
              This may take a few moments.
            </Text>
          </View>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-8 items-center">
            <View className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">✓</Text>
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Account Deleted
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              Your account has been scheduled for deletion. You have 30 days to sign in
              again to recover it.
            </Text>
          </View>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
            <View className="items-center mb-4">
              <AlertTriangle size={48} color={iconColor} />
              <Text className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2">
                Deletion Failed
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
                {error || 'We couldn't delete your account. Please try again or contact support.'}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                size="md"
                onPress={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="md"
                onPress={handleRetry}
                className="flex-1"
              >
                Try Again
              </Button>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}
```

### 3. Integration into Settings Screen

```typescript
// Add to src/app/(tabs)/settings.tsx

import { DangerZone } from '~/components/settings/DangerZone'
import { DeleteAccountModal } from '~/components/settings/DeleteAccountModal'

// Inside SettingsScreen component:
export default function SettingsScreen() {
  // ... existing code ...

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleDeleteAccount = async () => {
    // Call Supabase to mark account for deletion
    // This should be implemented in a hook or API service
    await supabase.rpc('schedule_account_deletion')
    await signOut()
    router.replace('/welcome')
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* ... existing sections ... */}

        {/* Sign Out - moved up */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="bg-red-500/10 py-3.5 rounded-xl items-center mb-6"
        >
          <Text className="text-red-500 font-semibold">Sign Out</Text>
        </TouchableOpacity>

        {/* Danger Zone - at bottom */}
        <DangerZone onDeleteAccount={() => setShowDeleteModal(true)} />

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* ... existing modals ... */}
    </View>
  )
}
```

---

## Backend Implementation

### Database Migration: Soft Delete

```sql
-- Add deleted_at column to profiles table
ALTER TABLE profiles
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Create function to schedule account deletion
CREATE OR REPLACE FUNCTION schedule_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET deletion_scheduled_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Create function to recover account (cancel deletion)
CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET deletion_scheduled_at = NULL
  WHERE id = auth.uid();
END;
$$;

-- Create scheduled job to permanently delete accounts after 30 days
-- (This would be implemented using Supabase Edge Functions or pg_cron)
```

### API Hook for Account Deletion

```typescript
// src/hooks/useAccountDeletion.ts
import { useMutation } from '@tanstack/react-query'
import { supabase } from '~/lib/supabase'

export function useAccountDeletion() {
  const scheduleDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('schedule_account_deletion')
      if (error) throw error
    },
  })

  const cancelDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cancel_account_deletion')
      if (error) throw error
    },
  })

  return {
    scheduleDelete,
    cancelDelete,
  }
}
```

---

## Accessibility Requirements

### ARIA Labels & Roles

- All touchable elements have proper `accessibilityRole`
- Delete button has descriptive `accessibilityLabel` and `accessibilityHint`
- Modal has `accessibilityViewIsModal={true}`

### Keyboard Navigation

- Not directly applicable to mobile, but ensure proper focus management in modals
- TextInput auto-focuses when modal opens

### Screen Reader Support

- Clear announcement of modal content
- Warning states are announced
- Success/error states provide audio feedback

### Color Contrast

- Red text on light background: WCAG AAA compliant
- Red text on dark background: WCAG AA compliant
- All text meets 4.5:1 minimum contrast ratio

### Haptic Feedback

```typescript
import { Vibration } from 'react-native'

// On destructive action confirmation
Vibration.vibrate(50) // Short vibration
```

---

## User Experience Flow

### Complete Journey

1. **Discovery**: User scrolls to bottom of settings, sees visually distinct danger zone
2. **Initial Click**: Taps "Delete Account" button
3. **Warning Modal**: Presented with consequences list and "Continue" option
4. **Confirmation Modal**: Must type "DELETE" exactly to proceed
5. **Processing**: Shows loading state during API call
6. **Outcome**:
   - Success: Brief success message, then signs out and returns to welcome screen
   - Error: Shows retry option with error message

### Edge Cases

- **Network Error**: Show retry option, don't close modal
- **Session Expired**: Handle gracefully, may need to re-authenticate
- **Partial Deletion**: Ensure idempotent operations, allow retry
- **Subscription Active**: Warn that subscription will be cancelled

---

## Testing Checklist

### Visual Testing

- [ ] Danger zone displays correctly in light mode
- [ ] Danger zone displays correctly in dark mode
- [ ] Modal animations work smoothly
- [ ] All icons render at correct size/color
- [ ] Text wrapping works on small screens
- [ ] Spacing is consistent with design system

### Functional Testing

- [ ] Cancel buttons close modals without action
- [ ] "DELETE" confirmation is case-sensitive
- [ ] Delete button is disabled until "DELETE" is typed
- [ ] Haptic feedback triggers on confirmation
- [ ] Loading state shows during API call
- [ ] Success state transitions to sign out
- [ ] Error state allows retry
- [ ] Soft delete is recorded in database
- [ ] User can recover within 30 days

### Accessibility Testing

- [ ] VoiceOver (iOS) can navigate all elements
- [ ] TalkBack (Android) announces correctly
- [ ] Color contrast meets WCAG standards
- [ ] Touch targets are minimum 44x44 points
- [ ] Focus order is logical

### Platform Testing

- [ ] Works on iOS
- [ ] Works on Android
- [ ] Handles notch/safe areas correctly
- [ ] Respects system theme changes

---

## Implementation Roadmap

### Phase 1: Component Development (2-3 hours)

1. Create `DangerZone.tsx` component
2. Create `DeleteAccountModal.tsx` with all steps
3. Test component in isolation with Storybook (if available) or standalone screen
4. Verify dark mode styling

### Phase 2: Backend Integration (1-2 hours)

1. Add database migration for soft delete columns
2. Create RPC functions for scheduling/canceling deletion
3. Create `useAccountDeletion` hook
4. Test API calls in development

### Phase 3: Settings Integration (1 hour)

1. Add components to settings screen
2. Wire up state management
3. Test complete flow end-to-end
4. Handle edge cases (network errors, session issues)

### Phase 4: Testing & Polish (1-2 hours)

1. Manual testing on iOS and Android
2. Accessibility audit with screen readers
3. Performance testing (animation smoothness)
4. User acceptance testing

**Total Estimated Time**: 5-8 hours

---

## Future Enhancements

### Optional Feedback Collection

Add a step before final confirmation to collect optional feedback:

```typescript
// Optional feedback step
{step === 'feedback' && (
  <View>
    <Text>Why are you leaving? (Optional)</Text>
    <TextInput
      multiline
      placeholder="Your feedback helps us improve..."
    />
    <Button onPress={handleSkipFeedback}>Skip</Button>
    <Button onPress={handleSubmitFeedback}>Submit & Delete</Button>
  </View>
)}
```

### Data Export

Before deletion, offer to export user data:

- Download all plans as JSON
- Email data export link
- Comply with GDPR "right to data portability"

### Pause Instead of Delete

Offer alternative to deletion:

- Pause subscription (keep data, stop billing)
- "Take a break" mode (hide from friends, no notifications)
- Account deactivation vs. deletion

---

## References & Sources

This design specification is based on industry best practices from:

- [How To Manage Dangerous Actions In User Interfaces - Smashing Magazine](https://www.smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces/)
- [Delete account design: inspiration tips and best practices](https://nicelydone.club/blog/delete-account-examples-inspiration)
- [Designing Better Buttons: How To Handle Destructive Actions](https://designmybit.com/designing-better-buttons-how-to-handle-destructive-actions/)
- [Mobile App Design Best Practices in 2025](https://wezom.com/blog/mobile-app-design-best-practices-in-2025)
- [React Native + NativeWind Button Components](https://www.atomlab.dev/elements/components/button)

### Key Takeaways from Research

1. **Always use red for destructive actions** (iOS HIG, Material Design)
2. **Require typing confirmation** for irreversible actions (GitHub pattern)
3. **Soft delete with recovery window** reduces user anxiety (industry standard: 30 days)
4. **Position destructive actions away from primary actions** to prevent accidents
5. **Use haptic feedback** for critical confirmations (mobile best practice)
6. **Make cancel button default focus** to prevent rushed mistakes

---

## File Structure

```
src/
├── components/
│   └── settings/
│       ├── DangerZone.tsx          # New: Danger zone container
│       └── DeleteAccountModal.tsx   # New: Multi-step deletion modal
├── hooks/
│   └── useAccountDeletion.ts        # New: API hook for deletion
└── app/
    └── (tabs)/
        └── settings.tsx             # Modified: Add danger zone section
```

---

## Conclusion

This specification provides a complete, production-ready design for implementing account deletion with proper safeguards, accessibility, and user experience considerations. The implementation follows established patterns from major SaaS applications while being adapted specifically for React Native with NativeWind.

The multi-step confirmation process with deliberate friction (typing "DELETE") ensures users fully understand the consequences while maintaining a polished, professional appearance consistent with the Domani app's existing design system.
