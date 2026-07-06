#!/bin/bash
# Компилирует TypeScript скрипты content-factory в *.compiled.js (ESM, Node)
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

npx esbuild lib/telegram.ts lib/yandex.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outdir=lib

npx esbuild analyst.ts writer.ts publisher.ts content-bot.ts scheduler.ts regen.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --external:@anthropic-ai/sdk \
  --outdir=. \
  --out-extension:.js=.compiled.js

echo "✓ lib/telegram  lib/yandex  analyst  writer  publisher  content-bot  scheduler  regen"
