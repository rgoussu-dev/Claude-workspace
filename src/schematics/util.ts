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
