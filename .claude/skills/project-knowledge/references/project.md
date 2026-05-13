# Project

## Overview

**Name:** Диджитал Паб

**Slogan:** Место, где встречаются хорошие люди

**URL:** d-pub.ru

**Description:** Job board website that aggregates vacancies and resumes from Telegram channels and allows users to submit their own. Content is tagged, categorized, and published in section feeds and a unified main feed. Articles section serves SEO purposes.

---

## Target Audience

**Primary users:** Job seekers and employers in digital professions (IT, design, marketing, analytics, finance, HR, sales).

**Use case:** Find relevant vacancies or candidates without manually monitoring Telegram channels. Submit a vacancy or resume through a web form.

---

## Core Problem

Vacancies and resumes are scattered across Telegram channels and hard to search or filter. This site aggregates them in one place, organizes by tags and categories, and makes them discoverable via search engines.

---

## Key Features (статус после MVP закрытия 2026-05-13)

| Feature | Priority | In MVP |
|---|---|---|
| Unified feed на главной (vacancies + resumes) | Critical | ✅ Done |
| Разделы: Вакансии, Резюме, Статьи | Critical | ✅ Done |
| Tag-based filtering (format/level/specialization) | Critical | ✅ Done |
| SEO-страницы тегов с уникальными h1/meta/seoText | Critical | ✅ Done |
| Auto-sync из Telegram через t.me/s/ + Bot API для фото | Critical | ✅ Done |
| Auto-tagging при sync по keyword map | Critical | ✅ Done |
| Articles section — 10+ MDX-статей в репо | Important | ✅ Done |
| Search по title/description/company (client-side) | Important | ✅ Done |
| Sitemap.xml dynamic + Schema.org + OG-теги | Important | ✅ Done |
| Responsive (320px+, burger menu < md) + dark theme | Critical | ✅ Done |
| Platform statistics (real counts) | Nice-to-have | ✅ Done (кроме «Компании» — всегда 0, поле не парсится) |
| User submission form + moderation + admin panel | Critical | ❌ **Перенесено в итерацию 2** — в MVP через бот `@resume_vac_bot` |

---

## Categories

Разработка, Маркетинг, Дизайн, Продажи, Аналитика, Финансы, HR

## Tag Types

- **Format:** Удалённо, Офис, Гибрид, Полная занятость, Частичная
- **Level:** Junior, Middle, Senior
- **Specialization:** IT, Дизайн, Маркетинг, Финансы, Аналитика, HR

---

## Scope Boundaries

**In scope (MVP):**
- Aggregating content from public Telegram channels (independent from `@vacancy_bot_ren`)
- Articles в виде MDX-файлов в репо (через PR, не UI)
- Анонимный browsing — без авторизации
- Заявки на размещение — через бот `@resume_vac_bot`

**Out of scope (MVP) — итерации 2+:**
- Admin panel (modeation queue, content management)
- User submission form в самом сайте (web)
- User accounts / personal profiles
- Direct messaging между пользователями
- Payment / premium listings
- Mobile app
- Multi-admin / team roles
- Снятие `X-Robots-Tag: noindex` (сайт закрыт от индексации до явной команды)

**Полностью out of scope:** интеграция данных или функциональности с Telegram-ботом `@vacancy_bot_ren` (отдельный проект, только источник постов через публичный t.me/s/).
