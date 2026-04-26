/**
 * The contribution applier.
 *
 * Takes a topologically-ordered list of adapters, a Tree to write
 * into, and the resolved answers per adapter, and walks the chain:
 *   1. For each adapter, build a `Ctx` whose `answer()` reads from
 *      the resolved answer map for that adapter.
 *   2. Invoke `adapter.contribute(ctx)` to get a Contribution.
 *   3. Apply `files` (whole-file writes), with conflict detection: a
 *      whole-file write to a path that already exists in the Tree
 *      (whether from an earlier adapter or from disk) is a hard
 *      error. To modify existing files, use `patches` instead.
 *   4. Apply `patches` (read–transform–write); a patch whose target
 *      doesn't exist is an error.
 *   5. Aggregate `tagsAdd` into a flat list returned to the caller.
 *
 * The applier is pure with respect to the manifest — it does not
 * write the manifest itself. The caller threads the returned
 * `tagsAdded` and `agentic` records into the manifest update.
 *
 * Mutations to the Tree are staged in memory (per `InMemoryTree`);
 * `tree.commit()` is the caller's responsibility.
 */

import type { Adapter, AgenticBundle, Contribution, Ctx, ManifestV2, Tag, Tree } from './types.js';
import type { Logger } from '../util/log.js';

/** Per-adapter answer map: questionId → value. */
export type AnswersByAdapter = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Result of applying a chain of contributions. */
export interface ApplyResult {
  /** Every tag any adapter promoted via `tagsAdd`, deduplicated. */
  readonly tagsAdded: readonly Tag[];
  /** Per-adapter agentic registrations, keyed by adapter id. */
  readonly agentic: Readonly<Record<string, AgenticBundle>>;
}

/**
 * Thrown when a contribution conflicts with the existing Tree state.
 * Carries the offending path and adapter id for diagnostics.
 */
export class ContributionConflictError extends Error {
  constructor(
    message: string,
    readonly adapterId: string,
    readonly path: string,
    readonly kind: 'overwrite' | 'missing-patch-target',
  ) {
    super(message);
    this.name = 'ContributionConflictError';
  }
}

/**
 * Inputs to the applier. Kept as a single options object so the
 * call-site is self-documenting.
 */
export interface ApplyInputs {
  readonly adapters: readonly Adapter[];
  readonly answers: AnswersByAdapter;
  readonly manifest: ManifestV2;
  readonly tree: Tree;
  readonly logger: Logger;
  readonly cwd: string;
}

export async function applyContributions(inputs: ApplyInputs): Promise<ApplyResult> {
  const tagsAdded = new Set<Tag>();
  const agentic: Record<string, AgenticBundle> = {};

  for (const adapter of inputs.adapters) {
    const ctx = makeCtx(adapter, inputs);
    const contribution = await adapter.contribute(ctx);
    applyOne(adapter, contribution, inputs.tree);
    for (const t of contribution.tagsAdd ?? []) tagsAdded.add(t);
    if (contribution.agentic) agentic[adapter.id] = contribution.agentic;
  }

  return { tagsAdded: [...tagsAdded], agentic };
}

function makeCtx(adapter: Adapter, inputs: ApplyInputs): Ctx {
  const declared = new Set((adapter.questions ?? []).map((q) => q.id));
  const adapterAnswers = inputs.answers[adapter.id] ?? {};
  return {
    logger: inputs.logger,
    cwd: inputs.cwd,
    manifest: inputs.manifest,
    answer(questionId: string): string {
      if (!declared.has(questionId)) {
        throw new Error(
          `adapter '${adapter.id}' asked for answer '${questionId}' but did not declare it`,
        );
      }
      const v = adapterAnswers[questionId];
      if (v === undefined) {
        throw new Error(`adapter '${adapter.id}': no resolved answer for question '${questionId}'`);
      }
      return v;
    },
  };
}

function applyOne(adapter: Adapter, contribution: Contribution, tree: Tree): void {
  for (const f of contribution.files ?? []) {
    if (tree.exists(f.path)) {
      throw new ContributionConflictError(
        `adapter '${adapter.id}' would overwrite existing path '${f.path}'; use a patch to modify existing files`,
        adapter.id,
        f.path,
        'overwrite',
      );
    }
    tree.write(f.path, f.content, f.mode !== undefined ? { mode: f.mode } : undefined);
  }
  for (const p of contribution.patches ?? []) {
    const current = tree.read(p.target);
    if (current === null) {
      throw new ContributionConflictError(
        `adapter '${adapter.id}': patch target '${p.target}' does not exist in tree`,
        adapter.id,
        p.target,
        'missing-patch-target',
      );
    }
    const next = p.apply(current.toString('utf8'));
    tree.write(p.target, next);
  }
}
