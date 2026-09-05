import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// .env подхватывается сам: Prisma 7 его не читает, а локальные `npx prisma …` без этого падали бы.
// Без дефолта: строка с именем локального пользователя БД в публичном репо —
// лишний идентификатор, а тихий фолбэк на localhost прятал бы отсутствие env (S15).
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL не задан — Prisma не знает, к какой базе подключаться')

export default defineConfig({
  datasource: { url },
})
