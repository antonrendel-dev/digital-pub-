/**
 * regen.ts — перегенерация картинки для существующей статьи
 * Использование: node regen.compiled.js <slug>
 */

import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '../..')
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content/articles')
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/posts')
const CODEX_BIN = path.join(os.homedir(), '.npm-global', 'bin', 'codex')
const CODEX_HOME = path.join(os.homedir(), '.codex')
const slug = process.argv[2]
if (!slug) {
  console.error('Использование: node regen.compiled.js <slug>')
  process.exit(1)
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
  const fullPrompt =
    `Generate a hero image for a blog article using this exact style: ` +
    `Cozy RPG pixel art illustration, painterly quality with fine pixel grain texture, ` +
    `clean composition with 2-3 hero objects clearly separated, dark atmospheric background (deep blue or purple-black), ` +
    `strong contrast: warm amber and golden light on foreground objects against dark background, ` +
    `rich pixel texture on each object surface, smooth gradients via fine dithering, ` +
    `close-up or medium-shot (NOT wide panoramic), isometric or 3/4 side-view, ` +
    `no clutter, no visual noise, calm lofi RPG mood, no photorealism, no watermark, no text in image. ` +
    `SCENE: ${imagePrompt}. ` +
    `Use your image generation tool to create this image now.`

  console.log('[regen] Запускаю Codex...')

  await new Promise<void>((resolve) => {
    const child = spawn(
      CODEX_BIN,
      ['exec', '--dangerously-bypass-approvals-and-sandbox', '--model', 'gpt-5.5', fullPrompt],
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

  // Генерируем новый imagePrompt через Claude
  const imagePrompt = await askClaude(
    `Generate an English scene description for a pixel-art hero image for this article.\n` +
      `Title: ${title}\n` +
      `Description: ${description}\n\n` +
      `Describe a CLOSE-UP scene (NOT wide panoramic) with 2-3 specific objects relevant to the article topic. ` +
      `Choose ONE setting (coffee shop corner, library nook, rooftop table, coworking desk, home desk). ` +
      `No text in image. Reply with just the scene description, 2-3 sentences, English only.`
  )

  console.log(`[regen] imagePrompt: ${imagePrompt}`)

  const newImagePath = await generateImage(imagePrompt.trim())
  if (!newImagePath) {
    console.error('[regen] Codex не сгенерировал картинку')
    process.exit(1)
  }

  // Копируем как webp в public/images/posts/
  const destFilename = `${slug}.webp`
  const destPath = path.join(IMAGES_DIR, destFilename)
  fs.copyFileSync(newImagePath, destPath)
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
