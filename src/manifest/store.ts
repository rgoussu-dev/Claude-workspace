import path from 'node:path';
import fs from 'fs-extra';
import { MANIFEST_FILENAME, type Manifest, ManifestSchema } from './schema.js';

/**
 * Reads the manifest from the given installed-scope root directory. Returns
 * `null` if no manifest exists (fresh install).
 */
export async function readManifest(scopeRoot: string): Promise<Manifest | null> {
  const file = path.join(scopeRoot, MANIFEST_FILENAME);
  if (!(await fs.pathExists(file))) return null;
  const raw = await fs.readJson(file);
  return ManifestSchema.parse(raw);
}

/**
 * Writes the manifest to the given installed-scope root directory. Creates
 * the directory if necessary.
 */
export async function writeManifest(scopeRoot: string, manifest: Manifest): Promise<void> {
  await fs.ensureDir(scopeRoot);
  await fs.writeJson(path.join(scopeRoot, MANIFEST_FILENAME), manifest, { spaces: 2 });
}
