import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const nginxConfig = readFileSync(new URL("../nginx.conf", import.meta.url), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locationBlock(name) {
  const pattern = new RegExp(`location ${escapeRegExp(name)} \\{([\\s\\S]*?)\\n    \\}`, "m");
  const match = nginxConfig.match(pattern);
  return match?.[1] || "";
}

describe("nginx auth routing", () => {
  it("protects app routes through the internal auth check", () => {
    assert.match(nginxConfig, /auth_request \/auth\/check;/);
    assert.match(locationBlock("= /auth/check"), /internal;/);
    assert.match(locationBlock("= /auth/check"), /proxy_pass http:\/\/127\.0\.0\.1:8790\/check;/);
  });

  it("keeps auth and health routes public", () => {
    assert.match(locationBlock("= /healthz"), /auth_request off;/);
    assert.match(locationBlock("= /login"), /auth_request off;/);
    assert.match(locationBlock("= /auth/login"), /auth_request off;/);
    assert.match(locationBlock("= /auth/logout"), /auth_request off;/);
  });

  it("preserves the full protected URL in login redirects", () => {
    const redirectBlock = locationBlock("@login_redirect");

    assert.match(redirectBlock, /return 302 \/login\?next=\$request_uri;/);
    assert.doesNotMatch(redirectBlock, /return 302 \/login\?next=\$uri;/);
  });

  it("rate limits login attempts", () => {
    assert.match(nginxConfig, /limit_req_zone \$binary_remote_addr zone=auth:10m rate=10r\/m;/);
    assert.match(locationBlock("= /auth/login"), /limit_req zone=auth burst=10 nodelay;/);
  });
});
