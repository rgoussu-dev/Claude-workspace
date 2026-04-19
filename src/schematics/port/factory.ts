import path from 'node:path';
import { paths } from '../../util/paths.js';
import { renderTemplate } from '../../engine/template.js';
import type { Options, Schematic } from '../../engine/types.js';
import {
  humanise,
  packageToPath,
  resolveLanguage,
  toKebabCase,
  toPascalCase,
  type SupportedLanguage,
} from '../util.js';

/**
 * Scaffolds a secondary port interface in `domain/contract` plus a fake
 * module under `infrastructure/<name>/fake` with its own build script and
 * a contract test for the fake.
 *
 * Parameters:
 *   - `name`         human or identifier name (e.g. "UserRepository", "user repo")
 *   - `basePackage`  java package prefix (e.g. "com.example")
 *   - `aggregate`    aggregate folder/package (e.g. "user")
 *   - `language`     currently only "java"
 *
 * Composition: called by the walking-skeleton schematic. Can also be run
 * standalone via `keel generate port`.
 */
export const portSchematic: Schematic = {
  name: 'port',
  description: 'Scaffold a secondary port + fake module + contract test.',
  parameters: [
    {
      name: 'name',
      description: 'Port name, e.g. UserRepository',
      required: true,
      prompt: { kind: 'input', name: 'name', message: 'port name (e.g. UserRepository)' },
    },
    {
      name: 'basePackage',
      description: 'Base java package, e.g. com.example',
      required: true,
      prompt: { kind: 'input', name: 'basePackage', message: 'base package (e.g. com.example)' },
    },
    {
      name: 'aggregate',
      description: 'Aggregate folder/package, e.g. user',
      required: true,
      prompt: { kind: 'input', name: 'aggregate', message: 'aggregate (e.g. user)' },
    },
    {
      name: 'language',
      description: 'Target language (java supported in MVP).',
      required: false,
    },
  ],

  async run(tree, options, ctx) {
    const vars = resolve(options);
    const templateRoot = path.join(paths.asset('schematics'), 'port', 'templates', vars.language);
    await renderTemplate(tree, templateRoot, '', vars as unknown as Record<string, unknown>);
    ctx.logger.info(
      `port "${vars.Name}" scaffolded. remember to add ":infrastructure:${vars.nameKebab}:fake" ` +
        `to settings.gradle.kts.`,
    );
  },
};

interface ResolvedVars {
  Name: string;
  nameKebab: string;
  humanName: string;
  basePackage: string;
  pkgPath: string;
  aggregate: string;
  language: SupportedLanguage;
}

function resolve(options: Options): ResolvedVars {
  const rawName = String(options['name'] ?? '').trim();
  if (!rawName) throw new Error('port schematic: `name` is required');

  const basePackage = String(options['basePackage'] ?? '').trim();
  if (!basePackage) throw new Error('port schematic: `basePackage` is required');

  const aggregate = String(options['aggregate'] ?? '').trim();
  if (!aggregate) throw new Error('port schematic: `aggregate` is required');

  const language = resolveLanguage(options['language'], 'port');

  const Name = toPascalCase(rawName);
  return {
    Name,
    nameKebab: toKebabCase(Name),
    humanName: humanise(Name),
    basePackage,
    pkgPath: packageToPath(basePackage),
    aggregate: aggregate.toLowerCase(),
    language,
  };
}
