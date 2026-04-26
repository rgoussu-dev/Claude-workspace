/**
 * The top-level orchestrator: install one vertical against a manifest
 * and a Tree.
 *
 * Pipeline:
 *   1. `resolveVertical` — predicate match → topo sort → coverage check.
 *   2. `resolveAdapterAnswers` per adapter — answer the user's choice
 *      points (sticky memory, non-interactive default, or prompt).
 *   3. `applyContributions` — write files, apply patches, aggregate
 *      tagsAdd and agentic bundles.
 *   4. Build the next manifest snapshot — tags merged, vertical
 *      recorded as installed, answer updates merged, `updatedAt`
 *      bumped.
 *
 * The function is pure with respect to disk: it mutates the supplied
 * Tree (in memory) and returns the next manifest. The caller commits
 * both — `tree.commit()` to write files, `writeManifestV2` to persist
 * the manifest. Splitting commit from compute lets `keel install`
 * preview a dry-run before touching anything.
 */

import { resolveAdapterAnswers, type AnswerMode, type Prompt } from './answers.js';
import { applyContributions, type ApplyResult } from './apply.js';
import { resolveVertical } from './resolver.js';
import type { InstalledVertical, ManifestV2, Tag, Tree, Vertical } from './types.js';
import type { Logger } from '../util/log.js';

/** Inputs to `installVertical`. */
export interface InstallVerticalInputs {
  readonly vertical: Vertical;
  readonly manifest: ManifestV2;
  readonly tree: Tree;
  readonly mode: AnswerMode;
  readonly prompt: Prompt;
  readonly logger: Logger;
  readonly cwd: string;
  /** Time source — injected so tests can pin `installedAt`/`updatedAt`. */
  readonly now: () => string;
}

/** Result of installing a vertical. */
export interface InstallVerticalResult {
  /** The next manifest, with tags/vertical/answers merged. */
  readonly manifest: ManifestV2;
  /** The raw apply result, for diagnostics or reuse by callers. */
  readonly applyResult: ApplyResult;
}

export async function installVertical(
  inputs: InstallVerticalInputs,
): Promise<InstallVerticalResult> {
  const ordered = resolveVertical(inputs.vertical, inputs.manifest.tags);

  const answers: Record<string, Record<string, string>> = {};
  const updates: Record<string, Record<string, string>> = {};
  for (const adapter of ordered) {
    const stored = inputs.manifest.answers[adapter.id] ?? {};
    const r = await resolveAdapterAnswers(adapter, stored, inputs.mode, inputs.prompt);
    answers[adapter.id] = r.answers;
    if (Object.keys(r.updates).length > 0) updates[adapter.id] = r.updates;
  }

  const applyResult = await applyContributions({
    adapters: ordered,
    answers,
    manifest: inputs.manifest,
    tree: inputs.tree,
    logger: inputs.logger,
    cwd: inputs.cwd,
  });

  return {
    manifest: nextManifest(
      inputs.manifest,
      inputs.vertical,
      applyResult.tagsAdded,
      updates,
      inputs.now(),
    ),
    applyResult,
  };
}

function nextManifest(
  current: ManifestV2,
  vertical: Vertical,
  tagsAdded: readonly Tag[],
  answerUpdates: Readonly<Record<string, Record<string, string>>>,
  now: string,
): ManifestV2 {
  const mergedTags = [...new Set([...current.tags, ...tagsAdded])].sort();

  const verticals: InstalledVertical[] = current.verticals.some((v) => v.id === vertical.id)
    ? [...current.verticals]
    : [...current.verticals, { id: vertical.id, installedAt: now }];

  const mergedAnswers: Record<string, Record<string, string>> = {};
  for (const [adapterId, qa] of Object.entries(current.answers)) {
    mergedAnswers[adapterId] = { ...qa };
  }
  for (const [adapterId, qa] of Object.entries(answerUpdates)) {
    mergedAnswers[adapterId] = { ...(mergedAnswers[adapterId] ?? {}), ...qa };
  }

  return {
    ...current,
    tags: mergedTags,
    verticals,
    answers: mergedAnswers,
    updatedAt: now,
  };
}
