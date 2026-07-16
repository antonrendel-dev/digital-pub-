import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import LeftSidebar, { DEFAULT_CHANNELS, type SocialChannel } from './LeftSidebar'

interface LeftSidebarServerProps {
  stats?: {
    vacancyCount: number
    resumeCount: number
    companyCount: number
    newToday: number
  }
}

/**
 * Server wrapper for LeftSidebar.
 * Reads SocialChannels Global from Payload and passes channels as prop.
 * Falls back to hardcoded defaults if Global is not configured.
 */

const getSocialChannels = unstable_cache(
  async (): Promise<SocialChannel[]> => {
    const payload = await getPayload({ config })
    const global = await payload.findGlobal({ slug: 'social-channels' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = global as any
    if (g?.channels?.length) {
      return g.channels as SocialChannel[]
    }
    return DEFAULT_CHANNELS
  },
  ['social-channels-global'],
  { revalidate: 300 }
)

export async function LeftSidebarServer({ stats }: LeftSidebarServerProps = {}) {
  let channels: SocialChannel[] = DEFAULT_CHANNELS

  try {
    channels = await getSocialChannels()
  } catch {
    // Payload unavailable — use hardcoded defaults
  }

  return <LeftSidebar channels={channels} stats={stats} />
}
