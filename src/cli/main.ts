import { Command } from 'commander';
import { install } from '../installer/install.js';
import { update } from '../installer/update.js';
import { doctor } from '../installer/doctor.js';
import { newProject } from '../installer/new.js';
import { addVertical } from '../installer/add.js';
import { listStackIds } from '../composition/stacks.js';
import { listVerticalIds } from '../composition/verticals/index.js';
import { logger } from '../util/log.js';
import { buildEngine } from '../schematics/registry.js';
import { cliPrompt } from '../engine/homegrown.js';
import type { PromptSchema } from '../engine/types.js';

/**
 * Entry point for the `keel` CLI. Wires commander to the installer
 * commands. Kept intentionally thin — argument parsing only, no logic.
 */
export async function main(argv: string[]): Promise<void> {
  const program = new Command()
    .name('keel')
    .description('Universal Claude Code workflow kit — hexagonal, trunk-based, XP.')
    .version(await readPackageVersion());

  program
    .command('new')
    .description(
      `Bootstrap a greenfield project from a stack preset (available: ${listStackIds().join(', ')}).`,
    )
    .option('-s, --stack <id>', 'stack preset id', 'quarkus-cli')
    .option('-y, --yes', 'non-interactive — use defaults for unanswered questions', false)
    .option('--dry-run', 'print the plan without writing any file', false)
    .option(
      '--set <kv...>',
      'preset an answer as adapterId:questionId=value (repeatable)',
      [] as string[],
    )
    .action(
      async (opts: {
        stack: string;
        yes: boolean;
        dryRun: boolean;
        set: string[];
      }): Promise<void> => {
        await newProject({
          cwd: process.cwd(),
          stack: opts.stack,
          answers: parseSetAnswers(opts.set),
          interactive: !opts.yes,
          dryRun: opts.dryRun,
        });
      },
    );

  program
    .command('add <vertical>')
    .description(
      `Install a vertical onto an existing keel project (available: ${listVerticalIds().join(', ')}).`,
    )
    .option('-y, --yes', 'non-interactive — use defaults for unanswered questions', false)
    .option('--dry-run', 'print the plan without writing any file', false)
    .option(
      '--set <kv...>',
      'preset an answer as adapterId:questionId=value (repeatable)',
      [] as string[],
    )
    .action(
      async (
        vertical: string,
        opts: { yes: boolean; dryRun: boolean; set: string[] },
      ): Promise<void> => {
        await addVertical({
          cwd: process.cwd(),
          vertical,
          answers: parseSetAnswers(opts.set),
          interactive: !opts.yes,
          dryRun: opts.dryRun,
        });
      },
    );

  program
    .command('install')
    .description('Install keel assets into the current project (<cwd>/.claude/).')
    .option('-f, --force', 'overwrite existing files and manifest', false)
    .option('--dry-run', 'print the plan without writing any file', false)
    .action(async (opts: { force: boolean; dryRun: boolean }) => {
      await install({
        cwd: process.cwd(),
        force: opts.force,
        dryRun: opts.dryRun,
      });
    });

  program
    .command('update')
    .description('Upgrade the current project install to the latest kit version.')
    .option('--dry-run', 'print the plan without writing any file', false)
    .option('-y, --yes', 'non-interactive; keep user-modified files', false)
    .action(async (opts: { dryRun: boolean; yes: boolean }) => {
      await update({
        cwd: process.cwd(),
        dryRun: opts.dryRun,
        nonInteractive: opts.yes,
      });
    });

  program
    .command('doctor')
    .description('Audit the current project install for drift.')
    .action(async () => {
      const issues = await doctor({ cwd: process.cwd() });
      if (issues > 0) process.exit(1);
    });

  program
    .command('generate <schematic>')
    .alias('g')
    .description('Run a registered schematic (e.g. port, scenario, walking-skeleton).')
    .option('--dry-run', 'show the planned changes without writing', false)
    .option('--set <kv...>', 'set a parameter as key=value (repeatable)', [])
    .action(async (schematic: string, opts: { dryRun: boolean; set: string[] }): Promise<void> => {
      const engine = buildEngine();
      const target = engine.get(schematic);
      if (!target) {
        logger.error(`unknown schematic: ${schematic}`);
        logger.info(`available: ${engine.names().join(', ')}`);
        process.exit(1);
      }
      const options: Record<string, unknown> = parseKv(opts.set);
      for (const spec of target.parameters) {
        if (options[spec.name] !== undefined) continue;
        if (!spec.prompt) {
          if (spec.required) {
            logger.error(`missing required parameter: ${spec.name}`);
            process.exit(1);
          }
          continue;
        }
        if (!spec.required) {
          const def = 'default' in spec.prompt ? spec.prompt.default : undefined;
          if (def !== undefined) {
            options[spec.name] = def;
            continue;
          }
          if (!process.stdin.isTTY) continue;
        }
        options[spec.name] = await cliPrompt(spec.prompt as PromptSchema<unknown>);
      }
      await engine.run(
        schematic,
        options,
        { logger, cwd: process.cwd(), prompt: cliPrompt, invoke: async () => {}, dryRun: false },
        { dryRun: opts.dryRun },
      );
    });

  try {
    await program.parseAsync(argv);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function parseKv(pairs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of pairs) {
    const eq = raw.indexOf('=');
    if (eq <= 0) {
      throw new Error(`--set expects key=value, got: ${raw}`);
    }
    out[raw.slice(0, eq)] = raw.slice(eq + 1);
  }
  return out;
}

/**
 * Parses `--set adapterId:questionId=value` entries into the nested
 * shape used by the manifest's `answers` map. Allows the user to
 * supply sticky answers from the command line so `keel new --yes`
 * doesn't have to fall back to every default.
 */
function parseSetAnswers(pairs: string[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const raw of pairs) {
    const eq = raw.indexOf('=');
    if (eq <= 0) throw new Error(`--set expects adapterId:questionId=value, got: ${raw}`);
    const left = raw.slice(0, eq);
    const value = raw.slice(eq + 1);
    const colon = left.indexOf(':');
    if (colon <= 0) {
      throw new Error(`--set expects adapterId:questionId=value, got: ${raw}`);
    }
    const adapterId = left.slice(0, colon);
    const questionId = left.slice(colon + 1);
    if (!out[adapterId]) out[adapterId] = {};
    out[adapterId][questionId] = value;
  }
  return out;
}

async function readPackageVersion(): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const pkg = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'package.json',
  );
  const raw = await readFile(pkg, 'utf8');
  return (JSON.parse(raw) as { version: string }).version;
}
