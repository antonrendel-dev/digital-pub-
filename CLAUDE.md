# Project: Диджитал Паб

> **Job board website aggregating vacancies and resumes from Telegram channels — d-pub.ru**

---

## How This Project Works

**Context:** All project knowledge is in `.claude/skills/project-knowledge/` skill with guides for architecture, patterns, and deployment (+ optional UX guidelines and domain-specific files).

**Default branch:** `dev`

**Library Documentation:** Always use context7 when you need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without user having to explicitly ask.

## Agent Quality Gates — ОБЯЗАТЕЛЬНО

Агенты принимают работу друг друга. Задача НЕ считается выполненной без вердикта принимающего агента.

| Кто делает | Кто принимает | Критерий приёмки                                                     |
| ---------- | ------------- | -------------------------------------------------------------------- |
| writer     | seo           | Контент соответствует ТЗ: объём, ключи, структура H2, FAQ ≥ 120 слов |
| dev        | review        | Код без P0/P1 замечаний из code-review                               |
| seo        | analyst       | Данные проверены на актуальность, позиции/частоты подтверждены       |
| marketer   | seo           | SEO-импликации контент-плана проверены                               |

**Как работает цепочка:**

1. Агент A выполняет задачу → коммитит/сохраняет результат
2. Агент A явно указывает в итоге: «Готово для проверки агентом B»
3. Оркестратор (Claude) запускает агента B с результатом агента A
4. Агент B даёт вердикт: «Принято» или «Не принято — правки: [список]»
5. При «Не принято» → агент A исправляет → цикл повторяется (макс. 2 итерации)

**Без финального «Принято» от принимающего агента — задача в Todoist не переносится в «Готово».**

## SEO Agents

Before running any SEO, analytics, or marketing audit — read `.claude/seo-done.md` first.
It lists all already-implemented SEO items so you don't report them as missing.
Always verify by reading the source code files listed there, not Payload CMS fields.
