"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "./icons";
import { SearchBox } from "./SearchBox";

/** Botón de búsqueda sobre el video (móvil): abre el buscador arriba de todo. */
export function SearchSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Buscar otro ejercicio"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="press inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
      >
        <SearchIcon size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Buscar otro ejercicio">
          <button
            type="button"
            aria-label="Cerrar buscador"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-hero/40 backdrop-blur-[2px]"
          />
          <div className="pop relative flex items-start gap-2 rounded-b-[22px] bg-bg px-4 pb-4 pt-3 shadow-[0_16px_40px_rgba(27,31,59,0.18)]">
            <div className="min-w-0 flex-1">
              <SearchBox variant="compact" autoFocus />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="press inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-muted hover:text-ink"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
