"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex max-w-sm flex-col gap-3">
      <label htmlFor="token" className="text-sm font-semibold text-muted">
        Token de administración (ADMIN_TOKEN)
      </label>
      <input
        id="token"
        name="token"
        type="password"
        required
        autoFocus
        className="h-11 rounded-xl border border-line bg-surface px-3"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-fit items-center rounded-full bg-accent px-5 font-semibold text-accent-ink disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}
