/**
 * Tiny name-case utilities shared by schematic factories. They are kept
 * here so schematics don't each reinvent camel/pascal/kebab helpers.
 */

export function toPascalCase(input: string): string {
  return input
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join('');
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.length ? pascal[0]!.toLowerCase() + pascal.slice(1) : pascal;
}

export function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
}

export function packageToPath(pkg: string): string {
  return pkg.replace(/\./g, '/');
}

export function humanise(input: string): string {
  return toPascalCase(input)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

/**
 * The set of languages schematics can target in the MVP. The type is
 * derived from this tuple so it stays in sync when we add languages.
 */
export const SUPPORTED_LANGUAGES = ['java'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Validates a user-supplied `language` option against the kit's
 * {@link SUPPORTED_LANGUAGES}. Parses the raw value as a string, narrows
 * to the literal union after validation, and throws a typed error
 * otherwise — avoiding the misleading pattern of asserting the literal
 * type before checking it.
 *
 * @param raw       the raw option value, typically `options['language']`.
 * @param schematic the schematic name, included in the error message.
 * @param fallback  language used when `raw` is nullish.
 */
export function resolveLanguage(
  raw: unknown,
  schematic: string,
  fallback: SupportedLanguage = 'java',
): SupportedLanguage {
  const value = raw == null ? fallback : String(raw);
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(value)) {
    return value as SupportedLanguage;
  }
  throw new Error(
    `${schematic} schematic: language "${value}" not supported in MVP ` +
      `(supported: ${SUPPORTED_LANGUAGES.join(', ')})`,
  );
}
