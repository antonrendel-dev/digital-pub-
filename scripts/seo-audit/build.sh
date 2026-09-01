#!/bin/bash
# Компилирует findings.ts → findings.mjs.
# Логика находок живёт в TypeScript, чтобы её покрывали юнит-тесты: jest не
# читает голый .mjs. Всё остальное в каталоге — обычные ESM-скрипты для node.
#
# Имя выходного файла отличается от исходника намеренно. Расширение .mjs стоит
# в списке разрешения модулей jest РАНЬШЕ .ts, поэтому findings.mjs рядом с
# findings.ts перебивал бы исходник, и тест падал бы на ESM-бандле.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"
for m in findings task-format articles volume-gate; do
  npx esbuild "$m.ts" --platform=node --format=esm --outfile="$m.compiled.mjs" --log-level=warning
done
echo "✓ findings  task-format  articles  volume-gate — .compiled.mjs"
