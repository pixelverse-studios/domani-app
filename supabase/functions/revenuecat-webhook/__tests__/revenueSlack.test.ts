import {
  buildRevenueSlackMessage,
  getRevenueSlackWebhookSecretName,
  type RevenueCatEventContext,
} from '../revenueSlack'

const eventContext: RevenueCatEventContext = {
  eventType: 'INITIAL_PURCHASE',
  eventId: 'event-123',
  appUserId: 'rc-user-123',
  productId: 'domani_lifetime',
  entitlementIds: ['Domani Lifetime'],
  store: 'APP_STORE',
  environment: 'SANDBOX',
  eventTimestampMs: 1789500000000,
  originalTransactionId: 'original-transaction-123',
  transactionId: 'transaction-123',
  price: 99,
  currency: 'USD',
}

describe('RevenueCat Slack alerts', () => {
  it('uses the revenue Slack webhook secret', () => {
    expect(getRevenueSlackWebhookSecretName()).toBe('SLACK_REVENUE_WEBHOOK_URL')
  })

  it('builds purchase granted messages with revenue context', () => {
    const message = buildRevenueSlackMessage({
      alertType: 'purchase_granted',
      eventContext,
      processedAction: 'granted_lifetime',
      userId: 'user-123',
    })

    const serializedBlocks = JSON.stringify(message.blocks)

    expect(message.text).toBe('Lifetime purchase granted: INITIAL_PURCHASE')
    expect(serializedBlocks).toContain('Revenue: Lifetime Purchase Granted')
    expect(serializedBlocks).toContain('granted_lifetime')
    expect(serializedBlocks).toContain('user-123')
    expect(serializedBlocks).toContain('domani_lifetime')
    expect(serializedBlocks).toContain('99')
    expect(serializedBlocks).toContain('USD')
  })

  it('splits Slack section fields to stay within Slack block limits', () => {
    const message = buildRevenueSlackMessage({
      alertType: 'purchase_granted',
      eventContext,
      processedAction: 'granted_lifetime',
      userId: 'user-123',
    })

    const fieldSections = message.blocks.filter(
      (block) => block.type === 'section' && Array.isArray(block.fields),
    )

    expect(fieldSections).toHaveLength(2)
    expect(fieldSections.every((block) => block.fields!.length <= 10)).toBe(true)
  })

  it('builds refund restored messages for refund reversal events', () => {
    const message = buildRevenueSlackMessage({
      alertType: 'refund_restored',
      eventContext: {
        ...eventContext,
        eventType: 'REFUND_REVERSED',
      },
      processedAction: 'restored_refund',
      userId: 'user-123',
    })

    const serializedBlocks = JSON.stringify(message.blocks)

    expect(message.text).toBe('Refund reversed and access restored: REFUND_REVERSED')
    expect(serializedBlocks).toContain('Revenue: Refund Reversed')
    expect(serializedBlocks).toContain('restored_refund')
  })

  it('builds escaped processing failure messages', () => {
    const message = buildRevenueSlackMessage({
      alertType: 'processing_failed',
      eventContext,
      errorMessage: 'failed <db> & retry',
    })

    const serializedBlocks = JSON.stringify(message.blocks)

    expect(message.text).toBe('RevenueCat webhook processing failed: INITIAL_PURCHASE')
    expect(serializedBlocks).toContain('Revenue: Webhook Processing Failed')
    expect(serializedBlocks).toContain('failed &lt;db&gt; &amp; retry')
  })

  it('builds user-not-found messages without a resolved user id', () => {
    const message = buildRevenueSlackMessage({
      alertType: 'user_not_found',
      eventContext,
      processedAction: 'ignored_user_not_found',
    })

    const serializedBlocks = JSON.stringify(message.blocks)

    expect(message.text).toBe(
      'RevenueCat event could not be matched to a Domani user: INITIAL_PURCHASE',
    )
    expect(serializedBlocks).toContain('ignored_user_not_found')
    expect(serializedBlocks).toContain('rc-user-123')
  })
})
