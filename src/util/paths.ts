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
 * The single asset kind shipped with the composition engine. Legacy
 * `'schematics'` was retired alongside the v0.3 installers; if a
 * future split warrants a second asset root (e.g. agentic bundles
 * shipped separately), extend this union.
 */
export type AssetKind = 'composition';

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), '..', '..');

export const paths: Paths = {
  project: (cwd) => path.join(cwd, '.claude'),
  asset: (kind) => path.join(packageRoot, 'assets', kind),
};
