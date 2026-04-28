# Подключение сетевого диска к контейнеру на хостинге

Пошаговый гайд, как подключить сетевой (персистентный) диск к Docker-контейнеру с SPA и
отдавать с него данные во фронт через nginx. Подходит для любого проекта на статике
(Vue / React / Svelte / чистый HTML), где нужно читать внешние JSON/CSV/файлы, которые
обновляются **независимо от сборки образа**.

---

## 1. Зачем это нужно

Типичная проблема: данные меняются чаще, чем код. Если положить JSON/CSV внутрь образа
— каждое обновление данных = пересборка и передеплой. Решение — вынести данные на
**сетевой диск** (volume), который монтируется в контейнер снаружи:

- данные живут отдельно от образа
- обновление файла = просто заменить его на диске, без пересборки
- несколько реплик контейнера могут читать один и тот же диск
- данные переживают пересоздание контейнера

---

## 2. Архитектурная схема

```
Браузер
  │
  │ GET /data/foo.json
  ▼
┌─────────────────────────────┐
│ Container (nginx + SPA)     │
│                             │
│  /usr/share/nginx/html/     │  ← статика из сборки (dist/)
│  /app/data/                 │  ← точка монтирования сетевого диска
│                             │
│  nginx.conf:                │
│    location /data/ {        │
│      alias /app/data/;      │
│    }                        │
└───────────┬─────────────────┘
            │
            │ mount
            ▼
   ┌──────────────────────┐
   │ Сетевой диск         │
   │  foo.json            │
   │  bar.json            │
   └──────────────────────┘
```

**Ключевая идея:** nginx — это простой HTTP-сервер статики. Он не «читает с диска» в
каком-то особом смысле. Он просто отдаёт файлы по HTTP. Volume лишь подкладывает
файлы в нужную папку внутри контейнера.

---

## 3. Что нужно сделать (чек-лист)

1. **Dockerfile** — multi-stage: сборка фронта + nginx для раздачи
2. **nginx.conf** — добавить `location /data/` с `alias` на точку монтирования
3. **Фронт** — делать `fetch('/data/<file>')` вместо импорта из исходников
4. **Хостинг** — создать сетевой диск и указать точку монтирования `<disk_name>:/app/data`
5. **Данные** — залить файлы на сетевой диск (через панель / SSH / rsync)

---

## 4. Dockerfile (шаблон)

```dockerfile
# Stage 1: сборка SPA
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: раздача nginx-ом
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx от непривилегированного пользователя (best practice)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 8847
CMD ["nginx", "-g", "daemon off;"]
```

Что здесь важно:
- **Multi-stage** — в финальном образе нет Node/npm, только nginx + статика (образ
  ~20 МБ).
- **Точка монтирования диска (`/app/data`) в Dockerfile НЕ создаётся и НЕ упоминается.**
  Она появится в контейнере в момент запуска, когда хостинг смонтирует volume.
- **Порт** выбираешь любой свободный (здесь 8847). Хостинги часто сами роутят внешний
  порт → на тот, который слушает контейнер.

---

## 5. nginx.conf (шаблон)

```nginx
server {
    listen 8847;
    server_name _;
    server_tokens off;
    root /usr/share/nginx/html;
    index index.html;

    # Безопасность
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback: любой маршрут → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ★ РАЗДАЧА ДАННЫХ С СЕТЕВОГО ДИСКА ★
    location /data/ {
        alias /app/data/;
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Кеширование собранных ассетов (с хешем в имени)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
```

### Разбор `location /data/`

- **`alias /app/data/;`** — запрос `GET /data/foo.json` физически читается как
  `/app/data/foo.json`. Именно сюда хостинг смонтирует сетевой диск.
- **`Cache-Control: no-cache`** — чтобы после замены файла на диске браузер не
  отдавал старую версию из кеша. Данные меняются — статика нет.
- **Слэши в конце обязательны** в обоих местах (`/data/` и `/app/data/`) — иначе
  nginx работает в режиме prefix-replace и пути ломаются.

### `alias` vs `root` — не перепутай

```nginx
# ПРАВИЛЬНО — alias заменяет префикс
location /data/ {
    alias /app/data/;   # /data/foo.json → /app/data/foo.json
}

# НЕПРАВИЛЬНО для этой задачи — root приклеивает URL к пути
location /data/ {
    root /app;          # /data/foo.json → /app/data/foo.json (СОВПАЛО СЛУЧАЙНО)
}

# СЛОМАЕТСЯ — если переименовать location
location /files/ {
    root /app/data;     # /files/foo.json → /app/data/files/foo.json (НЕ НАЙДЁТ)
}
```

Короткое правило: **для монтирования volume под кастомный URL — только `alias`**.

---

## 6. Код фронта

Клади запросы на абсолютный путь:

```ts
// ПРАВИЛЬНО — абсолютный путь, работает при деплое в корень домена
const r = await fetch('/data/foo.json')

// РИСКОВАННО — относительный путь, ломается если SPA задеплоят в подпапку
const r = await fetch('./data/foo.json')
```

Данные **нельзя импортировать как модуль** (`import data from '.../foo.json'`), потому
что это зашьёт их в бандл и ты потеряешь весь смысл вынесения на volume.

Минимальный загрузчик:

```ts
export async function loadData<T>(path: string): Promise<T> {
  const r = await fetch(`/data/${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${path}`)
  return r.json()
}
```

---

## 7. Настройка на хостинге

Формат поля «Сетевые диски» (например, в Yandex Cloud Serverless Containers, Beget,
Timeweb и т.п.):

```
<имя_диска>:<точка_монтирования_в_контейнере>
```

Пример:

```
my-project-data:/app/data
```

Что это значит:
- `my-project-data` — имя сетевого диска, который ты создал в панели хостинга
- `/app/data` — куда он будет виден внутри контейнера

### Требования к точке монтирования
- **Должна начинаться с `/`** (абсолютный путь)
- **Не может быть корнем `/`** — иначе перезаписала бы всю ФС контейнера
- **Должна совпадать с тем, что указано в `alias` nginx-а** — иначе nginx будет
  искать файлы не там, где они лежат

### subPath (опционально)

Если на одном большом диске хранятся данные нескольких проектов, можно монтировать
только подпапку:

```
<путь_на_диске>:<путь_в_контейнере>
project-a/prod:/app/data
```

Тогда в контейнер попадёт только `project-a/prod/`, а не весь диск.

---

## 8. Заливка данных на диск

Варианты по убыванию удобства:

1. **Файловый менеджер в панели хостинга** — drag-n-drop, для разовых обновлений.
2. **SSH/SFTP** — если хостинг даёт доступ к VM, на которой смонтирован диск:
   ```bash
   scp data/*.json user@host:/mnt/disks/my-project-data/
   ```
3. **rsync** — для инкрементальных обновлений:
   ```bash
   rsync -avz --delete ./data/ user@host:/mnt/disks/my-project-data/
   ```
4. **CI/CD** — деплой-скрипт в GitHub Actions, который после сборки заливает свежие
   файлы на диск (rsync/S3 sync/облачный CLI).
5. **Отдельный init-контейнер** — стартует перед основным, скачивает данные из
   S3/GCS и кладёт на volume. Подходит, если источник истины — облачный bucket.

---

## 9. Проверка после деплоя

```bash
# 1. Контейнер поднялся?
curl -I https://<твой_домен>/
# → HTTP/2 200

# 2. Данные отдаются?
curl https://<твой_домен>/data/foo.json | head
# → содержимое JSON

# 3. Заголовки не кешируются?
curl -I https://<твой_домен>/data/foo.json | grep -i cache
# → Cache-Control: no-cache

# 4. Обнови файл на диске, повтори curl — должен прийти новый контент без рестарта
```

---

## 10. Типичные грабли

| Симптом | Причина | Фикс |
|---|---|---|
| `404 Not Found` на `/data/foo.json` | Диск не смонтирован или точка монтирования ≠ `alias` | Сверить `<mount_path>` на хостинге с `alias` в nginx |
| `403 Forbidden` | nginx бежит под `nginx`, а файлы принадлежат `root` без read-прав | `chmod -R a+r` на диске или монтировать с правильным `uid/gid` |
| Старые данные после обновления | Браузер/CDN закешировал | Убедиться, что `Cache-Control: no-cache` доходит до клиента; проверить CDN |
| Файлы есть, но отдаётся `index.html` | `location /data/` попал **после** catch-all `location /` | nginx матчит по специфичности — должно работать, но если переписал — вернуть `try_files` только в `location /` |
| `500` при старте nginx | Забытый `/` в конце `alias` или `location` | Проверить слэши |
| Данные пропадают после передеплоя | На самом деле данные лежат в образе, а не на диске | Убедиться что volume реально смонтирован (`docker exec ls /app/data` или аналог в панели) |

---

## 11. Безопасность

- **Это публичный URL.** Всё, что лежит на диске по `/data/`, может скачать любой.
  Не клади туда PII, секреты, приватные данные пользователей.
- **Если данные чувствительные** — нужен бэкенд с аутентификацией. Nginx-alias для
  этого не годится.
- `X-Content-Type-Options: nosniff` + строгий `Content-Security-Policy` в nginx
  снижают риск XSS через подменённый JSON (если в JSON попадёт HTML/JS).

---

## 12. Если нужна запись с фронта

Nginx умеет только отдавать файлы — записывать с фронта через него нельзя. Если
нужны uploads/правки данных юзером, есть варианты:

1. **Добавить бэкенд-сервис** (Node/Python/Go) рядом в том же контейнере или
   отдельно. Он монтирует тот же volume по записи и принимает POST-запросы с фронта.
2. **Прямой аплоад в object storage** (S3/GCS) — фронт получает presigned URL от
   маленькой serverless-функции, льёт файл прямо в bucket. Volume тогда не нужен.
3. **Git-as-storage** — фронт открывает PR с новым JSON через GitHub API.
   Подходит для редких редакций редакторами-людьми.

Volume + nginx — это **read-only** паттерн по своей природе. Пытаться прикрутить
запись через nginx WebDAV-модуль можно, но на практике это почти всегда плохая идея.

---

## 13. Сводная диаграмма mapping-ов

```
Хостинг (UI)                  Контейнер                   Nginx                  Браузер
────────────                  ─────────                   ─────                  ───────
my-data:/app/data   ───▶    /app/data/foo.json    ◀──   alias /app/data/   ◀──  fetch('/data/foo.json')
(network disk)              (mount point)                location /data/
```

Три куска, которые **обязаны совпадать**:
1. Путь монтирования на хостинге → `/app/data`
2. `alias` в nginx → `/app/data/`
3. URL в `fetch()` → `/data/...` (соответствует `location /data/`)

Сломай одно звено — всё перестаёт работать. Отсюда: при настройке нового проекта
проверяй эти три места в первую очередь.

---

## 14. Быстрый стартовый набор для нового проекта

1. Скопировать `Dockerfile` и `nginx.conf` из этого проекта, заменить порт/имена.
2. В коде фронта заменить `import data from '...'` на `await fetch('/data/...')`.
3. В панели хостинга создать сетевой диск, указать `<имя>:/app/data`.
4. Залить на диск нужные файлы.
5. Собрать и задеплоить контейнер.
6. Прогнать `curl` из раздела 9 для проверки.

Готово.
