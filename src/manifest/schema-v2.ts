/**
 * Manifest v2 schema. Adds capability-tag composition (tags,
 * verticals, versions, answers) on top of the v1 file-tracking
 * entries, which remain for `keel doctor` drift detection.
 *
 * v1 manifests are migrated on first v2 read by {@link migrateV1};
 * the v1 _write path_ is gone — once a v1 manifest is read and the
 * caller writes back, it's persisted as v2.
 *
 * `MANIFEST_FILENAME` lives here too: it is the single name we use
 * for the manifest on disk, and lives next to the schemas that
 * govern the file's shape.
 */

import { z } from 'zod';

/** The on-disk manifest filename, under `<project>/.claude/`. */
export const MANIFEST_FILENAME = '.keel-manifest.json';

/**
 * v1 file-tracking entry. `sha256Shipped` is the hash at install
 * time; `sha256Current` is the hash at last manifest write.
 * Divergence indicates a user edit. Carried verbatim into v2 for
 * drift detection.
 */
export const ManifestEntrySchema = z.object({
  source: z.string(),
  target: z.string(),
  sha256Shipped: z.string(),
  sha256Current: z.string(),
  installedAt: z.string(),
});

/**
 * v1 manifest schema. Kept around solely so {@link parseManifest}
 * can recognise an on-disk v1 file and migrate it to v2 in memory.
 * Nothing in keel writes v1 manifests anymore.
 */
const ManifestV1Schema = z.object({
  kitVersion: z.string(),
  installedAt: z.string(),
  updatedAt: z.string(),
  entries: z.array(ManifestEntrySchema),
});

export const InstalledVerticalSchema = z.object({
  id: z.string(),
  installedAt: z.string(),
});

export const ManifestV2Schema = z.object({
  version: z.literal(2),
  keelVersion: z.string(),
  installedAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  verticals: z.array(InstalledVerticalSchema),
  versions: z.record(z.string(), z.string()),
  answers: z.record(z.string(), z.record(z.string(), z.string())),
  entries: z.array(ManifestEntrySchema),
});

export type ManifestV2Data = z.infer<typeof ManifestV2Schema>;

/**
 * Reads either a v1 or v2 manifest and returns v2 data, migrating
 * in memory if needed. Migration is non-destructive — the file on
 * disk stays v1 until something writes it back.
 */
export function parseManifest(raw: unknown): ManifestV2Data {
  if (typeof raw === 'object' && raw !== null && (raw as { version?: unknown }).version === 2) {
    return ManifestV2Schema.parse(raw);
  }
  const v1 = ManifestV1Schema.parse(raw);
  return migrateV1(v1);
}

/**
 * Promotes a v1 manifest to v2 with empty tag/vertical/answer state.
 * Existing file-tracking entries are preserved verbatim.
 */
export function migrateV1(v1: z.infer<typeof ManifestV1Schema>): ManifestV2Data {
  return {
    version: 2,
    keelVersion: v1.kitVersion,
    installedAt: v1.installedAt,
    updatedAt: v1.updatedAt,
    tags: [],
    verticals: [],
    versions: {},
    answers: {},
    entries: v1.entries,
  };
}

/** A new, empty v2 manifest. */
export function emptyManifestV2(now: string, keelVersion: string): ManifestV2Data {
  return {
    version: 2,
    keelVersion,
    installedAt: now,
    updatedAt: now,
    tags: [],
    verticals: [],
    versions: {},
    answers: {},
    entries: [],
  };
}
