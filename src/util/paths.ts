import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Resolves absolute paths used throughout the installer: the user's global
 * claude directory, a project's local claude directory, and the packaged
 * assets shipped with this CLI.
 */
export interface Paths {
  /** Global claude directory, e.g. `~/.claude`. */
  global: string;
  /** Project claude directory, e.g. `<cwd>/.claude`. */
  project(cwd: string): string;
  /** Absolute path to a packaged asset root (e.g. `global`, `project`). */
  asset(kind: AssetKind): string;
}

export type AssetKind = 'global' | 'project' | 'conventions' | 'schematics' | 'skills';

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), '..', '..');

export const paths: Paths = {
  global: path.join(homedir(), '.claude'),
  project: (cwd) => path.join(cwd, '.claude'),
  asset: (kind) => path.join(packageRoot, 'assets', kind),
};
