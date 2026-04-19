# Brainstorm: Universal Claude Code Kit

Checkpoint of an in-progress design session. Pick up from "Open questions" below.

## Goal

Build a one-size-fits-all, installable toolkit (Claude Code workflows, hooks,
skills, slash commands, templates) that can be dropped into any project.

## Distribution & Install Model — LOCKED

- **npm scope:** `@rgoussu.dev/<name>` — name **OPEN** (candidates below).
- **Distribution:** npx-based CLI (Node.js). Cross-platform: Windows, macOS, Linux.
- **CLI verbs:** `install`, `update`, `add <component>`, `remove <component>`, `doctor`, `generate <schematic>` (aka `g`).
- **Install mode:** copy (not symlink), with migration/update path.
- **Scope targets:**
  - `--global` → `~/.claude/` (universal defaults)
  - default → `./.claude/` in current project (per-project overrides)
- **Update/migration:**
  - `.claude/.kit-manifest.json` tracks version + sha256 of each installed file.
  - `kit update` compares user hash vs shipped-old vs shipped-new. Unchanged → overwrite. Modified → diff + prompt (keep/overwrite/merge).
  - Per-component `CHANGELOG.md` shipped with the package.
  - Schematics carry `migration-*.ts` Rules to auto-evolve projects across kit versions (Angular-schematics style).

### Name candidates (pick one)
- **keel** — ship's spine; matches walking-skeleton philosophy (top pick).
- **lodestone** — guiding principle.
- **atelier** — craftsman's workshop.
- **hexforge** — hexagonal + forge.
- **cairn** — trail markers.
- **portside** — ports & adapters pun.
- **kernel** — matches mediator-in-domain-kernel.

## Schematics-Style Architecture — LOCKED (engine OPEN)

Each generator is a **schematic** (Angular-style): composable, parameterized,
AST-aware where needed, with migration Rules shipped for version jumps.

- **Composition:** `/walking-skeleton` internally calls `/port`, `/handler`, `/adapter`, `/executable`, `/iac` schematics.
- **Parameterization:** every schematic prompts for inputs (name, channel, tech, etc.).
- **Templating:** EJS or Handlebars for file generation.
- **AST:** ts-morph for TS; treesitter (or language-native) for Java/Kotlin/Rust/Go where modifications needed.
- **Migration:** each schematic ships `migrations/<version>.ts`; `kit update` runs pending migrations in order.
- **Engine choice — OPEN:**
  - `@angular-devkit/schematics` — mature, Tree+Rule+composition built in, heavy.
  - Nx generators — lighter, same model, optional.
  - Homegrown minimal engine — max control, reinvents wheel.
  - Leaning `@angular-devkit/schematics`.

## Proposed Layout

```
<kit-name>/
├── bin/kit.js
├── lib/                            # installer, manifest, diff/merge, schematic runner
├── assets/
│   ├── global/                     # → ~/.claude/
│   │   ├── CLAUDE.md
│   │   ├── settings.json
│   │   ├── agents/
│   │   ├── skills/
│   │   └── commands/
│   ├── project/                    # → <project>/.claude/
│   │   ├── settings.json
│   │   ├── hooks/                  # .sh + .ps1 pair per hook
│   │   └── commands/
│   └── schematics/                 # Angular-style generators
│       ├── walking-skeleton/
│       ├── port/
│       ├── adapter/
│       ├── handler/
│       ├── scenario/
│       ├── executable/
│       ├── iac/
│       └── collection.json
└── manifest.schema.json
```

## Project Layout Produced by Schematics — LOCKED

Multi-module, framework-agnostic until walking-skeleton time.

```
application/
  <channel>/                       # rest, cli, worker, ui, graphql, …
    contract/                      # API contracts (OpenAPI, schema, DTOs)
    executable/                    # actual runnable; framework chosen at WS scaffold
domain/
  contract/                        # ports (primary + secondary) + domain DTOs
  core/
    kernel/                        # mediator (roll-your-own, per-language)
    <aggregate>/                   # business logic
infrastructure/
  <port>/
    <impl>/                        # real adapter (e.g., postgres, kafka)
    fake/                          # fake as its own module
      # always test-dep; opt-in as prod-dep for prototyping
```

- Multiple executables per project are expected.
- `/executable <channel>` schematic adds a new one; chooses framework at generation time.

## User Preferences — CAPTURED

### Languages & Tooling
- **Languages:** Java, Kotlin, TypeScript, Rust, Go.
- **Formatters/linters:** mainstream per language (prettier/eslint, ktlint, rustfmt+clippy, gofmt+go vet, google-java-format).
- **Comments:** JavaDoc/JSDoc on public interfaces/methods/classes only. Otherwise none.
- **Tests:** mainstream per language. Strict DIP (see Architecture).

### Workflow
- **Branching:** none — trunk-based, XP, continuous integration; parallel work via feature flags + small commits + fast sync.
- **Commits:** auto after each logical unit, Conventional Commits format.
- **Hook — block commits to main:** NO (trunk-based requires committing to main).
- **Hook — auto-format on save/edit:** YES (PostToolUse on Edit/Write).
- **Hook — pre-commit tests:** YES, commit must fail if tests fail.
- **PRs:** none (trunk-based).
- **"Done" discipline:** Claude must run type-check + tests before claiming done.
- **Verbosity:** very terse.
- **Permissions (pre-allow):** full toolchain per language + all read-only tools.

### Environment
- **Editors:** VS Code primary; cross-IDE standardized configs required.
- **Shell:** native per OS — PowerShell on Windows, bash/sh on Linux. Hooks ship as `.sh` + `.ps1` pairs.

## Architectural Constraints — NON-NEGOTIABLE

1. **Hexagonal architecture, always** — including frontend.
2. **Interface (application/<channel>) = dumb:** map DTO → dispatch via mediator → map response.
3. **Infrastructure = dumb:** adapters only. Zero business logic.
4. **Command/Query + Mediator** for all business operations. Mediator lives in `domain/core/kernel/`.
5. **Test pattern (strict DIP):**
   - **Scenario** — encapsulates data.
   - **Factory** — wires SUT with fakes (not mocks).
   - **Test** — depends only on Scenario, Factory, port interface under test.
6. **Walking skeleton first.** Greenfield: build before features. Brownfield: assess → build if missing → then work.
7. **IaC mandatory.** **OpenTofu** is the default.
8. **Fakes strategy:** own modules, always test-dep, opt-in as prod-dep for fast prototyping.
9. **Framework choice deferred** to walking-skeleton time. Supported executable/framework registry = TBD.
10. **Invariants:** XP, SOLID, 12-Factor App.

## Components to Ship

### Hooks (cross-platform .sh + .ps1)
- `PostToolUse` on Edit/Write → format touched file (language-detected).
- `PreToolUse` on Bash `git commit` → type-check + scoped tests; fail on red. `--full` flag.
- `SessionStart` → load context: diff, recent commits, failing tests, walking-skeleton status.
- `Stop` → remind Claude to commit logical units in Conventional Commit format.

### Slash Commands / Schematics
Workflow:
- `/commit`, `/sync`, `/micro`, `/flag <name>`, `/tdd <behavior>`, `/spike [end]`, `/diff-review`, `/unblock`, `/context`.

Schematic-backed:
- `/walking-skeleton [init|check]` — composes: `/executable` + `/port` + `/handler` + `/adapter` + fake + `/iac`.
- `/executable <channel>` — scaffold new runnable; prompts for framework.
- `/port <name> [primary|secondary]` — port interface + fake module + factory registration.
- `/adapter <port> <tech>` — real adapter for existing port.
- `/handler <command|query> <name>` — handler via mediator, wired in factory.
- `/scenario <name>` — Scenario + Factory + port-only test stub.
- `/iac [module]` — OpenTofu module scaffolding.

Audits:
- `/hex-check` — domain→infra leaks, logic in dumb layers, missing fakes, mock usage (flag), bypasses of factory.
- `/12factor-check` — config, deps, backing services, statelessness, logs.

### Skills (auto-activated knowledge)
- `hexagonal-review` — nudge correct layer on edits.
- `test-scenario-pattern` — enforce Scenario+Factory+fakes.
- `walking-skeleton-guide` — activate on init / brownfield.

## Open Questions — RESUME HERE

1. **Package name** — pick from candidates above (leaning `keel`).
2. **Schematics engine** — `@angular-devkit/schematics` / Nx generators / homegrown (leaning `@angular-devkit/schematics`).
3. **Executable/framework registry** — which first-class combos ship in the initial release? (Framework choice is deferred to scaffold-time, but we must implement schematics for *some* set first.)
   - Java REST: Spring Boot? Micronaut? Quarkus?
   - Kotlin REST: Ktor? Spring?
   - TS REST: Nest? Fastify? Express?
   - TS UI: React? Vue? Svelte?
   - Rust REST: Axum? Actix?
   - Go REST: stdlib? Echo? Gin?

## Next Actions

- Resolve open questions.
- Decide MVP slice. Candidate:
  - Global `CLAUDE.md` + settings.json with architectural constraints.
  - Auto-format + pre-commit-tests hooks (bash + ps1).
  - Schematics engine set up with 3 schematics: `/walking-skeleton`, `/port`, `/scenario` — for **one** language end-to-end (suggest TS as proving ground; easiest AST).
  - `/commit` slash command.
- Scaffold CLI (`bin/kit.js`), manifest, install/update.
- Draft global `CLAUDE.md` encoding all architectural constraints.
