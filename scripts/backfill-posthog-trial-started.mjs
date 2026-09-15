import crypto from 'node:crypto'
import fs from 'node:fs'

function loadLocalEnv() {
  if (!fs.existsSync('.env')) return

  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

loadLocalEnv()

const apply = process.argv.includes('--apply')
const expectedCountArgument = process.argv.find((argument) =>
  argument.startsWith('--expected-count='),
)
const expectedCount = expectedCountArgument
  ? Number(expectedCountArgument.slice('--expected-count='.length))
  : null

const posthogHost = process.env.POSTHOG_HOST?.replace(/\/$/, '')
const posthogProjectId = process.env.POSTHOG_PROJECT_ID
const posthogPersonalKey = process.env.POSTHOG_PERSONAL_API_KEY
const posthogProjectKey = process.env.EXPO_PUBLIC_POSTHOG_KEY
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

for (const [name, value] of Object.entries({
  POSTHOG_HOST: posthogHost,
  POSTHOG_PROJECT_ID: posthogProjectId,
  POSTHOG_PERSONAL_API_KEY: posthogPersonalKey,
  EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
})) {
  if (!value) throw new Error(`${name} is required`)
}
if (apply && !posthogProjectKey) throw new Error('EXPO_PUBLIC_POSTHOG_KEY is required with --apply')

async function posthogQuery(query) {
  const response = await fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${posthogPersonalKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
  if (!response.ok)
    throw new Error(`PostHog query failed: ${response.status} ${await response.text()}`)
  return response.json()
}

async function verifyPostHogWriteTarget() {
  const response = await fetch(`${posthogHost}/api/projects/${posthogProjectId}/`, {
    headers: { Authorization: `Bearer ${posthogPersonalKey}` },
  })
  if (!response.ok) {
    throw new Error(`PostHog project verification failed: ${response.status}`)
  }

  const project = await response.json()
  if (typeof project.api_token !== 'string' || project.api_token !== posthogProjectKey) {
    throw new Error(
      'EXPO_PUBLIC_POSTHOG_KEY does not belong to the PostHog project selected by POSTHOG_PROJECT_ID',
    )
  }
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`)
  }
  return response.status === 204 ? null : response.json()
}

async function loadProfiles() {
  const profiles = []
  const pageSize = 1000
  for (let start = 0; ; start += pageSize) {
    const page = await supabaseRequest(
      'profiles?select=id,trial_started_at,trial_ends_at,signup_cohort&trial_started_at=not.is.null',
      { headers: { Range: `${start}-${start + pageSize - 1}` } },
    )
    profiles.push(...page)
    if (page.length < pageSize) return profiles
  }
}

async function loadDeliveries() {
  const deliveries = []
  const pageSize = 1000
  for (let start = 0; ; start += pageSize) {
    const page = await supabaseRequest(
      'posthog_trial_event_deliveries?select=user_id,event_uuid,event_timestamp,event_properties,delivered_at',
      { headers: { Range: `${start}-${start + pageSize - 1}` } },
    )
    deliveries.push(...page)
    if (page.length < pageSize) return deliveries
  }
}

function stableEventUuid(userId, timestamp) {
  const bytes = crypto.createHash('sha256').update(`trial_started:${userId}:${timestamp}`).digest()
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.subarray(0, 16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function nullableString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

const releaseActivity = await posthogQuery(`
  SELECT
    distinct_id,
    min(timestamp) AS first_seen_at,
    argMin(properties['app_build'], timestamp) AS app_build,
    argMin(properties['platform'], timestamp) AS platform,
    argMin(properties['country'], timestamp) AS country
  FROM events
  WHERE event IN ('first_open', 'sign_in_completed', 'app_opened', 'planning_activated')
    AND properties['app_version'] = '1.1.2'
  GROUP BY distinct_id
  LIMIT 10000
`)
const existingTrialEvents = await posthogQuery(`
  SELECT distinct_id, uuid
  FROM events
  WHERE event = 'trial_started'
  LIMIT 10000
`)

const activityByUser = new Map(releaseActivity.results.map((row) => [row[0], row]))
const trackedTrialUuidsByUser = new Map()
for (const [userId, eventUuid] of existingTrialEvents.results) {
  const eventUuids = trackedTrialUuidsByUser.get(userId) ?? new Set()
  eventUuids.add(eventUuid)
  trackedTrialUuidsByUser.set(userId, eventUuids)
}
const profiles = await loadProfiles()
const deliveries = await loadDeliveries()
const deliveryByUser = new Map(deliveries.map((delivery) => [delivery.user_id, delivery]))
const skipped = {
  no_1_1_2_activity: 0,
  already_tracked: 0,
  existing_delivery: 0,
  invalid_trial_window: 0,
  activity_outside_start_window: 0,
  invalid_platform: 0,
}
const candidates = []
const reconciliations = []

for (const profile of profiles) {
  const activity = activityByUser.get(profile.id)
  if (!activity) {
    skipped.no_1_1_2_activity += 1
    continue
  }
  const trialStarted = new Date(profile.trial_started_at)
  const trialEnds = new Date(profile.trial_ends_at)
  const firstSeen = new Date(activity[1])
  if (
    !Number.isFinite(trialStarted.getTime()) ||
    !Number.isFinite(trialEnds.getTime()) ||
    trialEnds <= trialStarted
  ) {
    skipped.invalid_trial_window += 1
    continue
  }

  const activityDelayMs = firstSeen.getTime() - trialStarted.getTime()
  if (activityDelayMs < -15 * 60 * 1000 || activityDelayMs > 24 * 60 * 60 * 1000) {
    skipped.activity_outside_start_window += 1
    continue
  }

  const platform = activity[3]
  if (platform !== 'ios' && platform !== 'android') {
    skipped.invalid_platform += 1
    continue
  }

  const candidate = {
    userId: profile.id,
    eventUuid: stableEventUuid(profile.id, profile.trial_started_at),
    eventTimestamp: profile.trial_started_at,
    properties: {
      platform,
      app_version: '1.1.2',
      app_build: nullableString(activity[2]),
      country: nullableString(activity[4]),
      offer: profile.signup_cohort === 'early_adopter' ? 'early_adopter' : 'general',
      signup_cohort: profile.signup_cohort,
      trial_expires_at: profile.trial_ends_at,
      app_environment: 'production',
      release_channel: 'backfill',
      backfilled: true,
    },
  }
  const delivery = deliveryByUser.get(profile.id)
  const trackedEventUuids = trackedTrialUuidsByUser.get(profile.id) ?? new Set()

  if (delivery?.delivered_at) {
    skipped.existing_delivery += 1
    continue
  }
  if (trackedEventUuids.size > 0) {
    if (delivery && trackedEventUuids.has(delivery.event_uuid)) {
      reconciliations.push({ userId: profile.id, eventUuid: delivery.event_uuid })
    } else {
      skipped.already_tracked += 1
    }
    continue
  }

  candidates.push(candidate)
}

const planned = candidates.length + reconciliations.length

console.log(
  JSON.stringify(
    {
      mode: apply ? 'apply' : 'dry-run',
      release: '1.1.2',
      profiles_with_trial: profiles.length,
      posthog_release_users: activityByUser.size,
      planned,
      capture_planned: candidates.length,
      reconciliation_planned: reconciliations.length,
      skipped,
      earliest_planned_at: candidates.length
        ? candidates.map((candidate) => candidate.eventTimestamp).sort()[0]
        : null,
      latest_planned_at: candidates.length
        ? candidates
            .map((candidate) => candidate.eventTimestamp)
            .sort()
            .at(-1)
        : null,
    },
    null,
    2,
  ),
)

if (!apply) {
  console.log(
    `Dry run only. After reviewing the count, apply with --apply --expected-count=${planned}`,
  )
  process.exit(0)
}
if (!Number.isInteger(expectedCount) || expectedCount !== planned) {
  throw new Error(`Expected count must exactly match the reviewed plan (${planned})`)
}

await verifyPostHogWriteTarget()

let written = 0
let skippedExistingDelivery = 0
let reconciled = 0
for (const reconciliation of reconciliations) {
  const updated = await supabaseRequest(
    `posthog_trial_event_deliveries?user_id=eq.${reconciliation.userId}&event_uuid=eq.${reconciliation.eventUuid}&delivered_at=is.null`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ delivered_at: new Date().toISOString() }),
    },
  )
  if (updated.length !== 1) {
    throw new Error('Pending PostHog trial delivery could not be reconciled')
  }
  reconciled += 1
}

for (const candidate of candidates) {
  const existing = deliveryByUser.get(candidate.userId)
  if (existing?.delivered_at) {
    skippedExistingDelivery += 1
    continue
  }

  const claimToken = crypto.randomUUID()
  if (!existing) {
    await supabaseRequest('posthog_trial_event_deliveries', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: candidate.userId,
        event_uuid: candidate.eventUuid,
        event_timestamp: candidate.eventTimestamp,
        event_properties: candidate.properties,
        claim_token: claimToken,
      }),
    })
  }

  const eventUuid = existing?.event_uuid ?? candidate.eventUuid
  const eventTimestamp = existing?.event_timestamp ?? candidate.eventTimestamp
  const eventProperties = {
    ...candidate.properties,
    ...(existing?.event_properties ?? {}),
  }
  const captureResponse = await fetch(`${posthogHost}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: posthogProjectKey,
      event: 'trial_started',
      uuid: eventUuid,
      timestamp: eventTimestamp,
      properties: {
        distinct_id: candidate.userId,
        $insert_id: eventUuid,
        ...eventProperties,
      },
    }),
  })
  if (!captureResponse.ok) {
    throw new Error(
      `PostHog capture failed: ${captureResponse.status} ${await captureResponse.text()}`,
    )
  }

  const updated = await supabaseRequest(
    `posthog_trial_event_deliveries?user_id=eq.${candidate.userId}&event_uuid=eq.${eventUuid}&delivered_at=is.null`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ delivered_at: new Date().toISOString() }),
    },
  )
  if (updated.length !== 1) {
    throw new Error('PostHog trial delivery could not be marked complete')
  }
  written += 1
}

console.log(
  JSON.stringify({
    planned,
    written,
    reconciled,
    skipped_existing: skippedExistingDelivery,
  }),
)
