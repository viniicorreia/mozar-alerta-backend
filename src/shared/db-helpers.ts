/**
 * Unwraps the single-row array Drizzle's `.returning()`/aggregate queries
 * produce. TypeScript's `noUncheckedIndexedAccess` correctly can't know an
 * INSERT/UPDATE with a matching WHERE, or a COUNT(*) with no GROUP BY,
 * always returns exactly one row — this documents that guarantee at the one
 * place it's asserted instead of scattering non-null assertions everywhere.
 */
export function firstOrThrow<T>(rows: T[], context: string): T {
  const [row] = rows;
  if (row === undefined) {
    throw new Error(`Expected at least one row: ${context}`);
  }
  return row;
}
