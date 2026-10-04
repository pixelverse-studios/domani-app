import React from 'react'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { PaywallModal } from '../PaywallModal'

const onPurchase = jest.fn().mockResolvedValue(null)
const onRestore = jest.fn().mockResolvedValue(null)

function renderPaywall(offerings: PurchasesOffering | null) {
  renderWithProviders(
    <PaywallModal
      visible
      onClose={jest.fn()}
      offerings={offerings}
      offeringIdentifier="early_adopter"
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
      product: { priceString: '$9.99' },
    } as PurchasesPackage
    renderPaywall({ availablePackages: [selectedPackage] } as PurchasesOffering)

    const purchaseButton = screen.getByRole('button', {
      name: 'Get Lifetime Access — $9.99',
    })
    expect(purchaseButton).toBeEnabled()
    fireEvent.press(purchaseButton)
    expect(onPurchase).toHaveBeenCalledWith(selectedPackage)
  })

  it('disables purchase when the selected package has no localized store price', () => {
    const selectedPackage = {
      packageType: 'LIFETIME',
      product: { priceString: '' },
    } as PurchasesPackage
    renderPaywall({ availablePackages: [selectedPackage] } as PurchasesOffering)

    expect(screen.getByRole('button', { name: 'Get Lifetime Access' })).toBeDisabled()
    expect(onPurchase).not.toHaveBeenCalled()
  })
})
