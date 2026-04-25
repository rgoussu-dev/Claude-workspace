---
name: release
description: |
  Use when cutting a release of the keel package. TRIGGER on requests
  like "release X.Y.Z", "cut a release", or "what do I need to do for
  the release". SKIP for consumer-project release questions.
---

# release

Keel releases are cut by bumping `package.json`, updating `CHANGELOG.md`,
committing, tagging, and pushing the tag. The GitHub Actions release
workflow does the rest.

## Dist-tag mapping

| Prerelease identifier | npm dist-tag |
| --------------------- | ------------ |
| `alpha`               | `alpha`      |
| `beta`                | `beta`       |
| `rc`                  | `next`       |
| _(none)_              | `latest`     |
| anything else         | hard error   |

## Checklist

1. **`package.json`** — bump `version` to the target version (e.g.
   `0.2.0-alpha`).

2. **`CHANGELOG.md`** — rename the `## [Unreleased]` heading to
   `## [X.Y.Z] — YYYY-MM-DD` (today's date). Add a new empty
   `## [Unreleased]` section above it. Update the three link references
   at the bottom of the file:

   ```md
   [Unreleased]: https://github.com/rgoussu-dev/Keel/compare/vX.Y.Z...HEAD
   [X.Y.Z]: https://github.com/rgoussu-dev/Keel/compare/vPREV...vX.Y.Z
   [PREV]: …
   ```

   If any prior version is missing a link reference, add it now.

3. **Commit** — one commit containing only `package.json` +
   `CHANGELOG.md`:

   ```
   chore(release): vX.Y.Z
   ```

   Any other fixes that belong in the release (e.g. a missing schema
   file) must be committed **before** the release commit, as their own
   logical unit, so the release commit is always a clean two-file change.

4. **Tag** — `git tag vX.Y.Z` on the release commit.

5. **Push the tag** — `git push origin vX.Y.Z`. The release workflow
   triggers on `v*` tag pushes; confirm with the user before pushing.

## What the release workflow does

`.github/workflows/release.yml` (triggered by the tag push):

1. Verifies the tag name matches the `version` field in `package.json`.
2. Reruns `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
3. Publishes to npm with `--provenance --access public`.
4. Creates a GitHub Release with auto-generated notes.

Required secret: `NPM_TOKEN`.

## Anti-patterns

- Mixing a fix commit with the release commit. Keep them separate so
  git history is clean and the tag points to an unambiguous two-file
  diff.
- Forgetting to add link references for intermediate versions in
  `CHANGELOG.md` — check every `## [X.Y.Z]` heading has a corresponding
  `[X.Y.Z]: …` line at the bottom.
- Pushing the tag without confirming with the user — the workflow
  triggers immediately and publishes to npm.
