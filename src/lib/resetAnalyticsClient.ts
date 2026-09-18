import { PostHog, PostHogPersistedProperty } from 'posthog-react-native'

export async function resetAnalyticsClient(posthog: PostHog): Promise<void> {
  await posthog.ready()
  // Discard unsent events, then wait for any active batch to stop mutating the queue.
  // flush() serializes behind active requests; its own batch sees the empty queue.
  posthog.setPersistedProperty(PostHogPersistedProperty.Queue, [])
  await posthog.flush().catch(() => undefined)
  // SDK lifecycle callbacks can enqueue events while the request is settling.
  posthog.setPersistedProperty(PostHogPersistedProperty.Queue, [])
  posthog.reset([
    PostHogPersistedProperty.InstalledAppBuild,
    PostHogPersistedProperty.InstalledAppVersion,
    PostHogPersistedProperty.OptedOut,
  ])
}
