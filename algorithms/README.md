# Mintie Algorithms

This package is the source of truth for the algorithm and coding-problem
documentation in `trev-org/mintie-test`.

Each problem directory contains:

- `solution.ts`: the canonical TypeScript implementation
- `solution.test.ts`: executable examples and edge-case tests
- `problem.json`: structured documentation metadata

Pattern directories contain `pattern.json` files that connect reusable
techniques to tested problem implementations.

## Commands

```bash
npm ci
npm run check
```

Mintlify Automations watches merged pull requests that change `algorithms/**`.
It uses the tested implementation and metadata to open a documentation pull
request. Documentation changes are reviewed before they are merged.
