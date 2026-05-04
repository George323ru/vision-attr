# Production Form Login Auth

Продовый Docker-образ закрывает Vue-приложение, assets и `/data/*` серверной
авторизацией до загрузки фронтенда. Nginx использует `auth_request`, а локальный
Node auth service слушает только `127.0.0.1:8790`.

Публичные routes:

```txt
GET  /login
POST /auth/login
POST /auth/logout
GET  /healthz
```

Без валидной cookie прямой доступ к `/`, SPA routes, `/assets/*` и `/data/*`
редиректит на `/login`.

## Env

Контейнер стартует fail-closed и требует:

```txt
DASHBOARD_AUTH_USER=logos
DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH=$2b$...
DASHBOARD_AUTH_SESSION_SECRET=<random-32+-chars-secret>
```

Plain-text пароль не хранится в репозитории и не передается в контейнер.
`DASHBOARD_AUTH_SESSION_SECRET` должен быть стабильным между рестартами, иначе
активные сессии станут невалидными.

## Генерация значений

```bash
npm run auth:hash -- 'plain-password'
openssl rand -base64 32
```

Hash содержит `$`, поэтому в shell и `.env` контекстах его нужно заключать в
одинарные кавычки.

## Проверка

```bash
npm run test
npm run build
docker build -t vision-attractor .
```

Fail-closed:

```bash
docker run --rm vision-attractor
# expected: DASHBOARD_AUTH_USER is required

docker run --rm -e DASHBOARD_AUTH_USER=logos vision-attractor
# expected: DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH is required
```

HTTP smoke:

```bash
docker run --rm -d --name vision-auth-test \
  -p 8847:8847 \
  -e DASHBOARD_AUTH_USER=logos \
  -e 'DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH=$2b$...' \
  -e DASHBOARD_AUTH_SESSION_SECRET=01234567890123456789012345678901 \
  vision-attractor

curl -i http://127.0.0.1:8847/
# expected: 302 Location: /login?next=/

curl -i 'http://127.0.0.1:8847/graph?x=1'
# expected: 302 Location: /login?next=/graph?x=1

curl -i http://127.0.0.1:8847/data/attractors.json
# expected: 302 to /login; not JSON

curl -i http://127.0.0.1:8847/healthz
# expected: 204 without auth

docker stop vision-auth-test
```

Successful browser login should be checked over HTTPS, because the session cookie is
intentionally `Secure`, `HttpOnly`, `SameSite=Lax`.
