import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { paths } from '../util/paths.js';
import { sha256 } from '../util/hash.js';
import { readManifest } from '../manifest/store.js';
import { logger } from '../util/log.js';

export interface DoctorOptions {
  cwd: string;
}

/**
 * Audits both scopes and reports drift between the manifest and the
 * filesystem. Three classes of finding:
 *
 *  - missing   — file is tracked by the manifest but absent on disk.
 *  - modified  — file's sha256 no longer matches the manifest's record.
 *  - foreign   — file sits under a keel-managed directory (hooks/,
 *                commands/, skills/) but is not tracked by the manifest.
 *
 * All three classes count as issues and cause a non-zero exit status.
 * A scope with no manifest is not an error; it just means nothing is
 * installed there.
 */
export async function doctor(opts: DoctorOptions): Promise<number> {
  let issues = 0;
  for (const scope of ['global', 'project'] as const) {
    const root = scope === 'global' ? paths.global : paths.project(opts.cwd);
    const m = await readManifest(root);
    if (!m) {
      logger.info(`${scope}: no installation at ${root}`);
      continue;
    }
    logger.info(`${scope}: kit ${chalk.cyan(m.kitVersion)} (${m.entries.length} files)`);
    const tracked = new Set<string>();

    for (const e of m.entries) {
      tracked.add(e.target);
      const abs = path.join(root, e.target);
      if (!(await fs.pathExists(abs))) {
        logger.error(`  missing: ${e.target}`);
        issues++;
        continue;
      }
      const current = await fs.readFile(abs);
      if (sha256(current) !== e.sha256Current) {
        logger.error(`  modified: ${e.target}`);
        issues++;
      }
    }

    issues += await scanForeign(root, tracked);
  }
  if (issues > 0) logger.error(`${issues} issue(s) found`);
  else logger.success('no issues');
  return issues;
}

/**
 * Walks the managed subdirectories of a scope root looking for files
 * that are present on disk but absent from the manifest. Only
 * directories the kit ever installs into are scanned; user-added files
 * elsewhere in the scope root are ignored.
 */
async function scanForeign(root: string, tracked: Set<string>): Promise<number> {
  let foreign = 0;
  const managed = ['hooks', 'commands', 'skills', 'agents'];
  for (const dir of managed) {
    const abs = path.join(root, dir);
    if (!(await fs.pathExists(abs))) continue;
    const stack = [abs];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const entryAbs = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryAbs);
          continue;
        }
        if (!entry.isFile()) continue;
        const rel = path.relative(root, entryAbs).split(path.sep).join('/');
        if (!tracked.has(rel)) {
          logger.error(`  foreign: ${rel}`);
          foreign++;
        }
      }
    }
  }
  return foreign;
}
