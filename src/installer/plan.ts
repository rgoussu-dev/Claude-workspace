import path from 'node:path';
import fs from 'fs-extra';

/**
 * A single file that the installer intends to place into the target scope.
 * Plans are computed before any file is written so the user can inspect or
 * dry-run the change.
 */
export interface PlannedFile {
  sourceAbs: string;
  targetAbs: string;
  relative: string;
}

/**
 * Walks the packaged asset root recursively and returns every file that
 * would be installed into the target scope. Directory structure is
 * preserved relative to `assetRoot`.
 */
export async function planInstall(assetRoot: string, targetRoot: string): Promise<PlannedFile[]> {
  const plan: PlannedFile[] = [];
  await walk(assetRoot, assetRoot, targetRoot, plan);
  return plan;
}

async function walk(
  current: string,
  root: string,
  target: string,
  out: PlannedFile[],
): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(abs, root, target, out);
    } else if (entry.isFile()) {
      const relative = path.relative(root, abs);
      out.push({
        sourceAbs: abs,
        targetAbs: path.join(target, relative),
        relative,
      });
    }
  }
}
