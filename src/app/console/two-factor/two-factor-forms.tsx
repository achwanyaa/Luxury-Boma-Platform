"use client";

import Image from "next/image";
import { useActionState } from "react";
import { startEnrolment, verifyCode, type EnrolState, type FormState } from "../actions";
import { ui } from "../ui";

export function CodeForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyCode, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="factorId" value={factorId} />
      <label className={ui.field}>
        <span className={ui.label}>6-digit code</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className={`${ui.input} text-lg tracking-[0.3em]`}
        />
      </label>
      {state?.error && (
        <p role="alert" className={ui.error}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={ui.button}>
        {pending ? "Checking…" : "Verify"}
      </button>
    </form>
  );
}

export function EnrolApp() {
  const [state, start, pending] = useActionState<EnrolState>(startEnrolment, undefined);

  if (!state || "error" in state) {
    return (
      <div className={`${ui.card} flex flex-col gap-4`}>
        <p className="text-body">
          Staff accounts need a second step at every sign-in. Set up an authenticator app once: Google
          Authenticator, Microsoft Authenticator, 1Password or similar.
        </p>
        {state?.error && (
          <p role="alert" className={ui.error}>
            {state.error}
          </p>
        )}
        <form action={start}>
          <button type="submit" disabled={pending} className={`${ui.button} w-full`}>
            {pending ? "Starting…" : "Set up authenticator app"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <ol className={`${ui.card} flex flex-col gap-6`}>
      <li className="flex flex-col gap-3">
        <p className="text-body">
          <span className="font-semibold">1.</span> In your authenticator app, add an account and scan this code.
        </p>
        <Image
          src={qrImageSrc(state.qrCode)}
          alt="QR code to add the LuxuryBoma console to your authenticator app"
          width={192}
          height={192}
          unoptimized
          className="self-center rounded-card border border-line bg-white p-2"
        />
        <details className="text-sm text-muted">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-lb">Can&apos;t scan it?</summary>
          <p className="mb-1">Type this key into the app instead:</p>
          <code className="block break-all rounded-control bg-lb-tint px-3 py-2 font-mono text-ink">
            {groupKey(state.secret)}
          </code>
        </details>
      </li>
      <li className="flex flex-col gap-3">
        <p className="text-body">
          <span className="font-semibold">2.</span> Enter the 6-digit code the app shows.
        </p>
        <CodeForm factorId={state.factorId} />
      </li>
    </ol>
  );
}

// Supabase returns the QR code as an SVG, usually with an unencoded
// "data:image/svg+xml;utf-8," prefix. Encode it so every browser reads it.
function qrImageSrc(qrCode: string) {
  const svg = qrCode.replace(/^data:image\/svg\+xml;(utf-8|charset=utf-8),/, "");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function groupKey(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
