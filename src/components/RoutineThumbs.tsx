import type { RoutineItem } from "@/lib/routines";
import { ExerciseImage } from "./ExerciseImage";

/** Fotos superpuestas de los primeros ejercicios de una rutina. */
export function RoutineThumbs({ items, size = 44, ring = "ring-surface" }: { items: RoutineItem[]; size?: number; ring?: string }) {
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <span className="flex flex-none" aria-hidden="true">
      {shown.map((it, i) => (
        <span
          key={it.slug}
          className={`relative overflow-hidden rounded-xl ring-2 ${ring}`}
          style={{ width: size, height: size, marginLeft: i ? -size / 3 : 0 }}
        >
          <ExerciseImage src={it.image} alt="" sizes={`${size}px`} />
        </span>
      ))}
    </span>
  );
}
