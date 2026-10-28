# Documentation automation contract

Mintlify's `Update from code changes` automation treats this directory as the
authoritative source for algorithm documentation.

For every changed problem:

1. Read `problem.json` for wording, complexity, examples, edge cases, and
   related patterns.
2. Copy the implementation from `solution.ts` exactly. Do not rewrite or
   optimize it in the documentation pull request.
3. Update the matching English, Spanish, and French MDX pages.
4. Add or remove navigation entries only when a problem or pattern is added,
   removed, or renamed.
5. Cite the source pull request in the documentation pull request.

The automation must not modify Operations, References, or Changelog content,
and it must never merge its own pull request.
