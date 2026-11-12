import { readFileSync, writeFileSync } from "node:fs";
import { overridesFileSchema, type Override } from "./schemas";

export const OVERRIDES_PATH = "data/overrides.json";

/** Claves: el id del dataset (source_id) o el slug del ejercicio. */
export function readOverrides(): Record<string, Override> {
  const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8")) as Record<string, unknown>;
  delete raw["$comentario"];
  return overridesFileSchema.parse(raw);
}

/**
 * Agrega o quita datos de un ejercicio en data/overrides.json, para que un
 * re-seed no pierda lo cargado a mano. Devuelve false si no se pudo escribir
 * (por ejemplo, en Vercel, donde el disco es de solo lectura).
 */
export function writeOverride(key: string, patch: Partial<Override> | null, field?: keyof Override): boolean {
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8")) as Record<string, Record<string, unknown>>;
    const current = { ...(raw[key] ?? {}) };
    if (patch) Object.assign(current, patch);
    if (field) delete current[field];
    if (Object.keys(current).length === 0) delete raw[key];
    else raw[key] = current;
    writeFileSync(OVERRIDES_PATH, `${JSON.stringify(raw, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}
