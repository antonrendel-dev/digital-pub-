#!/bin/bash
# Компилирует TypeScript-части в *.compiled.mjs.
# Логика выбора и тексты живут в TypeScript ради тестов: jest не читает голый
# .mjs. Имя выходного файла отличается от исходника намеренно — расширение
# .mjs стоит в разрешении модулей jest раньше .ts и перебивало бы исходник.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"
for m in select message; do
  # --bundle обязателен: message.ts импортирует select.ts, и без сборки в одном
  # файле остаётся ссылка на «./select», которой в рантайме не существует.
  npx esbuild "$m.ts" --bundle --platform=node --format=esm --outfile="$m.compiled.mjs" --log-level=warning
done
echo "✓ select.compiled.mjs  message.compiled.mjs"
