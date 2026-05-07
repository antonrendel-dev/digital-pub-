import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://antonrendel@localhost:5432/digital_pub'

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// Reuse single instance across hot-reloads in Next.js dev mode
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
