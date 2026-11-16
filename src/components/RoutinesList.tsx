"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { routines, useRoutines, useSession, useSyncError } from "@/lib/routines";
import { GoogleLoginButton } from "./Account";
import { CameraIcon, ChevronRight, PlusIcon } from "./icons";
import { RoutineThumbs } from "./RoutineThumbs";

export function RoutinesList() {
  const list = useRoutines();
  const session = useSession();
  const syncError = useSyncError();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Con cacheComponents, Next oculta la página al navegar (<Activity>) en vez de
  // desmontarla: al salir se cierra el formulario y se borran los avisos.
  useLayoutEffect(
    () => () => {
      setCreating(false);
      setName("");
      setLoginError(false);
    },
    [],
  );

  useEffect(() => {
    // Vuelta del login con error (?login=error): se avisa y se limpia la URL.
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "error") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dato que solo existe en el navegador
      setLoginError(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!list) {
    return (
      <div className="flex flex-col gap-2.5" role="status" aria-label="Cargando rutinas">
        {[0, 1].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-[18px] bg-chip" />
        ))}
      </div>
    );
  }

  const loggedIn = session.status === "user";

  return (
    <div className="flex flex-col gap-5">
      {loginError && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
          No pudimos iniciar sesión con Google. Probá de nuevo.
        </p>
      )}
      {syncError && (
        <p role="status" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-ink">
          Hay cambios que todavía no se guardaron en tu cuenta. Revisá la conexión; se vuelve a intentar solo.
        </p>
      )}
      {list.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-5">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Todavía no armaste ninguna rutina</h2>
          <p className="text-[15px] leading-normal text-muted">
            Creá una acá o entrá a cualquier ejercicio y tocá “Agregar a mi rutina”.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((r) => {
            const done = r.done.filter((s) => r.items.some((i) => i.slug === s)).length;
            const count = r.items.length === 1 ? "1 ejercicio" : `${r.items.length} ejercicios`;
            return (
              <li key={r.id}>
                <Link
                  href={`/rutinas/${r.id}`}
                  className="press flex min-h-[74px] items-center gap-3.5 rounded-[18px] border border-line bg-surface p-3.5 hover:bg-soft/50"
                >
                  <RoutineThumbs items={r.items} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-display text-lg font-bold tracking-[-0.02em]">{r.name}</span>
                    <span className="text-[13px] text-muted">
                      {r.items.length === 0 ? "Sin ejercicios" : done > 0 ? `${count} · ${done} hechos hoy` : count}
                    </span>
                  </span>
                  <ChevronRight className="flex-none text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <form
          className="flex flex-col gap-2 rounded-[18px] bg-soft p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            const r = routines.create(name);
            setCreating(false);
            setName("");
            router.push(`/rutinas/${r.id}`);
          }}
        >
          <label htmlFor="routine-name" className="text-xs font-semibold text-muted">
            Nombre de la rutina
          </label>
          <div className="flex gap-2">
            <input
              id="routine-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Por ejemplo: Tirón, Piernas, Lunes"
              maxLength={40}
              className="h-12 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[15px] font-semibold outline-none ring-accent focus:ring-2"
            />
            <button type="submit" className="press h-12 rounded-xl bg-accent px-4 font-bold text-accent-ink">
              Crear
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="press flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-ink text-base font-bold text-bg"
        >
          <PlusIcon />
          Nueva rutina
        </button>
      )}

      {loggedIn ? (
        <Link
          href="/rutinas/importar"
          className="press flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-base font-bold hover:bg-soft"
        >
          <CameraIcon />
          Importar desde una foto
        </Link>
      ) : null}

      {loggedIn ? (
        <p className="text-[13px] leading-normal text-muted">
          Tus rutinas se guardan en tu cuenta ({session.user?.email}) y las ves en cualquier dispositivo.
        </p>
      ) : session.loginEnabled ? (
        <div className="flex flex-col gap-3 rounded-[18px] bg-soft p-4">
          <p className="text-[14px] leading-normal">
            Ahora tus rutinas se guardan solo en este dispositivo. Entrá con Google para tenerlas en tu cuenta,
            verlas desde cualquier lado e <strong>importar una rutina desde una foto</strong>.
          </p>
          <GoogleLoginButton next="/rutinas" />
        </div>
      ) : (
        <p className="text-[13px] leading-normal text-muted">
          Tus rutinas se guardan en este dispositivo, sin cuenta. Si borrás los datos del navegador, se pierden.
        </p>
      )}
    </div>
  );
}
