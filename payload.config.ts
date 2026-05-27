import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Tags } from './payload/collections/tags'
import { Posts } from './payload/collections/posts'
import { Articles } from './payload/collections/articles'
import { Media } from './payload/collections/media'
import { Users } from './payload/collections/users'
import { Navbar } from './payload/globals/navbar'
import { Footer } from './payload/globals/footer'
import { SocialChannels } from './payload/globals/socialChannels'
import { SiteSettings } from './payload/globals/siteSettings'
import crypto from 'crypto'

const payloadSecret = process.env.PAYLOAD_SECRET
if (!payloadSecret || payloadSecret.length < 32) {
  throw new Error(
    '[Payload] PAYLOAD_SECRET env var is required and must be at least 32 characters. ' +
      'Generate with: openssl rand -hex 32'
  )
}

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru',
  secret: payloadSecret,
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DB_CONNECTION_STRING,
    },
    push: process.env.PAYLOAD_PUSH_DB === 'true',
    migrationDir: './payload-migrations',
  }),
  collections: [Tags, Posts, Articles, Media, Users],
  globals: [Navbar, Footer, SocialChannels, SiteSettings],
  admin: {
    user: Users.slug,
  },
  onInit: async (payload) => {
    if (!process.env.PAYLOAD_ADMIN_EMAIL || !process.env.PAYLOAD_ADMIN_PASSWORD) {
      payload.logger.warn(
        '[payload onInit] PAYLOAD_ADMIN_EMAIL or PAYLOAD_ADMIN_PASSWORD not set — skipping user seed'
      )
      return
    }

    try {
      const { totalDocs } = await payload.count({ collection: 'users' })
      if (totalDocs > 0) return

      await payload.create({
        collection: 'users',
        data: {
          email: process.env.PAYLOAD_ADMIN_EMAIL,
          password: process.env.PAYLOAD_ADMIN_PASSWORD,
          role: 'admin',
        },
      })

      await payload.create({
        collection: 'users',
        data: {
          email: 'sync@d-pub.ru',
          password: crypto.randomBytes(32).toString('hex'),
          role: 'sync',
        },
      })

      payload.logger.info(
        '[payload onInit] Sync user created — copy apiKey from Payload admin UI (Users → sync@d-pub.ru) to PAYLOAD_API_KEY on the server'
      )
    } catch (err) {
      payload.logger.error({ err }, '[payload onInit] user seed failed')
    }
  },
})
