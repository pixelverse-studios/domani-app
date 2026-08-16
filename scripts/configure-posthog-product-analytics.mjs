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

const host = process.env.POSTHOG_HOST
const projectId = process.env.POSTHOG_PROJECT_ID
const apiKey = process.env.POSTHOG_PERSONAL_API_KEY

if (!host || !projectId || !apiKey) {
  throw new Error('POSTHOG_HOST, POSTHOG_PROJECT_ID, and POSTHOG_PERSONAL_API_KEY are required')
}

const apiRoot = `${host.replace(/\/$/, '')}/api/projects/${projectId}`

async function request(path, options = {}) {
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} failed: ${response.status} ${await response.text()}`,
    )
  }

  return response.status === 204 ? null : response.json()
}

async function list(path) {
  const response = await request(`${path}${path.includes('?') ? '&' : '?'}limit=200`)
  return response.results ?? response
}

async function ensureNamedResource(path, name, payload) {
  const existing = (await list(path)).find((item) => item.name === name)
  if (existing) {
    const updated = await request(`${path}${existing.id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    console.log(`Updated ${name}`)
    return updated
  }

  const created = await request(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  console.log(`Created ${name}`)
  return created
}

function eventNode(event, math = 'dau') {
  return { kind: 'EventsNode', event, name: event, math }
}

function trendQuery(events, dateFrom = '-30d') {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: events.map((event) => eventNode(event)),
      interval: 'day',
      dateRange: { date_from: dateFrom, explicitDate: false },
      trendsFilter: { display: 'ActionsLineGraph' },
      properties: [],
      filterTestAccounts: false,
    },
  }
}

function retentionQuery(returningEntity, totalIntervals) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'RetentionQuery',
      version: 2,
      dateRange: { date_from: '-90d', explicitDate: false },
      properties: [],
      retentionFilter: {
        period: 'Day',
        targetEntity: { id: 'trial_started', type: 'events' },
        returningEntity,
        retentionType: 'retention_first_time',
        totalIntervals,
      },
      filterTestAccounts: false,
    },
  }
}

async function ensureInsight(name, description, dashboardId, query) {
  return ensureNamedResource('/insights/', name, {
    name,
    description,
    dashboards: [dashboardId],
    query,
  })
}

const meaningfulActivity = await ensureNamedResource('/actions/', 'Meaningful Task Activity', {
  name: 'Meaningful Task Activity',
  description: 'A user created, edited, completed, or rolled a task forward.',
  steps: [
    { event: 'task_created' },
    { event: 'task_edited' },
    { event: 'task_completed' },
    { event: 'task_rolled_forward' },
  ],
})

const acquisitionDashboard = await ensureNamedResource(
  '/dashboards/',
  'Domani - Acquisition & Revenue',
  {
    name: 'Domani - Acquisition & Revenue',
    description:
      'Install-to-purchase performance. Campaign-level attribution remains limited until a campaign identifier reaches the app.',
    pinned: true,
  },
)

const retentionDashboard = await ensureNamedResource('/dashboards/', 'Domani - Retention', {
  name: 'Domani - Retention',
  description:
    'General app return and meaningful task activity retention measured from a user’s trial start.',
  pinned: true,
})

const dashboards = await list('/dashboards/')
const corePlanningDashboard = dashboards.find((dashboard) =>
  ['Core Planning Loop', 'Domani - Core Planning Loop'].includes(dashboard.name),
)
if (!corePlanningDashboard) throw new Error('Core Planning Loop dashboard was not found')

await ensureInsight(
  'Paid Acquisition Funnel',
  'First open through sign-in, qualified trial, real planning activation, and verified lifetime purchase.',
  acquisitionDashboard.id,
  {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series: [
        eventNode('first_open'),
        eventNode('sign_in_completed'),
        eventNode('trial_started'),
        eventNode('planning_activated'),
        eventNode('lifetime_purchase_completed'),
      ],
      dateRange: { date_from: '-90d', explicitDate: false },
      funnelsFilter: {
        funnelWindowInterval: 30,
        funnelWindowIntervalUnit: 'day',
        funnelVizType: 'steps',
      },
      properties: [],
      filterTestAccounts: false,
    },
  },
)

await ensureInsight(
  'Acquisition Lifecycle Volume',
  'Daily unique users reaching each acquisition milestone.',
  acquisitionDashboard.id,
  trendQuery(
    [
      'first_open',
      'sign_in_completed',
      'trial_started',
      'planning_activated',
      'lifetime_purchase_completed',
    ],
    '-90d',
  ),
)

await ensureInsight(
  'Purchase and Access Outcomes',
  'Verified purchases, restored purchases, and revoked access.',
  acquisitionDashboard.id,
  trendQuery(['lifetime_purchase_completed', 'purchase_restored', 'access_revoked'], '-90d'),
)

const retentionTargets = [
  ['D1', 2],
  ['D7', 8],
  ['D14', 15],
]

for (const [label, intervals] of retentionTargets) {
  await ensureInsight(
    `${label} General Retention`,
    `${label} return to the app after starting a qualified trial.`,
    retentionDashboard.id,
    retentionQuery({ id: 'app_opened', type: 'events' }, intervals),
  )
  await ensureInsight(
    `${label} Product Retention`,
    `${label} return to meaningful task activity after starting a qualified trial.`,
    retentionDashboard.id,
    retentionQuery(
      { id: meaningfulActivity.id, name: meaningfulActivity.name, type: 'actions' },
      intervals,
    ),
  )
}

await ensureInsight(
  'Expanded Meaningful Task Activity',
  'Daily task creation, editing, completion, and rollover activity.',
  corePlanningDashboard.id,
  trendQuery(['task_created', 'task_edited', 'task_completed', 'task_rolled_forward'], '-90d'),
)

await ensureInsight(
  'Real Planning Activations',
  'First non-tutorial task scheduled for today or tomorrow.',
  corePlanningDashboard.id,
  trendQuery(['planning_activated'], '-90d'),
)

console.log('PostHog product analytics configuration is up to date.')
