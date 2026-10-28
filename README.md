# mintie-test-code

Tested TypeScript implementations and structured metadata for the algorithm
documentation in [`trev-org/mintie-test`](https://github.com/trev-org/mintie-test).

## Algorithm catalog

The [`algorithms/`](algorithms/) package is the source of truth for:

- ten coding-problem implementations and tests
- reusable algorithm-pattern metadata
- examples, edge cases, and time and space complexity

Mintlify Automations watches merged pull requests that change `algorithms/**`.
It opens a documentation pull request for human review and keeps the English,
Spanish, and French pages aligned.

```bash
cd algorithms
npm ci
npm run check
```

See [`algorithms/AUTOMATION.md`](algorithms/AUTOMATION.md) for the synchronization
contract.

## Retained worker

`workers/mintlify-info-api/` is retained because it may still back the
documentation project's Auth0 personalization and API-key prefilling. It is
independent of the retired SSO sample scaffold and should not be removed until
the active Mintlify and Cloudflare configuration is audited with account
access.
