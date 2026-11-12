import { config } from "./config";

/** Toda llamada a YouTube Data API pasa por este archivo. */

export interface VideoInfo {
  videoId: string;
  title: string;
  channel: string;
  seconds?: number | null;
}

const API = "https://www.googleapis.com/youtube/v3";

export function youtubeConfigured(): boolean {
  return Boolean(config.youtubeApiKey);
}

/**
 * Extrae el ID de 11 caracteres de un ID suelto o de cualquier URL de YouTube
 * (watch?v=, youtu.be/, shorts/, embed/, live/). Devuelve null si no es válido.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  const ID = /^[A-Za-z0-9_-]{11}$/;
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let candidate: string | null = null;
  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    candidate = url.searchParams.get("v");
    if (!candidate) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) candidate = parts[1] ?? null;
    }
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

export function searchResultsUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

interface SearchResponse {
  items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[];
}

/** search.list: cuesta 100 unidades de cuota. Devuelve los IDs en orden de relevancia. */
export async function searchVideoIds(
  query: string,
  opts: { duration?: "short" | "medium" | "any"; language?: string } = {},
): Promise<string[]> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    videoDuration: opts.duration ?? "short", // short = menos de 4 minutos
    safeSearch: "strict",
    maxResults: "10",
    key: config.youtubeApiKey,
  });
  if (opts.language) params.set("relevanceLanguage", opts.language);
  const res = await fetch(`${API}/search?${params}`);
  if (!res.ok) throw new Error(`YouTube search ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as SearchResponse;
  return (data.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => Boolean(id));
}

/** Duración ISO 8601 de YouTube ("PT1M5S") a segundos. */
export function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, sec] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + sec;
}

export interface VideoCandidate extends VideoInfo {
  seconds: number | null;
  embeddable: boolean;
}

/** Rango ideal para una demo: se ve el movimiento sin explicaciones largas. */
export const DEMO_MIN_SECONDS = 8;
export const DEMO_MAX_SECONDS = 90;

/**
 * Elige la mejor demo entre candidatos ya ordenados por relevancia:
 * el primero que dure entre 8 y 90 segundos; si no hay, el más corto de hasta 4 minutos.
 */
export function pickDemo(candidates: VideoCandidate[]): VideoCandidate | null {
  const ok = candidates.filter((c) => c.embeddable && c.seconds !== null && c.seconds >= DEMO_MIN_SECONDS);
  const ideal = ok.find((c) => c.seconds! <= DEMO_MAX_SECONDS);
  if (ideal) return ideal;
  const short = ok.filter((c) => c.seconds! <= 240).sort((a, b) => a.seconds! - b.seconds!);
  return short[0] ?? null;
}

/**
 * Busca una demo corta del ejercicio: search.list (100 unidades) + videos.list
 * para ver las duraciones (1 unidad). Busca con el nombre en inglés, que tiene
 * muchas más demos sin narración; el movimiento se entiende en cualquier idioma.
 */
export async function findDemoVideo(nameEn: string): Promise<VideoInfo | null> {
  const ids = await searchVideoIds(`${nameEn} exercise demo`);
  if (ids.length === 0) return null;
  const candidates = await getVideos(ids);
  const byId = new Map(candidates.map((c) => [c.videoId, c]));
  const ordered = ids.map((id) => byId.get(id)).filter((c): c is VideoCandidate => Boolean(c));
  const pick = pickDemo(ordered);
  return pick ? { videoId: pick.videoId, title: pick.title, channel: pick.channel, seconds: pick.seconds } : null;
}

interface VideosResponse {
  items?: {
    id: string;
    snippet?: { title?: string; channelTitle?: string };
    status?: { embeddable?: boolean };
    contentDetails?: { duration?: string };
  }[];
}

/** videos.list: cuesta 1 unidad por pedido (hasta 50 videos). */
export async function getVideos(ids: string[]): Promise<VideoCandidate[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({
    part: "snippet,status,contentDetails",
    id: ids.slice(0, 50).join(","),
    key: config.youtubeApiKey,
  });
  const res = await fetch(`${API}/videos?${params}`);
  if (!res.ok) throw new Error(`YouTube videos ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as VideosResponse;
  return (data.items ?? []).map((item) => ({
    videoId: item.id,
    title: decodeEntities(item.snippet?.title ?? ""),
    channel: decodeEntities(item.snippet?.channelTitle ?? ""),
    embeddable: item.status?.embeddable !== false,
    seconds: parseDuration(item.contentDetails?.duration),
  }));
}

/** Valida un video elegido a mano: que exista y se pueda embeber. */
export async function getVideo(videoId: string): Promise<VideoCandidate | null> {
  const [video] = await getVideos([videoId]);
  return video ?? null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
