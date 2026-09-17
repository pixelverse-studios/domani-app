import { getAllowedIncomingSystemPath } from '~/lib/navigationSecurity'

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return getAllowedIncomingSystemPath(path)
}
