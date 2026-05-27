import { getPayload } from 'payload'
import config from '@payload-config'
import LeftSidebar, { type SocialChannel } from './LeftSidebar'

const DEFAULT_CHANNELS: SocialChannel[] = [
  { name: 'Telegram', url: 'https://t.me/+69rdOEDrfvgyMDMy', subscribers: '14 200 подписчиков' },
  {
    name: 'Макс',
    url: 'https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ',
    subscribers: '6 800 подписчиков',
  },
  {
    name: 'ВКонтакте',
    url: 'https://vk.com/digital_pub_vacancies',
    subscribers: '9 300 подписчиков',
  },
]

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
export async function LeftSidebarServer({ stats }: LeftSidebarServerProps = {}) {
  let channels: SocialChannel[] = DEFAULT_CHANNELS

  try {
    const payload = await getPayload({ config })
    const global = await payload.findGlobal({ slug: 'social-channels' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = global as any
    if (g?.channels?.length) {
      channels = g.channels
    }
  } catch {
    // Payload unavailable — use hardcoded defaults
  }

  return <LeftSidebar channels={channels} stats={stats} />
}
