import 'dotenv/config'
import { getPayload } from 'payload'
import crypto from 'crypto'

async function seed() {
  const configPath = process.env.PAYLOAD_CONFIG_PATH
  if (!configPath) throw new Error('PAYLOAD_CONFIG_PATH not set')

  const { default: config } = await import(configPath)
  const payload = await getPayload({ config })

  // Create admin user if DB is empty
  const { totalDocs } = await payload.find({ collection: 'users', limit: 0 })
  if (totalDocs === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'antonrendel@gmail.com'
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) throw new Error('ADMIN_PASSWORD not set')
    await payload.create({
      collection: 'users',
      data: { email: adminEmail, password: adminPassword, role: 'admin' },
    })
    console.log('[seed] Created admin user:', adminEmail)
  } else {
    console.log(`[seed] ${totalDocs} user(s) already exist`)
  }

  // Create or regenerate sync user API key
  const syncEmail = 'sync@d-pub.ru'
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: syncEmail } },
    limit: 1,
  })

  let syncUser: Record<string, unknown>
  if (existing.totalDocs === 0) {
    syncUser = (await payload.create({
      collection: 'users',
      data: {
        email: syncEmail,
        password: crypto.randomUUID(),
        role: 'sync',
        enableAPIKey: true,
      },
    })) as Record<string, unknown>
    console.log('[seed] Created sync user')
  } else {
    // Regenerate key: disable then re-enable
    const id = (existing.docs[0] as Record<string, unknown>).id as number
    await payload.update({ collection: 'users', id, data: { enableAPIKey: false } })
    syncUser = (await payload.update({
      collection: 'users',
      id,
      data: { enableAPIKey: true },
    })) as Record<string, unknown>
    console.log('[seed] Regenerated API key for sync user')
  }

  const apiKey = syncUser.apiKey as string
  if (!apiKey) throw new Error('API key not returned by Payload')

  console.log(`[seed] PAYLOAD_API_KEY=${apiKey}`)
  process.exit(0)
}

seed().catch((e) => {
  console.error('[seed] Error:', e.message)
  process.exit(1)
})
