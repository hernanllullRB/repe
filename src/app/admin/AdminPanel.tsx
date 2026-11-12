"use client";

import { useMemo, useState, useTransition } from "react";
import { normalize } from "@/lib/normalize";
import { searchResultsUrl, thumbnailUrl } from "@/lib/youtube";
import { ExerciseImage } from "@/components/ExerciseImage";
import {
  addImageUrlAction,
  clearVideoAction,
  logout,
  searchVideoAction,
  setImagesAction,
  setVideoAction,
  uploadImageAction,
  type ActionResult,
} from "./actions";
import type { AdminRow } from "./rows";

type Filter = "todos" | "sin-video" | "automatico" | "manual" | "sin-imagenes" | "imagenes-propias";
const PAGE_SIZE = 25;

export function AdminPanel({ initialRows, youtubeReady }: { initialRows: AdminRow[]; youtubeReady: boolean }) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const counts = useMemo(
    () => ({
      todos: rows.length,
      "sin-video": rows.filter((r) => !r.videoId).length,
      automatico: rows.filter((r) => r.videoId && r.videoSource !== "manual").length,
      manual: rows.filter((r) => r.videoSource === "manual").length,
      "sin-imagenes": rows.filter((r) => r.images.length === 0).length,
      "imagenes-propias": rows.filter((r) => r.imagesEdited).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    return rows.filter((r) => {
      if (filter === "sin-video" && r.videoId) return false;
      if (filter === "automatico" && (!r.videoId || r.videoSource === "manual")) return false;
      if (filter === "manual" && r.videoSource !== "manual") return false;
      if (filter === "sin-imagenes" && r.images.length > 0) return false;
      if (filter === "imagenes-propias" && !r.imagesEdited) return false;
      if (!q) return true;
      return normalize(`${r.nameEs} ${r.nameEn} ${r.slug} ${r.muscles.join(" ")}`).includes(q);
    });
  }, [rows, filter, query]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const update = (row: AdminRow) => setRows((prev) => prev.map((r) => (r.slug === row.slug ? row : r)));

  const filters: { id: Filter; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "sin-video", label: "Sin video" },
    { id: "automatico", label: "Video automático" },
    { id: "manual", label: "Video manual" },
    { id: "sin-imagenes", label: "Sin imágenes" },
    { id: "imagenes-propias", label: "Imágenes editadas" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por video">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(0);
              }}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${
                filter === f.id ? "bg-ink text-bg" : "bg-chip"
              }`}
            >
              {f.label} <span className="ml-1.5 font-normal opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-muted underline">
            Cerrar sesión
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="admin-q" className="text-sm font-semibold text-muted">
          Buscar por nombre, slug o músculo
        </label>
        <input
          id="admin-q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="h-11 max-w-md rounded-xl border border-line bg-surface px-3"
        />
      </div>

      {!youtubeReady && (
        <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
          Sin YOUTUBE_API_KEY: podés asignar videos a mano, pero no se validan ni se buscan demos automáticas.
        </p>
      )}

      <p className="text-sm text-muted">
        {visible.length} ejercicios · página {current + 1} de {pages}
      </p>

      <ul className="flex flex-col gap-3">
        {pageRows.map((row) => (
          <Row key={row.slug} row={row} onUpdate={update} youtubeReady={youtubeReady} />
        ))}
      </ul>

      <nav className="flex items-center gap-3" aria-label="Páginas">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
          className="inline-flex min-h-10 items-center rounded-full bg-chip px-4 text-sm font-semibold disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-sm text-muted">
          {current + 1} / {pages}
        </span>
        <button
          type="button"
          disabled={current >= pages - 1}
          onClick={() => setPage(current + 1)}
          className="inline-flex min-h-10 items-center rounded-full bg-chip px-4 text-sm font-semibold disabled:opacity-40"
        >
          Siguiente
        </button>
      </nav>
    </div>
  );
}

function Row({ row, onUpdate, youtubeReady }: { row: AdminRow; onUpdate: (r: AdminRow) => void; youtubeReady: boolean }) {
  const [link, setLink] = useState("");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, start] = useTransition();
  const inputId = `video-${row.slug}`;

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setMessage(null);
      try {
        const res = await fn();
        if (res.ok) {
          onUpdate(res.row);
          setLink("");
          setPreview(false);
          if (res.message) setMessage({ text: res.message, error: false });
        } else {
          setMessage({ text: res.error, error: true });
        }
      } catch {
        setMessage({ text: "Algo falló. Recargá la página y probá de nuevo.", error: true });
      }
    });

  const badge =
    row.videoSource === "manual"
      ? { text: "Manual", cls: "bg-accent text-accent-ink" }
      : row.videoId
        ? { text: "Automático", cls: "bg-chip" }
        : { text: "Sin video", cls: "bg-warn-bg text-warn-ink" };

  return (
    <li className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 md:flex-row md:items-start">
      <div className="w-full flex-none md:w-[200px]">
        {row.videoId ? (
          preview ? (
            <iframe
              className="aspect-video w-full rounded-lg"
              src={`https://www.youtube-nocookie.com/embed/${row.videoId}?autoplay=1&mute=1&rel=0`}
              title={row.videoTitle ?? row.nameEs}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPreview(true)}
              aria-label={`Ver video de ${row.nameEs}`}
              className="block w-full overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbnailUrl(row.videoId)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
            </button>
          )
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-chip text-xs text-muted">
            Sin video
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{row.nameEs}</h2>
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
          {row.reviewed && <span className="rounded-md bg-chip px-2 py-0.5 text-xs">Nombre revisado</span>}
        </div>
        <p className="text-sm text-muted">
          {row.nameEn} · <code>{row.slug}</code>
          {row.muscles.length > 0 && ` · ${row.muscles.join(", ")}`}
          {row.equipment && ` · ${row.equipment}`}
        </p>
        {row.videoTitle && (
          <p className="text-sm">
            {row.videoTitle}
            {row.videoChannel && <span className="text-muted"> · {row.videoChannel}</span>}
          </p>
        )}

        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (link.trim()) run(() => setVideoAction(row.slug, link.trim()));
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Link de YouTube para {row.nameEs}
          </label>
          <input
            id={inputId}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Pegá un link de YouTube"
            className="h-10 min-w-0 flex-[1_1_260px] rounded-lg border border-line bg-bg px-3 text-sm"
          />
          <button
            type="submit"
            disabled={pending || !link.trim()}
            className="inline-flex min-h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Guardar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <a
            href={searchResultsUrl(`${row.nameEn} exercise demo`)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Buscar en YouTube ↗
          </a>
          {youtubeReady && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => searchVideoAction(row.slug))}
              className="font-semibold underline disabled:opacity-50"
            >
              Buscar demo automática
            </button>
          )}
          {row.videoId && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => clearVideoAction(row.slug))}
              className="font-semibold text-bad underline disabled:opacity-50"
            >
              Quitar video
            </button>
          )}
          <a href={`/ejercicio/${row.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
            Ver ficha ↗
          </a>
          {pending && <span className="text-muted">Guardando…</span>}
        </div>
        {message && (
          <p role="status" className={`text-sm ${message.error ? "text-bad" : "text-good"}`}>
            {message.text}
          </p>
        )}

        <ImagesEditor row={row} pending={pending} run={run} />
      </div>
    </li>
  );
}

function ImagesEditor({
  row,
  pending,
  run,
}: {
  row: AdminRow;
  pending: boolean;
  run: (fn: () => Promise<ActionResult>) => void;
}) {
  const [url, setUrl] = useState("");
  const fileId = `file-${row.slug}`;
  const urlId = `img-url-${row.slug}`;
  const imgs = row.images;
  const move = (from: number, to: number) => {
    const next = [...imgs];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    run(() => setImagesAction(row.slug, next));
  };

  return (
    <div className="mt-2 flex flex-col gap-2.5 border-t border-line pt-3">
      <h3 className="text-sm font-bold">
        Imágenes <span className="font-normal text-muted">· la primera es la principal (buscador y rutinas)</span>
      </h3>
      <ul className="flex flex-wrap gap-3">
        {imgs.map((src, i) => (
          <li key={src} className="flex w-[168px] flex-col gap-1.5">
            <div className={`relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-chip ${i === 0 ? "ring-[3px] ring-accent" : ""}`}>
              <ExerciseImage src={src} alt={`Imagen ${i + 1} de ${row.nameEs}`} sizes="168px" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              {i === 0 ? (
                <span className="font-semibold text-accent">★ Principal</span>
              ) : (
                <button type="button" disabled={pending} onClick={() => move(i, 0)} aria-label="Usar como imagen principal" className="font-semibold underline disabled:opacity-50">
                  Principal
                </button>
              )}
              <span className="flex-1" />
              <button
                type="button"
                aria-label="Mover a la izquierda"
                disabled={pending || i === 0}
                onClick={() => move(i, i - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-chip disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Mover a la derecha"
                disabled={pending || i === imgs.length - 1}
                onClick={() => move(i, i + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-chip disabled:opacity-30"
              >
                →
              </button>
              <button
                type="button"
                aria-label="Quitar imagen"
                disabled={pending}
                onClick={() => run(() => setImagesAction(row.slug, imgs.filter((_, k) => k !== i)))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bad-soft font-bold text-bad disabled:opacity-30"
              >
                ×
              </button>
            </div>
          </li>
        ))}
        <li className="flex w-[180px]">
          <label
            htmlFor={fileId}
            className="flex aspect-[3/2] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-line text-center text-[13px] text-muted hover:border-accent hover:text-ink"
          >
            <span className="font-semibold text-ink">Subir imagen</span>
            JPG, PNG o WebP · hasta 4 MB
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("file", file);
              e.target.value = "";
              run(() => uploadImageAction(row.slug, fd));
            }}
          />
        </li>
      </ul>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) return;
          const value = url.trim();
          setUrl("");
          run(() => addImageUrlAction(row.slug, value));
        }}
      >
        <label htmlFor={urlId} className="sr-only">
          Link de una imagen para {row.nameEs}
        </label>
        <input
          id={urlId}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="O pegá el link de una imagen"
          className="h-10 min-w-0 flex-[1_1_260px] rounded-lg border border-line bg-bg px-3 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="inline-flex min-h-10 items-center rounded-full bg-chip px-4 text-sm font-semibold disabled:opacity-50"
        >
          Agregar
        </button>
      </form>
    </div>
  );
}
