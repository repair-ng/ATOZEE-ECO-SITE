/**
 * Normalizes a string for search matching: lowercases and strips ALL
 * whitespace (not just leading/trailing). This means "YC 6108" and
 * "yc6108" and "  YC6108 " all normalize to "yc6108" and match each other —
 * customers reading a stamped plate or typing a part name often add stray
 * spaces that shouldn't affect whether something matches.
 */
export function normalizeSearchTerm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

/** True if `haystack` contains `needle` once both are normalized. Treats an
 *  empty needle as "matches everything" so callers can skip the check when
 *  a filter isn't in use. */
export function fuzzyIncludes(haystack: string, needle: string): boolean {
  const n = normalizeSearchTerm(needle);
  if (!n) return true;
  return normalizeSearchTerm(haystack).includes(n);
}
