/**
 * Manifest v2 schema. Adds capability-tag composition (tags,
 * verticals, versions, answers) on top of the v1 file-tracking
 * entries, which remain for `keel doctor` drift detection.
 *
 * v1 manifests are migrated on first v2 read by {@link migrateV1}; no
 * write of a v1 manifest happens after v2 lands.
 */

import { z } from 'zod';
import { ManifestEntrySchema, ManifestSchema as ManifestV1Schema } from './schema.js';

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
 * Reads either a v1 or v2 manifest and returns v2 data, migrating in
 * memory if needed. Migration is non-destructive — the file on disk
 * stays v1 until something writes it back.
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
