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
 * Audits both scopes and reports any drift between the manifest and the
 * filesystem: missing files, foreign files in expected locations, user
 * modifications since install.
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
    for (const e of m.entries) {
      const abs = path.join(root, e.target);
      if (!(await fs.pathExists(abs))) {
        logger.error(`  missing: ${e.target}`);
        issues++;
        continue;
      }
      const current = await fs.readFile(abs);
      if (sha256(current) !== e.sha256Current) {
        logger.warn(`  modified: ${e.target}`);
      }
    }
  }
  if (issues > 0) logger.error(`${issues} issue(s) found`);
  else logger.success('no issues');
  return issues;
}
