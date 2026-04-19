import { createHash } from 'node:crypto';

/**
 * Computes a hex-encoded sha256 of the given bytes. Used by the manifest
 * to detect user modifications to installed files.
 */
export function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}
