import { PACKAGE_TYPE } from 'react-native-purchases'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

const LIFETIME_PRODUCTS_BY_OFFER: Record<string, string> = {
  early_adopter: 'domani_lifetime_early',
  general: 'domani_lifetime',
}

export function getLifetimePackageForOffer(
  offering: PurchasesOffering | null | undefined,
  offeringIdentifier: string | null | undefined,
): PurchasesPackage | null {
  const expectedProductId = offeringIdentifier
    ? LIFETIME_PRODUCTS_BY_OFFER[offeringIdentifier]
    : null

  if (!expectedProductId || !offering || offering.identifier !== offeringIdentifier) return null

  return (
    offering.availablePackages.find(
      (pkg) =>
        pkg.packageType === PACKAGE_TYPE.LIFETIME && pkg.product.identifier === expectedProductId,
    ) ?? null
  )
}
