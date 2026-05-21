import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://antonrendel@localhost:5432/digital_pub',
  },
})
