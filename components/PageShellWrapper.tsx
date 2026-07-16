import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import PageShell from './PageShell'

/**
 * Server wrapper for PageShell.
 * Reads slogan from Navbar Global and passes it to the client PageShell.
 * This allows the Navbar (client component with useState) to show dynamic slogan
 * without calling Payload directly from a client component.
 */

const getNavbarData = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const navbarGlobal = await payload.findGlobal({ slug: 'navbar' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = navbarGlobal as any
    return { slogan: g?.slogan ?? 'Место, где встречаются хорошие люди' }
  },
  ['navbar-global'],
  { revalidate: 300 }
)

export async function PageShellWrapper({ children }: { children: React.ReactNode }) {
  let slogan = 'Место, где встречаются хорошие люди'

  try {
    const data = await getNavbarData()
    slogan = data.slogan
  } catch {
    // Payload unavailable — use hardcoded default
  }

  return <PageShell slogan={slogan}>{children}</PageShell>
}
