#!/bin/bash
# Компилирует TypeScript скрипты content-factory в *.compiled.js (ESM, Node)
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

npx esbuild analyst.ts writer.ts publisher.ts content-bot.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --external:@anthropic-ai/sdk \
  --outdir=. \
  --out-extension:.js=.compiled.js

echo "✓ analyst  writer  publisher  content-bot"
