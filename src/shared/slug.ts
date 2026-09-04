const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/** Turns "Notícia: Prefeitura anuncia obra!" into "noticia-prefeitura-anuncia-obra". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

/** Appends a short random suffix — used when the base slug already exists. */
export function slugifyUnique(input: string): string {
  const base = slugify(input);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
