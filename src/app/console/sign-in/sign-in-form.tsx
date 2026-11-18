"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";
import { ui } from "../ui";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);

  return (
    <form action={action} className={`${ui.card} flex flex-col gap-4`}>
      <label className={ui.field}>
        <span className={ui.label}>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state?.email}
          className={ui.input}
        />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={ui.input} />
      </label>
      {state?.error && (
        <p role="alert" className={ui.error}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={ui.button}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
