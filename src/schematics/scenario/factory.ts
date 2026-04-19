import path from 'node:path';
import { paths } from '../../util/paths.js';
import { renderTemplate } from '../../engine/template.js';
import type { Options, Schematic } from '../../engine/types.js';
import {
  humanise,
  packageToPath,
  resolveLanguage,
  toPascalCase,
  type SupportedLanguage,
} from '../util.js';

/**
 * Scaffolds a Scenario + Factory + Test triad for a given behaviour. The
 * resulting test depends only on: the Scenario, the Factory, and the port
 * interface under test — nothing else. This is the canonical shape
 * enforced by the `test-scenario-pattern` skill.
 *
 * Parameters:
 *   - `name`         behaviour name (e.g. "CreateUser")
 *   - `basePackage`  java package prefix (e.g. "com.example")
 *   - `aggregate`    aggregate folder/package (e.g. "user")
 *   - `portName`     port interface exercised by the test (e.g. "Mediator")
 *   - `language`     currently only "java"
 */
export const scenarioSchematic: Schematic = {
  name: 'scenario',
  description: 'Scaffold a Scenario + Factory + Test triad (DIP-strict, fakes-not-mocks).',
  parameters: [
    {
      name: 'name',
      description: 'Behaviour / use-case name (PascalCase), e.g. CreateUser',
      required: true,
      prompt: { kind: 'input', name: 'name', message: 'behaviour name (e.g. CreateUser)' },
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
      name: 'portName',
      description: 'Primary port interface the test exercises (default: Mediator).',
      required: false,
      prompt: {
        kind: 'input',
        name: 'portName',
        message: 'port under test',
        default: 'Mediator',
      },
    },
    {
      name: 'language',
      description: 'Target language (java supported in MVP).',
      required: false,
    },
  ],

  async run(tree, options, ctx) {
    const vars = resolve(options);
    const templateRoot = path.join(
      paths.asset('schematics'),
      'scenario',
      'templates',
      vars.language,
    );
    await renderTemplate(tree, templateRoot, '', vars as unknown as Record<string, unknown>);
    ctx.logger.info(`scenario "${vars.Name}" scaffolded.`);
  },
};

interface ResolvedVars {
  Name: string;
  humanName: string;
  basePackage: string;
  pkgPath: string;
  aggregate: string;
  PortName: string;
  language: SupportedLanguage;
}

function resolve(options: Options): ResolvedVars {
  const rawName = String(options['name'] ?? '').trim();
  if (!rawName) throw new Error('scenario schematic: `name` is required');
  const basePackage = String(options['basePackage'] ?? '').trim();
  if (!basePackage) throw new Error('scenario schematic: `basePackage` is required');
  const aggregate = String(options['aggregate'] ?? '').trim();
  if (!aggregate) throw new Error('scenario schematic: `aggregate` is required');
  const language = resolveLanguage(options['language'], 'scenario');
  const portName = String(options['portName'] ?? 'Mediator').trim() || 'Mediator';

  const Name = toPascalCase(rawName);
  return {
    Name,
    humanName: humanise(Name),
    basePackage,
    pkgPath: packageToPath(basePackage),
    aggregate: aggregate.toLowerCase(),
    PortName: toPascalCase(portName),
    language,
  };
}
