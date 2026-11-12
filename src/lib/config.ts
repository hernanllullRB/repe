/** Configuración leída de variables de entorno, con valores por defecto. */
function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  get aiProvider() {
    return process.env.AI_PROVIDER ?? "google";
  },
  get aiModel() {
    return process.env.AI_MODEL ?? "gemini-flash-lite-latest";
  },
  get youtubeApiKey() {
    return process.env.YOUTUBE_API_KEY ?? "";
  },
  get youtubeDailyCap() {
    return int("YOUTUBE_DAILY_CAP", 90);
  },
  get llmDailyCap() {
    return int("LLM_DAILY_CAP", 500);
  },
  get newExerciseDailyCap() {
    return int("NEW_EXERCISE_DAILY_CAP", 30);
  },
  get newExerciseIpCap() {
    return int("NEW_EXERCISE_IP_CAP", 3);
  },
  get ipHashSalt() {
    return process.env.IP_HASH_SALT ?? "repe-dev-salt";
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};
