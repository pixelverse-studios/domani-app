import React from 'react'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { PaywallModal } from '../PaywallModal'

const onPurchase = jest.fn().mockResolvedValue(null)
const onRestore = jest.fn().mockResolvedValue(null)

function renderPaywall(offerings: PurchasesOffering | null, offeringIdentifier = 'early_adopter') {
  renderWithProviders(
    <PaywallModal
      visible
      onClose={jest.fn()}
      offerings={offerings}
      offeringIdentifier={offeringIdentifier}
      isPurchasing={false}
      isRestoring={false}
      onPurchase={onPurchase}
      onRestore={onRestore}
    />,
  )
}

describe('PaywallModal offer availability', () => {
  beforeEach(() => {
    onPurchase.mockClear()
    onRestore.mockClear()
  })

  it('disables purchase and displays no price when the selected offer is unavailable', () => {
    renderPaywall(null)

    const purchaseButton = screen.getByRole('button', { name: 'Get Lifetime Access' })
    expect(purchaseButton).toBeDisabled()
    fireEvent.press(purchaseButton)
    expect(onPurchase).not.toHaveBeenCalled()
    expect(screen.queryByText(/\$9\.99|\$34\.99/)).toBeNull()
  })

  it('shows the selected store price and purchases its package when available', () => {
    const selectedPackage = {
      packageType: 'LIFETIME',
      product: { identifier: 'domani_lifetime_early', priceString: '$9.99' },
    } as PurchasesPackage
    renderPaywall({
      identifier: 'early_adopter',
      availablePackages: [selectedPackage],
    } as PurchasesOffering)

    const purchaseButton = screen.getByRole('button', {
      name: 'Get Lifetime Access — $9.99',
    })
    expect(purchaseButton).toBeEnabled()
    fireEvent.press(purchaseButton)
    expect(onPurchase).toHaveBeenCalledWith(selectedPackage)
  })

  it('selects the standard lifetime product for the general offer', () => {
    const selectedPackage = {
      packageType: 'LIFETIME',
      product: { identifier: 'domani_lifetime', priceString: '$34.99' },
    } as PurchasesPackage
    renderPaywall(
      { identifier: 'general', availablePackages: [selectedPackage] } as PurchasesOffering,
      'general',
    )

    fireEvent.press(screen.getByRole('button', { name: 'Get Lifetime Access — $34.99' }))
    expect(onPurchase).toHaveBeenCalledWith(selectedPackage)
  })

  it('disables purchase when the selected package has no localized store price', () => {
    const selectedPackage = {
      packageType: 'LIFETIME',
      product: { identifier: 'domani_lifetime_early', priceString: '' },
    } as PurchasesPackage
    renderPaywall({
      identifier: 'early_adopter',
      availablePackages: [selectedPackage],
    } as PurchasesOffering)

    expect(screen.getByRole('button', { name: 'Get Lifetime Access' })).toBeDisabled()
    expect(onPurchase).not.toHaveBeenCalled()
  })

  it.each([
    ['wrong product', 'LIFETIME', 'domani_lifetime'],
    ['wrong package type', 'MONTHLY', 'domani_lifetime_early'],
  ])('disables purchase for a %s in the verified offer', (_reason, packageType, productId) => {
    const selectedPackage = {
      packageType,
      product: { identifier: productId, priceString: '$9.99' },
    } as PurchasesPackage
    renderPaywall({
      identifier: 'early_adopter',
      availablePackages: [selectedPackage],
    } as PurchasesOffering)

    expect(screen.getByRole('button', { name: 'Get Lifetime Access' })).toBeDisabled()
    expect(onPurchase).not.toHaveBeenCalled()
  })
})
