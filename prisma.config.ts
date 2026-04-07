import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://antonrendel@localhost:5432/digital_pub',
  },
})
