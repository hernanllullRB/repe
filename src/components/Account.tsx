"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loginUrl, signOut, useSession } from "@/lib/routines";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Botón "Entrar con Google" grande, para cuando algo necesita sesión. */
export function GoogleLoginButton({ next, label = "Entrar con Google" }: { next?: string; label?: string }) {
  return (
    <a
      href={loginUrl(next)}
      className="press inline-flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-surface px-5 text-base font-bold hover:bg-soft"
    >
      <GoogleIcon size={20} />
      {label}
    </a>
  );
}

/** Botón de cuenta del encabezado: "Entrar" o el avatar con la opción de salir. */
export function AccountButton() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Con cacheComponents la página queda oculta (<Activity>) al navegar: el menú se cierra.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (session.status === "loading") return <span aria-hidden="true" className="h-10 w-10" />;

  if (session.status === "anonymous") {
    if (!session.loginEnabled) return null;
    return (
      <a
        href={loginUrl()}
        className="press inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold hover:bg-soft"
      >
        <GoogleIcon />
        Entrar
      </a>
    );
  }

  const user = session.user!;
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Tu cuenta"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="press inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-lg font-bold text-accent-ink"
      >
        {user.picture ? (
          // Avatar de Google: dominio externo, no pasa por next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div className="reveal absolute right-0 top-12 z-40 flex w-60 flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 shadow-[0_12px_40px_rgba(21,23,43,0.18)]">
          <div className="flex min-w-0 flex-col">
            {user.name && <span className="truncate text-[15px] font-bold">{user.name}</span>}
            <span className="truncate text-[13px] text-muted">{user.email}</span>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="press h-10 rounded-xl bg-chip text-sm font-semibold hover:bg-soft"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
