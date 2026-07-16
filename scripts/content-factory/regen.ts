/**
 * regen.ts — перегенерация картинки для существующей статьи
 * Использование: node regen.compiled.js <slug>
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '../..')
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content/articles')
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/posts')
const CODEX_BIN = path.join(os.homedir(), '.npm-global', 'bin', 'codex')
const CODEX_HOME = path.join(os.homedir(), '.codex')
const REFERENCE_IMAGE = path.join(SCRIPTS_DIR, 'reference.webp')

const PERSPECTIVES = [
  'face-on front view, character faces the viewer directly',
  '3/4 front-left angle, character turned slightly away to the left',
  'side profile from the right, character looks forward',
  'over-the-shoulder view from mid-height, character seen from waist up',
  'close-up head-and-shoulders portrait, character fills the frame',
]

const SETTINGS = [
  'corner table in a cozy coffee shop, warm wooden interior, other blurred customers in the background',
  'rooftop terrace at dusk with city lights below, outdoor bistro table with a phone and drink',
  'park bench under a tree, dappled sunlight, green surroundings with a path behind',
  'home kitchen table with morning light through window, kettle and plants on the sill',
  'library nook between tall bookshelves, soft reading lamp, a few books stacked nearby',
  'small meeting room corner with a whiteboard covered in diagrams and sticky notes',
  'coworking open space, rows of desks visible in background, industrial lamps above',
  'train window seat, landscape moving outside, small fold-out tray table',
  'balcony with railing, evening sky, city view or garden behind the character',
  'university campus outdoor seating area, other students in the distance',
]
const slug = process.argv[2]
const customPrompt = process.argv.slice(3).join(' ').trim() || null

if (!slug) {
  console.error('Использование: node regen.compiled.js <slug> [пожелания к сцене]')
  process.exit(1)
}

function convertToWebP(srcPng: string, destWebp: string): void {
  const script = `
    import('${path.join(PROJECT_ROOT, 'node_modules', 'sharp', 'lib', 'index.js')}')
      .then(m => m.default('${srcPng}').resize(900, 450, {fit:'cover'}).webp({quality:85}).toFile('${destWebp}'))
      .then(() => process.exit(0))
      .catch(e => { console.error(e.message); process.exit(1); })
  `
  execSync(`node --input-type=module`, {
    input: script,
    cwd: PROJECT_ROOT,
    timeout: 30000,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

function askClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(`claude завершился с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

function snapshotGeneratedImages(): Set<string> {
  const generatedDir = path.join(CODEX_HOME, 'generated_images')
  const images = new Set<string>()
  if (!fs.existsSync(generatedDir)) return images
  for (const session of fs.readdirSync(generatedDir)) {
    const sessionDir = path.join(generatedDir, session)
    try {
      for (const file of fs.readdirSync(sessionDir)) {
        if (file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.jpg')) {
          images.add(path.join(sessionDir, file))
        }
      }
    } catch {}
  }
  return images
}

function findNewImage(before: Set<string>): string | null {
  const after = snapshotGeneratedImages()
  for (const img of after) {
    if (!before.has(img)) return img
  }
  return null
}

async function generateImage(imagePrompt: string): Promise<string | null> {
  if (!fs.existsSync(CODEX_BIN)) {
    console.log('[regen] Codex CLI не найден')
    return null
  }

  const before = snapshotGeneratedImages()
  const perspIdx = Math.floor(Date.now() / 1000) % PERSPECTIVES.length
  const perspective = PERSPECTIVES[perspIdx]
  const fullPrompt =
    `Match the pixel art style of the attached reference image exactly: ` +
    `ultra-fine dense pixel grain (NOT blocky large pixels), bright warm cozy atmosphere (NOT dark, NOT muddy, NOT desaturated), ` +
    `rich amber, golden and soft cream tones throughout — warm inviting palette, ` +
    `single clear light source creating volumetric depth: bright highlights on lit surfaces and well-defined soft shadows for 3D volume, ` +
    `rich surface textures, smooth gradients via fine dithering, ` +
    `high pixel density giving a near-painterly look, calm lofi RPG mood, no watermark, no photorealism. ` +
    `MANDATORY: include exactly 1 human person (male or female based on topic) prominently in the foreground. ` +
    `CHARACTER ANGLE: ${perspective}. ` +
    `BACKGROUND: rich with many objects and environmental details filling the scene — NO text or letters anywhere. ` +
    `SCENE: ${imagePrompt}. ` +
    `Generate this pixel art image now.`

  const refArg = fs.existsSync(REFERENCE_IMAGE) ? ['-i', REFERENCE_IMAGE] : []
  console.log('[regen] Запускаю Codex...')

  await new Promise<void>((resolve) => {
    const child = spawn(
      CODEX_BIN,
      [
        'exec',
        '--dangerously-bypass-approvals-and-sandbox',
        '--model',
        'gpt-5.5',
        fullPrompt,
        ...refArg,
      ],
      {
        env: { ...process.env, CODEX_HOME },
        stdio: 'ignore',
        timeout: 240000,
      }
    )
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

  return findNewImage(before)
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/)
    if (m) result[m[1]] = m[2]
  }
  return result
}

async function main() {
  const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(mdxPath)) {
    console.error(`[regen] MDX не найден: ${mdxPath}`)
    process.exit(1)
  }

  const mdxContent = fs.readFileSync(mdxPath, 'utf-8')
  const fm = parseFrontmatter(mdxContent)
  const title = fm.title || slug
  const description = fm.description || ''

  console.log(`[regen] Статья: ${title}`)

  let imagePrompt: string
  if (customPrompt) {
    // Пользователь указал пожелания — переводим в English через Claude
    imagePrompt = await askClaude(
      `Translate and expand this scene description into English for a pixel-art image (2-3 sentences, close-up, no text in image):\n${customPrompt}`
    )
    console.log(`[regen] imagePrompt (custom): ${imagePrompt}`)
  } else {
    // Автогенерация сцены по теме статьи
    const settingIdx = Math.floor(Date.now() / 1000) % SETTINGS.length
    const forcedSetting = SETTINGS[settingIdx]
    imagePrompt = await askClaude(
      `Generate an English scene description for a pixel-art hero image for this article.\n` +
        `Title: ${title}\n` +
        `Description: ${description}\n\n` +
        `REQUIRED: include 1 human character (male or female based on the topic) as the main subject.\n` +
        `MANDATORY SETTING — use exactly this location: ${forcedSetting}.\n` +
        `Describe what the character is doing, their clothing, and 2-3 specific objects related to the topic placed in this setting.\n` +
        `No text visible in image. Reply with just the scene description, 2-3 sentences, English only.`
    )
    console.log(`[regen] imagePrompt (auto): ${imagePrompt}`)
  }

  const newImagePath = await generateImage(imagePrompt.trim())
  if (!newImagePath) {
    console.error('[regen] Codex не сгенерировал картинку')
    process.exit(1)
  }

  // Конвертируем в WebP 900x450
  const destFilename = `${slug}.webp`
  const destPath = path.join(IMAGES_DIR, destFilename)
  try {
    convertToWebP(newImagePath, destPath)
    console.log(`[regen] WebP сохранён: ${destPath}`)
  } catch (e) {
    console.warn('[regen] Конвертация не удалась, копирую как есть:', (e as Error).message)
    fs.copyFileSync(newImagePath, destPath)
  }
  console.log(`[regen] Картинка: ${destPath}`)

  // Обновляем imageUrl в MDX
  const newImageUrl = `/images/posts/${destFilename}`
  const updatedMdx = mdxContent.replace(/imageUrl:\s*"[^"]*"/, `imageUrl: "${newImageUrl}"`)
  fs.writeFileSync(mdxPath, updatedMdx)

  // Git add + commit + push
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'git',
      ['add', `public/images/posts/${destFilename}`, `content/articles/${slug}.mdx`],
      { cwd: PROJECT_ROOT, stdio: 'inherit' }
    )
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git add failed: ${code}`))
    )
  })

  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['commit', '-m', `fix(image): regenerate cover for ${slug}`], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git commit failed: ${code}`))
    )
  })

  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['push', 'origin', 'main'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git push failed: ${code}`))
    )
  })

  console.log(`[regen] ✅ Готово! ${newImageUrl}`)
}

main().catch((e) => {
  console.error('[regen] Ошибка:', e)
  process.exit(1)
})
