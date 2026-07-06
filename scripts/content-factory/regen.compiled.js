// regen.ts
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
var SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
var PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '../..')
var CONTENT_DIR = path.join(PROJECT_ROOT, 'content/articles')
var IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/posts')
var CODEX_BIN = path.join(os.homedir(), '.npm-global', 'bin', 'codex')
var CODEX_HOME = path.join(os.homedir(), '.codex')
var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
var slug = process.argv[2]
if (!slug) {
  console.error(
    '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: node regen.compiled.js <slug>'
  )
  process.exit(1)
}
async function askClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content[0]?.text || ''
}
function snapshotGeneratedImages() {
  const generatedDir = path.join(CODEX_HOME, 'generated_images')
  const images = /* @__PURE__ */ new Set()
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
function findNewImage(before) {
  const after = snapshotGeneratedImages()
  for (const img of after) {
    if (!before.has(img)) return img
  }
  return null
}
async function generateImage(imagePrompt) {
  if (!fs.existsSync(CODEX_BIN)) {
    console.log('[regen] Codex CLI \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D')
    return null
  }
  const before = snapshotGeneratedImages()
  const fullPrompt = `Generate a hero image for a blog article using this exact style: Cozy RPG pixel art illustration, painterly quality with fine pixel grain texture, clean composition with 2-3 hero objects clearly separated, dark atmospheric background (deep blue or purple-black), strong contrast: warm amber and golden light on foreground objects against dark background, rich pixel texture on each object surface, smooth gradients via fine dithering, close-up or medium-shot (NOT wide panoramic), isometric or 3/4 side-view, no clutter, no visual noise, calm lofi RPG mood, no photorealism, no watermark, no text in image. SCENE: ${imagePrompt}. Use your image generation tool to create this image now.`
  console.log('[regen] \u0417\u0430\u043F\u0443\u0441\u043A\u0430\u044E Codex...')
  await new Promise((resolve) => {
    const child = spawn(
      CODEX_BIN,
      ['exec', '--dangerously-bypass-approvals-and-sandbox', '--model', 'gpt-5.5', fullPrompt],
      {
        env: { ...process.env, CODEX_HOME },
        stdio: 'ignore',
        timeout: 24e4,
      }
    )
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })
  return findNewImage(before)
}
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/)
    if (m) result[m[1]] = m[2]
  }
  return result
}
async function main() {
  const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(mdxPath)) {
    console.error(`[regen] MDX \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${mdxPath}`)
    process.exit(1)
  }
  const mdxContent = fs.readFileSync(mdxPath, 'utf-8')
  const fm = parseFrontmatter(mdxContent)
  const title = fm.title || slug
  const description = fm.description || ''
  console.log(`[regen] \u0421\u0442\u0430\u0442\u044C\u044F: ${title}`)
  const imagePrompt = await askClaude(
    `Generate an English scene description for a pixel-art hero image for this article.
Title: ${title}
Description: ${description}

Describe a CLOSE-UP scene (NOT wide panoramic) with 2-3 specific objects relevant to the article topic. Choose ONE setting (coffee shop corner, library nook, rooftop table, coworking desk, home desk). No text in image. Reply with just the scene description, 2-3 sentences, English only.`
  )
  console.log(`[regen] imagePrompt: ${imagePrompt}`)
  const newImagePath = await generateImage(imagePrompt.trim())
  if (!newImagePath) {
    console.error(
      '[regen] Codex \u043D\u0435 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043B \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443'
    )
    process.exit(1)
  }
  const destFilename = `${slug}.webp`
  const destPath = path.join(IMAGES_DIR, destFilename)
  fs.copyFileSync(newImagePath, destPath)
  console.log(`[regen] \u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430: ${destPath}`)
  const newImageUrl = `/images/posts/${destFilename}`
  const updatedMdx = mdxContent.replace(/imageUrl:\s*"[^"]*"/, `imageUrl: "${newImageUrl}"`)
  fs.writeFileSync(mdxPath, updatedMdx)
  await new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      ['add', `public/images/posts/${destFilename}`, `content/articles/${slug}.mdx`],
      { cwd: PROJECT_ROOT, stdio: 'inherit' }
    )
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git add failed: ${code}`))
    )
  })
  await new Promise((resolve, reject) => {
    const child = spawn('git', ['commit', '-m', `fix(image): regenerate cover for ${slug}`], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git commit failed: ${code}`))
    )
  })
  await new Promise((resolve, reject) => {
    const child = spawn('git', ['push', 'origin', 'main'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git push failed: ${code}`))
    )
  })
  console.log(`[regen] \u2705 \u0413\u043E\u0442\u043E\u0432\u043E! ${newImageUrl}`)
}
main().catch((e) => {
  console.error('[regen] \u041E\u0448\u0438\u0431\u043A\u0430:', e)
  process.exit(1)
})
