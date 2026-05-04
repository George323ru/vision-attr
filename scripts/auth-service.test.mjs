import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSessionCookie,
  clearSessionCookie,
  readFormBody,
  sanitizeNext,
  validateConfig,
} from "./auth-service.mjs";

describe("auth service helpers", () => {
  it("keeps only safe relative next paths", () => {
    assert.equal(sanitizeNext("/"), "/");
    assert.equal(sanitizeNext("/graph?node=l2_semya_03"), "/graph?node=l2_semya_03");
    assert.equal(sanitizeNext("https://evil.example/path"), "/");
    assert.equal(sanitizeNext("//evil.example/path"), "/");
    assert.equal(sanitizeNext("graph"), "/");
    assert.equal(sanitizeNext(""), "/");
  });

  it("sets and clears a secure httpOnly session cookie", () => {
    assert.equal(
      buildSessionCookie("token-value"),
      "logos_session=token-value; Max-Age=28800; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    assert.equal(
      clearSessionCookie(),
      "logos_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
  });

  it("fails closed when auth env is missing or malformed", () => {
    assert.throws(() => validateConfig({}), /DASHBOARD_AUTH_USER is required/);
    assert.throws(
      () => validateConfig({
        DASHBOARD_AUTH_USER: "logos",
        DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH: "not-a-bcrypt-hash",
        DASHBOARD_AUTH_SESSION_SECRET: "01234567890123456789012345678901",
      }),
      /DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH must be a bcrypt hash/,
    );
    assert.throws(
      () => validateConfig({
        DASHBOARD_AUTH_USER: "logos",
        DASHBOARD_AUTH_PASSWORD_BCRYPT_HASH: "$2b$10$TG1cqX6TWJ9/8S/I7j2Nmu2u.3rmYJ1S3k0iQIYC.H.8MSiP5iPwO",
        DASHBOARD_AUTH_SESSION_SECRET: "short",
      }),
      /DASHBOARD_AUTH_SESSION_SECRET must be at least 32 characters/,
    );
  });

  it("rejects oversized login bodies", async () => {
    async function* chunks() {
      yield Buffer.alloc(17 * 1024, "a");
    }

    await assert.rejects(readFormBody(chunks()), { statusCode: 413 });
  });
});
