#!/bin/bash
# Компилирует TypeScript скрипты content-factory в *.compiled.js (ESM, Node)
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

# Только те модули lib, у которых нет юнит-тестов: собранный lib/X.js перебивает
# lib/X.ts при разрешении модулей в jest, и тест падает на ESM-бандле.
# Всё остальное едет внутрь бандлов ниже.
npx esbuild lib/telegram.ts lib/yandex.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outdir=lib

npx esbuild analyst.ts writer.ts boost.ts publisher.ts content-bot.ts scheduler.ts regen.ts warm-lsi-cache.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --external:@anthropic-ai/sdk \
  --outdir=. \
  --out-extension:.js=.compiled.js

echo "✓ lib/telegram  lib/yandex  analyst  writer  boost  publisher  content-bot  scheduler  regen  warm-lsi-cache"
