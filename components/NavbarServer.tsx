import { getPayload } from 'payload'
import config from '@payload-config'
import Navbar from './Navbar'

interface NavbarServerProps {
  onSearch?: (query: string) => void
  onDarkToggle?: () => void
  isDark?: boolean
}

/**
 * Server wrapper for Navbar.
 * Reads the Navbar Global from Payload and passes slogan as prop.
 * Falls back to hardcoded default if Global is not configured.
 * Note: onSearch/onDarkToggle/isDark are handled in PageShell (client).
 * This component is used in app/layout.tsx only for static rendering.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function NavbarServer(_props: NavbarServerProps = {}) {
  let slogan = 'Место, где встречаются хорошие люди'
  try {
    const payload = await getPayload({ config })
    const navbarGlobal = await payload.findGlobal({ slug: 'navbar' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navbarGlobal as any)?.slogan) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slogan = (navbarGlobal as any).slogan
    }
  } catch {
    // Payload unavailable — use hardcoded default
  }
  // onSearch/onDarkToggle/isDark are noops here — PageShell handles interactivity
  return <Navbar onSearch={() => {}} onDarkToggle={() => {}} isDark={false} slogan={slogan} />
}
