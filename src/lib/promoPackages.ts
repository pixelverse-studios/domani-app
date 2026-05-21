import type { PurchasesPackage } from 'react-native-purchases'

import type { ValidPromoCodeResult } from '~/hooks/usePromoCode'

export function findPromoPackage(
  packages: PurchasesPackage[] | undefined,
  offer: ValidPromoCodeResult,
) {
  const packageId = offer.routing.revenueCatPackageId
  const productId = offer.routing.productId

  if (packageId) {
    return packages?.find((pkg) => pkg.identifier === packageId) ?? null
  }

  if (productId) {
    return packages?.find((pkg) => pkg.product.identifier === productId) ?? null
  }

  return null
}
