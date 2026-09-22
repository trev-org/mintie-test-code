const DEFAULT_ALLOWED_GROUPS = ["enterprise"];
const DEFAULT_SESSION_TTL_SECONDS = 900;
const MAX_SESSION_TTL_SECONDS = 3600;

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request, env, dependencies = {}) {
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin, env.ALLOWED_ORIGIN);

  if (origin && origin !== env.ALLOWED_ORIGIN) {
    return jsonResponse({ error: "origin_not_allowed" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);

  if (url.pathname === "/healthz") {
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  if (url.pathname !== "/userinfo") {
    return jsonResponse({ error: "not_found" }, 404, corsHeaders);
  }

  if (request.method !== "GET") {
    return jsonResponse(
      { error: "method_not_allowed" },
      405,
      corsHeaders,
      { Allow: "GET, OPTIONS" },
    );
  }

  const token = getBearerToken(request.headers.get("Authorization"));

  if (!token) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }

  let auth0UserInfoUrl;

  try {
    auth0UserInfoUrl = buildAuth0UserInfoUrl(env.AUTH0_DOMAIN);
  } catch {
    return jsonResponse({ error: "worker_not_configured" }, 500, corsHeaders);
  }

  let auth0Response;

  try {
    auth0Response = await fetchImpl(auth0UserInfoUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      redirect: "manual",
    });
  } catch (error) {
    console.error("Auth0 user-info request failed", formatError(error));
    return jsonResponse(
      { error: "identity_provider_unavailable" },
      502,
      corsHeaders,
    );
  }

  if (auth0Response.status >= 300 && auth0Response.status < 400) {
    console.warn("Auth0 user-info returned an unexpected redirect", {
      status: auth0Response.status,
    });
    return jsonResponse(
      { error: "identity_provider_unavailable" },
      502,
      corsHeaders,
    );
  }

  if (!auth0Response.ok) {
    console.warn("Auth0 user-info rejected the access token", {
      status: auth0Response.status,
    });
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }

  let profile;

  try {
    profile = await auth0Response.json();
  } catch (error) {
    console.error("Auth0 user-info response was not JSON", formatError(error));
    return jsonResponse(
      { error: "invalid_identity_provider_response" },
      502,
      corsHeaders,
    );
  }

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    console.error("Auth0 user-info returned an invalid response shape");
    return jsonResponse(
      { error: "invalid_identity_provider_response" },
      502,
      corsHeaders,
    );
  }

  const groupsClaim = env.AUTH0_GROUPS_CLAIM || "groups";
  const groups = normalizeGroups(
    readClaim(profile, groupsClaim),
    env.GROUPS_DELIMITER || ",",
  );
  const nameClaim = env.AUTH0_NAME_CLAIM || "name";
  const name = normalizeName(readClaim(profile, nameClaim));
  const configuredAllowedGroups = normalizeGroups(env.ALLOWED_GROUPS, ",");
  const allowedGroups = new Set(
    configuredAllowedGroups.length
      ? configuredAllowedGroups
      : DEFAULT_ALLOWED_GROUPS,
  );
  const nowSeconds = Math.floor(now() / 1000);
  const configuredExpiration =
    nowSeconds + getSessionTtlSeconds(env.SESSION_TTL_SECONDS);
  const tokenExpiration = readJwtExpiration(token);
  const expiresAt =
    tokenExpiration && tokenExpiration > nowSeconds
      ? Math.min(configuredExpiration, tokenExpiration)
      : configuredExpiration;
  const openWeatherApiKey = normalizeSecret(env.OPENWEATHER_API_KEY);

  console.log("Mintlify user-info response ready", {
    auth0Status: auth0Response.status,
  });

  return jsonResponse(
    {
      expiresAt,
      groups: groups.filter((group) => allowedGroups.has(group)),
      content: name ? { name } : {},
      ...(openWeatherApiKey && {
        apiPlaygroundInputs: {
          query: {
            appid: openWeatherApiKey,
          },
        },
      }),
    },
    200,
    corsHeaders,
  );
}

function getCorsHeaders(origin, allowedOrigin) {
  const headers = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };

  if (origin && origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}

function jsonResponse(body, status, corsHeaders = {}, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

function getBearerToken(authorization) {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

function formatError(error) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

function buildAuth0UserInfoUrl(domain) {
  if (!domain || domain.startsWith("YOUR_")) {
    throw new Error("AUTH0_DOMAIN is not configured");
  }

  const url = new URL(
    domain.includes("://") ? domain : `https://${domain}`,
  );

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("AUTH0_DOMAIN must be an HTTPS origin");
  }

  url.pathname = "/userinfo";
  return url;
}

function readClaim(profile, claimName) {
  if (Object.hasOwn(profile, claimName)) {
    return profile[claimName];
  }

  return claimName.split(".").reduce((value, key) => value?.[key], profile);
}

function normalizeGroups(value, delimiter) {
  const rawGroups = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(delimiter)
      : [];

  return [
    ...new Set(
      rawGroups
        .filter((group) => typeof group === "string")
        .map((group) => group.trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeName(value) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function normalizeSecret(value) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function getSessionTtlSeconds(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }

  return Math.min(parsed, MAX_SESSION_TTL_SECONDS);
}

function readJwtExpiration(token) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return Number.isFinite(payload.exp) ? payload.exp : null;
  } catch {
    return null;
  }
}
