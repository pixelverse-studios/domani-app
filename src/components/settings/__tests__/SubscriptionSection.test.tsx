import React from 'react'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { SubscriptionSection } from '../SubscriptionSection'

const defaultHandlers = {
  onStartTrial: jest.fn(),
  onRestore: jest.fn(),
  onSyncAccess: jest.fn(),
  onRedeemPromoCode: jest.fn(),
  onOpenRedeemCode: jest.fn(),
  onUpgrade: jest.fn(),
  onOpenPurchaseHelp: jest.fn(),
}

function renderSubscriptionSection(
  overrides: Partial<React.ComponentProps<typeof SubscriptionSection>> = {},
) {
  const handlers = {
    ...defaultHandlers,
    onStartTrial: jest.fn(),
    onRestore: jest.fn(),
    onSyncAccess: jest.fn(),
    onRedeemPromoCode: jest.fn(),
    onOpenRedeemCode: jest.fn(),
    onUpgrade: jest.fn(),
    onOpenPurchaseHelp: jest.fn(),
  }

  renderWithProviders(
    <SubscriptionSection
      isLoading={false}
      status="expired"
      isStartingTrial={false}
      isRestoring={false}
      isSyncingAccess={false}
      isRedeemingPromoCode={false}
      accessSyncPhase="idle"
      accessSyncAttempt={null}
      trialDaysRemaining={null}
      trialExpirationDate={null}
      graceDaysRemaining={null}
      graceExpirationDate={null}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

describe('SubscriptionSection promo recovery states', () => {
  it('renders verification-failed promo context and recovery actions', () => {
    const handlers = renderSubscriptionSection({
      accessSyncPhase: 'verification_failed',
      accessSyncAttempt: {
        promoCode: 'SAVE50',
        campaignId: 'campaign-1',
        promoOutcome: 'discounted',
        priceString: '$17.49',
      },
    })

    expect(screen.getByText('Verification Failed')).toBeTruthy()
    expect(screen.getByText('Code: SAVE50')).toBeTruthy()
    expect(screen.getByText('Campaign: campaign-1')).toBeTruthy()
    expect(screen.getByText('Outcome: Discounted access')).toBeTruthy()
    expect(screen.getByText('Price: $17.49')).toBeTruthy()

    fireEvent.press(screen.getByText('Retry Sync'))
    fireEvent.press(screen.getAllByText('Restore Purchases')[0])
    fireEvent.press(screen.getByText('Try Different Code'))
    fireEvent.press(screen.getByText('Contact Support'))

    expect(handlers.onSyncAccess).toHaveBeenCalledTimes(1)
    expect(handlers.onRestore).toHaveBeenCalledTimes(1)
    expect(handlers.onRedeemPromoCode).toHaveBeenCalledTimes(1)
    expect(handlers.onOpenPurchaseHelp).toHaveBeenCalledTimes(1)
  })

  it('shows sync access CTA after native confirmation is attempted', () => {
    const handlers = renderSubscriptionSection({
      accessSyncPhase: 'os_confirmation_attempted',
      accessSyncAttempt: {
        promoCode: 'SAVE100',
        campaignId: 'campaign-free',
        promoOutcome: 'free',
      },
    })

    fireEvent.press(screen.getByText('Sync Access'))

    expect(handlers.onSyncAccess).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Verification Failed')).toBeNull()
  })
})
