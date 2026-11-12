/** Minúsculas, sin acentos, sin signos y con espacios colapsados. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Slug en kebab-case sin acentos: "Press Arnold" -> "press-arnold". */
export function slugify(input: string): string {
  return normalize(input.replace(/ñ/gi, "n")).replace(/ /g, "-");
}
