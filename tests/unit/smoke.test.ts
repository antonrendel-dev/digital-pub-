// Smoke test — verifies project setup is working
describe('Project setup', () => {
  it('runs tests', () => {
    expect(true).toBe(true)
  })

  it('has required env example vars', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8')
    expect(envExample).toContain('DATABASE_URL')
    expect(envExample).toContain('NEXTAUTH_SECRET')
    expect(envExample).toContain('TELEGRAM_CHANNELS')
  })
})
