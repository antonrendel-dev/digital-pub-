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

## Key Features

| Feature | Priority | In MVP |
|---|---|---|
| Unified feed on main page (vacancies + resumes) | Critical | Yes |
| Separate sections: Вакансии, Резюме, Статьи | Critical | Yes |
| Tag-based filtering (format, level, specialization) | Critical | Yes |
| Categories with counts (Разработка, Маркетинг, Дизайн, etc.) | Critical | Yes |
| Auto-sync from Telegram channels via t.me/s/ parser | Critical | Yes |
| User submission form (vacancy or resume) with moderation | Critical | Yes |
| Admin panel (moderation queue, content management) | Critical | Yes |
| Articles section for SEO indexing | Important | Yes |
| Search by title, company, skill | Important | Yes |
| Social channel subscription cards (Telegram, VK, Max) | Important | Yes |
| Platform statistics display (total vacancies, resumes, companies) | Nice-to-have | Yes |

---

## Categories

Разработка, Маркетинг, Дизайн, Продажи, Аналитика, Финансы, HR

## Tag Types

- **Format:** Удалённо, Офис, Гибрид, Полная занятость, Частичная
- **Level:** Junior, Middle, Senior
- **Specialization:** IT, Дизайн, Маркетинг, Финансы, Аналитика, HR

---

## Scope Boundaries

**In scope:**
- Aggregating content from public Telegram channels (independent from Вакансы bot)
- User-submitted vacancies and resumes (with admin moderation before publishing)
- Articles section managed via admin panel
- Single admin user

**Out of scope:**
- User accounts / personal profiles for job seekers or employers
- Direct messaging between users on the site
- Payment / premium listings
- Mobile app
- Multi-admin / team roles
- Shared data or integration with the Вакансы Telegram bot (fully independent project)
