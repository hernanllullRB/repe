"use client";

import { useState } from "react";
import type { ExerciseView } from "@/lib/exercises";
import { searchResultsUrl, thumbnailUrl } from "@/lib/youtube";
import { ExerciseImage } from "./ExerciseImage";
import { PlayIcon } from "./icons";

type Props = {
  name: string;
  nameEn: string;
  video: ExerciseView["video"];
  images: string[];
  loading?: boolean;
  /** Clases del marco: el móvil lo usa de borde a borde y el escritorio redondeado. */
  className?: string;
  playSize?: "md" | "lg";
};

function duration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Demo del ejercicio. Muestra la miniatura y carga el reproductor recién al
 * tocarla (sin sonido y en bucle), así la ficha carga rápido.
 */
export function VideoBlock({ name, nameEn, video, images, loading = false, className = "", playSize = "md" }: Props) {
  const [playing, setPlaying] = useState(false);
  const frame = `relative aspect-video w-full overflow-hidden bg-hero text-white ${className}`;
  const playDims = playSize === "lg" ? "h-[84px] w-[84px]" : "h-[72px] w-[72px]";

  if (loading && !video) {
    return (
      <div className={frame} role="status" aria-label="Buscando una demo">
        <div className="absolute inset-0 animate-pulse bg-white/5" />
        <span className="absolute bottom-4 left-4 text-xs text-white/70">Buscando una demo…</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={frame}>
        {images.length > 0 && (
          <div className="absolute inset-0 opacity-90">
            <ExerciseImage src={images[0]} alt={name} sizes="(min-width: 768px) 720px, 100vw" priority />
          </div>
        )}
        <a
          href={searchResultsUrl(`${nameEn} exercise demo`)}
          target="_blank"
          rel="noopener noreferrer"
          className="press absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black/60 px-3.5 text-[13px] font-semibold text-white backdrop-blur-sm hover:bg-black/75"
        >
          Ver demos en YouTube
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  const time = duration(video.seconds);

  return (
    <div className={frame}>
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&loop=1&playlist=${video.id}&rel=0&playsinline=1`}
          title={video.title ?? `Demo de ${name}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          aria-label={`Reproducir demo de ${name}`}
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex cursor-pointer items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl(video.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />
          <span
            className={`relative inline-flex ${playDims} items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-105 group-active:scale-95`}
          >
            <PlayIcon size={playSize === "lg" ? 32 : 28} />
          </span>
          <span className="absolute bottom-3.5 right-3.5 inline-flex h-[26px] items-center rounded-full bg-black/50 px-2.5 text-xs font-semibold tabular-nums backdrop-blur-sm md:h-7 md:px-3 md:text-[13px]">
            {time ? `Demo · ${time} · en bucle` : "Demo · en bucle"}
          </span>
        </button>
      )}
    </div>
  );
}
