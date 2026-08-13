# Multi Photo Change Date

> Privacy-first пакетный редактор даты съёмки фотографий и видео. Работает локально в браузере, показывает структуру папок и умеет безопасно перезаписывать оригиналы после подтверждения.

![Version](https://img.shields.io/badge/version-1.1.0-9a63ff)
![Runtime](https://img.shields.io/badge/runtime-browser-55f58b)
![Tests](https://img.shields.io/badge/tests-node%3Atest-55f58b)
![License](https://img.shields.io/badge/license-MIT-blue)

## Зачем этот проект

Файловые менеджеры меняют время файла, но не всегда корректно обновляют дату съёмки внутри EXIF. Multi Photo Change Date решает эту задачу для одной фотографии, выбранной группы или целой папки и сохраняет привычный визуальный workflow фототеки.

Ключевой принцип — локальная обработка. Фотографии не отправляются на сервер: чтение, предпросмотр и изменение метаданных выполняются в браузере пользователя.

## Возможности

- пакетное изменение `EXIF DateTime`, `DateTimeOriginal` и `DateTimeDigitized`;
- изменение временных полей MP4/MOV/M4V;
- сортировка по дате и имени, ленивое создание превью;
- работа с деревом папок через File System Access API;
- перенос одного или нескольких файлов между папками с подтверждением;
- пошаговая отмена изменения дат и переноса файлов;
- сохранение EXIF-ориентации JPEG;
- мобильный выбор файлов и системное меню «Поделиться» на iPhone;
- автономный запуск без установки зависимостей.

## Быстрый запуск

### Пользовательская ПК-версия

1. Скачайте репозиторий или релиз.
2. Откройте `start.html` либо запустите `START.cmd`.
3. Нажмите «Добавить папку» и предоставьте браузеру доступ на чтение и запись.

Рекомендуемый браузер для работы с оригиналами и папками — актуальный Chrome или Edge.

### Режим разработки

```bash
npm install
npm run verify
npm run dev
```

Локальный просмотр автономного файла:

```bash
npm run preview:standalone
```

Приложение откроется на `http://127.0.0.1:4173`.

## Структура

| Часть | Назначение |
|---|---|
| `start.html`, `PhotoDate.html` | автономный ПК/мобильный дистрибутив |
| `public/PhotoDate.html` | тот же дистрибутив для веб-хостинга |
| `app/` | минимальная Next/vinext-оболочка деплоя |
| `scripts/` | локальный сервер и структурная проверка bundle |
| `tests/` | регрессионные проверки ключевых возможностей |
| `docs/` | архитектура, решения и ограничения |

Подробности: [архитектура](docs/ARCHITECTURE.md) и [руководство разработчика](CONTRIBUTING.md).

## Безопасность операций

- изменение оригиналов и перенос требуют явного подтверждения;
- при совпадении имён перенос останавливается без перезаписи;
- undo хранит до 20 действий в памяти текущей вкладки;
- неизвестные файлы не отправляются во внешние сервисы;
- доступ к папкам существует только в рамках разрешений браузера.

Перед массовой обработкой уникального архива рекомендуется иметь внешнюю резервную копию. Подробнее — в [SECURITY.md](SECURITY.md).

## Проверка качества

```bash
npm run verify
npm run build
npm run lint
```

`verify` проверяет синтаксис всех встроенных скриптов трёх entrypoint-файлов и наличие критичных сценариев: EXIF, видео, undo и перенос между каталогами.

## Версии

- `v1.0` — зафиксированная рабочая базовая версия.
- `v1.1` — структурированный репозиторий, документация и автоматические проверки.

Полная история — в [CHANGELOG.md](CHANGELOG.md).

## Лицензия

MIT — см. [LICENSE](LICENSE).

<!-- Legacy starter README kept in Git history (tag v1.0).

# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
-->
