import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Resolves absolute paths used throughout the installer: a project's
 * local claude directory and the packaged assets shipped with this
 * CLI.
 *
 * keel installs are scoped to the **project** only — the user's home
 * directory (`~/.claude`) is never read, written, or otherwise
 * touched.
 */
export interface Paths {
  /** Project claude directory, e.g. `<cwd>/.claude`. */
  project(cwd: string): string;
  /** Absolute path to a packaged asset root. */
  asset(kind: AssetKind): string;
}

/**
 * Asset kinds shipped with the package.
 *
 *   - `'composition'` — adapter template trees rendered into the
 *     project; one directory per `<vertical>/<adapter>/`.
 *   - `'project'` — single source of truth for the binding spec
 *     (`CLAUDE.md`) the walking-skeleton's `claude-core` adapter
 *     emits into `<project>/.claude/`. Lives outside `composition/`
 *     so contributors edit one canonical file that's both the kit's
 *     own dogfood reference and the shipped artifact.
 */
export type AssetKind = 'composition' | 'project';

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), '..', '..');

export const paths: Paths = {
  project: (cwd) => path.join(cwd, '.claude'),
  asset: (kind) => path.join(packageRoot, 'assets', kind),
};
