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

export default buildConfig({
  serverURL: 'https://d-pub.ru',
  secret: process.env.PAYLOAD_SECRET || '',
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DB_CONNECTION_STRING,
    },
  }),
  collections: [Tags, Posts, Articles, Media, Users],
  globals: [Navbar, Footer, SocialChannels, SiteSettings],
  admin: {
    user: Users.slug,
  },
  onInit: async (payload) => {
    const { totalDocs } = await payload.count({ collection: 'users' })
    if (totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: process.env.PAYLOAD_ADMIN_EMAIL || 'admin@d-pub.ru',
          password: process.env.PAYLOAD_ADMIN_PASSWORD || '',
          role: 'admin',
        },
      })

      const syncUser = await payload.create({
        collection: 'users',
        data: {
          email: 'sync@d-pub.ru',
          password: crypto.randomBytes(32).toString('hex'),
          role: 'sync',
          enableAPIKey: true,
        },
      })

      // eslint-disable-next-line no-console
      console.log('[payload onInit] Sync API Key:', syncUser.apiKey)
    }
  },
})
