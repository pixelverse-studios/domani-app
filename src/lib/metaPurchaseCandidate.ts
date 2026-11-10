import AsyncStorage from '@react-native-async-storage/async-storage'

const META_PURCHASE_CANDIDATE_PREFIX = '@domani/meta-purchase-candidate'
const META_PURCHASE_CANDIDATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const PURCHASE_DATE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000

export interface MetaPurchaseCandidate {
  userId: string
  productId: string
  amount: number | null
  currency: string | null
  offer: string | null
  startedAt: string
  baselinePurchaseDate: string | null
  transactionId: string | null
  transactionPurchaseDate: string | null
}

interface MetaPurchaseCandidateInput {
  userId: string
  productId: string
  amount?: number | null
  currency?: string | null
  offer?: string | null
  baselinePurchaseDate?: string | null
}

interface MetaPurchaseTransactionInput {
  transactionId: string
  purchaseDate: string
}

function candidateStorageKey(userId: string) {
  return `${META_PURCHASE_CANDIDATE_PREFIX}:${userId}`
}

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value))
}

function isMetaPurchaseCandidate(value: unknown): value is MetaPurchaseCandidate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<MetaPurchaseCandidate>
  return (
    typeof candidate.userId === 'string' &&
    !!candidate.userId &&
    typeof candidate.productId === 'string' &&
    !!candidate.productId &&
    typeof candidate.startedAt === 'string' &&
    isValidDate(candidate.startedAt) &&
    (candidate.amount === null ||
      (typeof candidate.amount === 'number' &&
        Number.isFinite(candidate.amount) &&
        candidate.amount >= 0)) &&
    (candidate.currency === null || typeof candidate.currency === 'string') &&
    (candidate.offer === null || typeof candidate.offer === 'string') &&
    (candidate.baselinePurchaseDate === null ||
      (typeof candidate.baselinePurchaseDate === 'string' &&
        isValidDate(candidate.baselinePurchaseDate))) &&
    (candidate.transactionId === null || typeof candidate.transactionId === 'string') &&
    (candidate.transactionPurchaseDate === null ||
      (typeof candidate.transactionPurchaseDate === 'string' &&
        isValidDate(candidate.transactionPurchaseDate)))
  )
}

export async function createMetaPurchaseCandidate(
  input: MetaPurchaseCandidateInput,
): Promise<MetaPurchaseCandidate> {
  const candidate: MetaPurchaseCandidate = {
    userId: input.userId,
    productId: input.productId,
    amount:
      typeof input.amount === 'number' && Number.isFinite(input.amount) && input.amount >= 0
        ? input.amount
        : null,
    currency: input.currency?.trim().toUpperCase() || null,
    offer: input.offer ?? null,
    startedAt: new Date().toISOString(),
    baselinePurchaseDate: input.baselinePurchaseDate ?? null,
    transactionId: null,
    transactionPurchaseDate: null,
  }
  await AsyncStorage.setItem(candidateStorageKey(input.userId), JSON.stringify(candidate))
  return candidate
}

export async function recordMetaPurchaseCandidateTransaction(
  candidate: MetaPurchaseCandidate,
  transaction: MetaPurchaseTransactionInput,
) {
  const updatedCandidate: MetaPurchaseCandidate = {
    ...candidate,
    transactionId: transaction.transactionId,
    transactionPurchaseDate: transaction.purchaseDate,
  }
  await AsyncStorage.setItem(
    candidateStorageKey(candidate.userId),
    JSON.stringify(updatedCandidate),
  )
  return updatedCandidate
}

export async function getMetaPurchaseCandidate(userId: string) {
  const serialized = await AsyncStorage.getItem(candidateStorageKey(userId))
  if (!serialized) return null

  try {
    const candidate: unknown = JSON.parse(serialized)
    if (isMetaPurchaseCandidate(candidate) && candidate.userId === userId) return candidate
  } catch {
    // Invalid local state is removed below so it cannot trigger acquisition reporting.
  }

  await clearMetaPurchaseCandidate(userId)
  return null
}

export function clearMetaPurchaseCandidate(userId: string) {
  return AsyncStorage.removeItem(candidateStorageKey(userId))
}

export function isMetaPurchaseCandidateExpired(candidate: MetaPurchaseCandidate, now = Date.now()) {
  return now - Date.parse(candidate.startedAt) > META_PURCHASE_CANDIDATE_MAX_AGE_MS
}

export function candidateMatchesEntitlement(
  candidate: MetaPurchaseCandidate,
  entitlement: {
    productIdentifier?: string | null
    latestPurchaseDate?: string | null
  },
) {
  if (entitlement.productIdentifier !== candidate.productId) return false

  const latestPurchaseDate = entitlement.latestPurchaseDate
  if (!latestPurchaseDate || !isValidDate(latestPurchaseDate)) return false

  if (candidate.transactionPurchaseDate) {
    return (
      Math.abs(Date.parse(latestPurchaseDate) - Date.parse(candidate.transactionPurchaseDate)) <=
      PURCHASE_DATE_CLOCK_TOLERANCE_MS
    )
  }

  if (latestPurchaseDate === candidate.baselinePurchaseDate) return false

  return (
    Date.parse(latestPurchaseDate) >=
    Date.parse(candidate.startedAt) - PURCHASE_DATE_CLOCK_TOLERANCE_MS
  )
}
