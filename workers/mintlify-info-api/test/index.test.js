import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";

const ORIGIN = "https://mintietest.mintlify.site";
const GROUPS_CLAIM = "https://morsemicro.com/groups";
const NOW_MS = 1_700_000_000_000;
const OPENWEATHER_API_KEY = "test-openweather-api-key";

const env = {
  ALLOWED_ORIGIN: ORIGIN,
  AUTH0_DOMAIN: "dev-4zlll1o27ywd47q5.us.auth0.com",
  AUTH0_GROUPS_CLAIM: GROUPS_CLAIM,
  AUTH0_NAME_CLAIM: "name",
  ALLOWED_GROUPS: "partner,enterprise",
  SESSION_TTL_SECONDS: "900",
  OPENWEATHER_API_KEY,
};

test("answers allowed CORS preflight requests", async () => {
  const response = await handleRequest(
    request("/userinfo", {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    }),
    env,
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.match(
    response.headers.get("Access-Control-Allow-Headers"),
    /Authorization/,
  );
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
});

test("rejects browser requests from another origin", async () => {
  let upstreamCalled = false;
  const response = await handleRequest(
    request("/userinfo", {
      headers: {
        Origin: "https://attacker.example",
        Authorization: "Bearer token",
      },
    }),
    env,
    {
      fetch: async () => {
        upstreamCalled = true;
      },
    },
  );

  assert.equal(response.status, 403);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    null,
  );
  assert.equal(upstreamCalled, false);
});

test("requires an OAuth bearer token", async () => {
  const response = await handleRequest(
    request("/userinfo", {
      headers: { Origin: ORIGIN },
    }),
    env,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("returns enterprise membership and the Auth0 user's name", async () => {
  const token = unsignedJwt({ exp: 1_700_000_600 });
  const response = await handleRequest(
    request("/userinfo", {
      headers: {
        Origin: ORIGIN,
        Authorization: `Bearer ${token}`,
      },
    }),
    env,
    {
      now: () => NOW_MS,
      fetch: async (url, init) => {
        assert.equal(
          url.href,
          "https://dev-4zlll1o27ywd47q5.us.auth0.com/userinfo",
        );
        assert.equal(init.headers.Authorization, `Bearer ${token}`);
        assert.equal(init.redirect, "manual");
        return Response.json({
          sub: "auth0|user_123",
          name: "Ada Lovelace",
          [GROUPS_CLAIM]: ["member", "enterprise"],
        });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_600,
    groups: ["enterprise"],
    content: {
      name: "Ada Lovelace",
    },
    apiPlaygroundInputs: {
      query: {
        appid: OPENWEATHER_API_KEY,
      },
    },
  });
});

test("returns personalization for a non-enterprise user", async () => {
  const response = await handleRequest(
    authenticatedRequest(),
    env,
    {
      now: () => NOW_MS,
      fetch: async () =>
        Response.json({
          sub: "auth0|user_456",
          name: "Grace Hopper",
          [GROUPS_CLAIM]: ["member"],
        }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_900,
    groups: [],
    content: {
      name: "Grace Hopper",
    },
    apiPlaygroundInputs: {
      query: {
        appid: OPENWEATHER_API_KEY,
      },
    },
  });
});

test("returns partner membership from the Auth0 custom claim", async () => {
  const response = await handleRequest(
    authenticatedRequest(),
    env,
    {
      now: () => NOW_MS,
      fetch: async () =>
        Response.json({
          sub: "auth0|user_246",
          name: "Mary Jackson",
          [GROUPS_CLAIM]: ["member", "partner"],
        }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_900,
    groups: ["partner"],
    content: {
      name: "Mary Jackson",
    },
    apiPlaygroundInputs: {
      query: {
        appid: OPENWEATHER_API_KEY,
      },
    },
  });
});

test("supports nested and delimited group claims", async () => {
  const response = await handleRequest(
    authenticatedRequest(),
    {
      ...env,
      AUTH0_GROUPS_CLAIM: "app_metadata.groups",
      GROUPS_DELIMITER: "|",
    },
    {
      now: () => NOW_MS,
      fetch: async () =>
        Response.json({
          sub: "auth0|user_789",
          name: "Katherine Johnson",
          app_metadata: {
            groups: "member | enterprise",
          },
        }),
    },
  );

  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_900,
    groups: ["enterprise"],
    content: {
      name: "Katherine Johnson",
    },
    apiPlaygroundInputs: {
      query: {
        appid: OPENWEATHER_API_KEY,
      },
    },
  });
});

test("supports a configured Auth0 name claim", async () => {
  const response = await handleRequest(
    authenticatedRequest(),
    {
      ...env,
      AUTH0_NAME_CLAIM: "app_metadata.displayName",
    },
    {
      now: () => NOW_MS,
      fetch: async () =>
        Response.json({
          sub: "auth0|user_321",
          name: "Ignored default name",
          app_metadata: {
            displayName: "  Dorothy Vaughan  ",
          },
          [GROUPS_CLAIM]: ["enterprise"],
        }),
    },
  );

  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_900,
    groups: ["enterprise"],
    content: {
      name: "Dorothy Vaughan",
    },
    apiPlaygroundInputs: {
      query: {
        appid: OPENWEATHER_API_KEY,
      },
    },
  });
});

test("does not invent a name when Auth0 omits it", async () => {
  const response = await handleRequest(
    authenticatedRequest(),
    env,
    {
      now: () => NOW_MS,
      fetch: async () =>
        Response.json({
          sub: "auth0|user_654",
          [GROUPS_CLAIM]: ["enterprise"],
        }),
    },
  );

  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_900,
    groups: ["enterprise"],
    content: {},
    apiPlaygroundInputs: {
      query: {
        appid: OPENWEATHER_API_KEY,
      },
    },
  });
});

test("omits API playground inputs when the secret is not configured", async () => {
  const { OPENWEATHER_API_KEY: _, ...envWithoutApiKey } = env;
  const response = await handleRequest(
    authenticatedRequest(),
    envWithoutApiKey,
    {
      now: () => NOW_MS,
      fetch: async () =>
        Response.json({
          sub: "auth0|user_654",
          name: "Annie Easley",
          [GROUPS_CLAIM]: ["enterprise"],
        }),
    },
  );

  assert.deepEqual(await response.json(), {
    expiresAt: 1_700_000_900,
    groups: ["enterprise"],
    content: {
      name: "Annie Easley",
    },
  });
});

test("does not expose Auth0 error details", async () => {
  const response = await handleRequest(
    authenticatedRequest(),
    env,
    {
      fetch: async () =>
        Response.json(
          { error: "invalid_token", error_description: "sensitive detail" },
          { status: 401 },
        ),
    },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("rejects Auth0 redirects without following them", async () => {
  const response = await handleRequest(authenticatedRequest(), env, {
    fetch: async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://unexpected.example/userinfo" },
      }),
  });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "identity_provider_unavailable",
  });
});

function authenticatedRequest() {
  return request("/userinfo", {
    headers: {
      Origin: ORIGIN,
      Authorization: "Bearer opaque-access-token",
    },
  });
}

function request(path, init = {}) {
  return new Request(`https://info-api.example${path}`, init);
}

function unsignedJwt(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}
