# keel

Universal Claude Code workflow kit. Opinionated defaults for hexagonal
architecture, trunk-based development, XP, and schematics-driven scaffolding.

## What it installs

- **Global** (`~/.claude/`): `CLAUDE.md`, `settings.json`, skills, commands — shared across projects.
- **Project** (`<project>/.claude/`): hooks, per-project settings, slash commands — checked in per repo.

## Install into a project

```sh
npx @rgoussu.dev/keel install          # installs into current project
npx @rgoussu.dev/keel install --global # installs universal defaults into ~/.claude
npx @rgoussu.dev/keel update           # re-sync with new kit versions, migrating as needed
npx @rgoussu.dev/keel doctor           # audit the installation
npx @rgoussu.dev/keel generate <name>  # run a schematic
```

## Principles

- Hexagonal always (domain / application / infrastructure / interface).
- Command/Query + mediator in `domain/core/kernel`.
- Tests: Scenario + Factory + fakes (never mocks), DIP-strict.
- Walking skeleton first. IaC via OpenTofu.
- Trunk-based, Conventional Commits, XP, SOLID, 12-Factor.
- Always latest stable (langs: latest LTS; frameworks: latest stable).
