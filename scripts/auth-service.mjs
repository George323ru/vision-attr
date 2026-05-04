import http from "node:http";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const PORT = Number(process.env.DASHBOARD_AUTH_PORT || 8790);
const SESSION_COOKIE = "logos_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const MAX_FORM_BODY_BYTES = 16 * 1024;
const textEncoder = new TextEncoder();

export function sanitizeNext(value) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function buildSessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function validateConfig(env = process.env) {
  const user = env.DASHBOARD_AUTH_USER || "";
  const passwordHash = env.DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH || "";
  const sessionSecret = env.DASHBOARD_AUTH_SESSION_SECRET || "";

  if (!user) throw new Error("DASHBOARD_AUTH_USER is required");
  if (!/^[A-Za-z0-9_.@-]+$/.test(user)) {
    throw new Error("DASHBOARD_AUTH_USER may contain only letters, digits, '_', '.', '@', and '-'");
  }
  if (!passwordHash) throw new Error("DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH is required");
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
    throw new Error("DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH must be a bcrypt hash");
  }
  if (!sessionSecret) throw new Error("DASHBOARD_AUTH_SESSION_SECRET is required");
  if (sessionSecret.length < 32) {
    throw new Error("DASHBOARD_AUTH_SESSION_SECRET must be at least 32 characters");
  }

  return { user, passwordHash, sessionSecret };
}

export async function readFormBody(req, maxBytes = MAX_FORM_BODY_BYTES) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw Object.assign(new Error("Request body is too large"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end();
}

function sendStatus(res, status) {
  res.writeHead(status, { "Cache-Control": "no-store" });
  res.end();
}

function renderLoginPage({ next = "/", error = false } = {}) {
  const safeNext = sanitizeNext(next);
  const errorHtml = error
    ? '<p class="error" role="alert">Неверный логин или пароль</p>'
    : "";

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LOGOS v3.0 - вход</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --text: #111827;
      --muted: #64748b;
      --line: #dbe3ef;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --danger-bg: #fef2f2;
      --danger-text: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(100%, 400px);
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.15;
      letter-spacing: 0;
    }
    .subtitle {
      margin: 0 0 28px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.45;
    }
    label {
      display: block;
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 650;
    }
    input[type="text"],
    input[type="password"] {
      width: 100%;
      height: 44px;
      margin: 0 0 18px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--text);
      background: #fff;
      font: inherit;
    }
    input:focus {
      outline: 2px solid rgba(37, 99, 235, 0.22);
      border-color: var(--accent);
    }
    button {
      width: 100%;
      height: 44px;
      border: 0;
      border-radius: 6px;
      color: #fff;
      background: var(--accent);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button:hover { background: var(--accent-hover); }
    .error {
      margin: 0 0 18px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--danger-bg);
      color: var(--danger-text);
      font-size: 14px;
      line-height: 1.35;
    }
    @media (max-width: 420px) {
      body { padding: 16px; }
      main { padding: 24px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>LOGOS v3.0</h1>
    <p class="subtitle">Закрытый дашборд жизненных аттракторов. Введите логин и пароль.</p>
    ${errorHtml}
    <form method="post" action="/auth/login" autocomplete="on">
      <input type="hidden" name="next" value="${escapeHtml(safeNext)}">
      <label for="username">Логин</label>
      <input id="username" name="username" type="text" autocomplete="username" required autofocus>
      <label for="password">Пароль</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Войти</button>
    </form>
  </main>
</body>
</html>`;
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${name}=`;
  const match = cookies.find((item) => item.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

async function createSessionToken(config) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(config.user)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(textEncoder.encode(config.sessionSecret));
}

async function verifySessionToken(token, config) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, textEncoder.encode(config.sessionSecret), {
      algorithms: ["HS256"],
    });
    return payload.sub === config.user;
  } catch {
    return false;
  }
}

async function handleLoginPost(req, res, config) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    sendStatus(res, 415);
    return;
  }

  let body;
  try {
    body = await readFormBody(req);
  } catch (error) {
    sendStatus(res, error.statusCode || 400);
    return;
  }

  const next = sanitizeNext(body.get("next") || "/");
  const username = body.get("username") || "";
  const password = body.get("password") || "";
  const userMatches = username === config.user;
  const passwordMatches = await bcrypt.compare(password, config.passwordHash);

  if (!userMatches || !passwordMatches) {
    redirect(res, `/login?error=1&next=${encodeURIComponent(next)}`);
    return;
  }

  const token = await createSessionToken(config);
  redirect(res, next, { "Set-Cookie": buildSessionCookie(token) });
}

export function createAuthServer(config = validateConfig()) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");

      if (req.method === "GET" && url.pathname === "/login") {
        sendHtml(res, 200, renderLoginPage({
          next: sanitizeNext(url.searchParams.get("next") || "/"),
          error: url.searchParams.get("error") === "1",
        }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/login") {
        await handleLoginPost(req, res, config);
        return;
      }

      if (req.method === "GET" && url.pathname === "/check") {
        const ok = await verifySessionToken(getCookie(req, SESSION_COOKIE), config);
        sendStatus(res, ok ? 204 : 401);
        return;
      }

      if (req.method === "POST" && url.pathname === "/logout") {
        redirect(res, "/login", { "Set-Cookie": clearSessionCookie() });
        return;
      }

      sendStatus(res, 404);
    } catch (error) {
      console.error("[auth-service]", error.message);
      sendStatus(res, 500);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createAuthServer(validateConfig());
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[auth-service] listening on 127.0.0.1:${PORT}`);
  });
}
