# Mintlify Info API Worker

This Cloudflare Worker converts an Auth0 user profile into Mintlify's user data
format. It supports the `partner` and `enterprise` access groups and
personalized content used by the Mintie documentation project.

The endpoint:

- accepts `GET /userinfo`
- requires `Authorization: Bearer <access_token>`
- validates the token by calling Auth0's `/userinfo` endpoint
- maps the authenticated Auth0 user's name to Mintlify's `content.name`
- returns allowed Mintlify groups found in the configured Auth0 claim
- limits the Mintlify session to 15 minutes or the JWT expiration, whichever is sooner
- allows credentialed CORS only from the configured documentation origin
- returns `Cache-Control: private, no-store`

## 1. Add the group claim in Auth0

Create an Auth0 post-login Action and add it to the Login flow. This example
reads groups from Auth0 app metadata and falls back to Auth0 roles.

```js
exports.onExecutePostLogin = async (event, api) => {
  const claim = "https://morsemicro.com/groups";
  const groups =
    event.user.app_metadata?.groups ?? event.authorization?.roles ?? [];

  api.idToken.setCustomClaim(claim, groups);
  api.accessToken.setCustomClaim(claim, groups);
};
```

Assign users the `partner` or `enterprise` Auth0 role. Alternatively, set the
same value in Auth0 app metadata:

```json
{
  "groups": ["partner"]
}
```

Request at least the `openid profile email` scopes in Mintlify. Auth0's
`/userinfo` endpoint requires the `openid` scope, and `profile` makes the
authenticated user's standard `name` claim available.

## 2. Configure the Worker

Update these values in `wrangler.jsonc`:

- `ALLOWED_ORIGIN`: exact Mintlify documentation origin, without a trailing slash
- `AUTH0_DOMAIN`: Auth0 tenant or custom domain, such as `example.us.auth0.com`
- `AUTH0_GROUPS_CLAIM`: exact custom claim key created by the Auth0 Action
- `AUTH0_NAME_CLAIM`: Auth0 profile claim to expose as Mintlify `content.name`
- `ALLOWED_GROUPS`: comma-separated Auth0 groups that Mintlify may receive
- `SESSION_TTL_SECONDS`: user-data refresh interval, up to one hour

The checked-in origin is `https://mintietest.mintlify.site`. Change it if the
deployed documentation uses another origin.

## 3. Test and deploy

```bash
npm install
npm test
npx wrangler login
npm run deploy
```

Wrangler prints the deployed `workers.dev` URL. The Mintlify Info API URL is:

```text
https://<worker-name>.<account-subdomain>.workers.dev/userinfo
```

Verify the deployed endpoint with an Auth0 access token:

```bash
curl --include \
  "https://<worker-name>.<account-subdomain>.workers.dev/userinfo" \
  --header "Origin: https://mintietest.mintlify.site" \
  --header "Authorization: Bearer <auth0-access-token>"
```

A partner user receives:

```json
{
  "expiresAt": 1893456000,
  "groups": ["partner"],
  "content": {
    "name": "Jane Doe"
  }
}
```

`content.name` is copied from the configured Auth0 profile claim; the Worker
does not provide a hard-coded fallback name.

## 4. Configure Mintlify

In the Mintlify dashboard:

1. Open **Authentication** and set the site to **Private**.
2. Select **Custom → OAuth**.
3. Enter the Auth0 authorization URL, token URL, client ID, client secret, and
   the scopes `openid profile email`.
4. Set **Info API URL** to the deployed Worker `/userinfo` URL.
5. Copy Mintlify's redirect URL into the Auth0 application's allowed callback URLs.
6. Save and test with partner, enterprise, and unassigned accounts.

With full authentication, the Operations pages are access-controlled. If you
configure OAuth under Mintlify **Personalization** instead, the group only
controls navigation visibility; direct page URLs remain public.

## Direct Auth0 alternative

Mintlify can use `https://<auth0-domain>/userinfo` directly when Auth0 already
returns user data in Mintlify's expected format. Keep this Worker when you need
to rename, filter, or transform Auth0 claims.
