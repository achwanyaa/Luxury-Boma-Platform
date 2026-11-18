import type { Metadata } from "next";
import { Suspense } from "react";
import { getTwoFactorStep } from "@/lib/console/staff";
import { signOut } from "../actions";
import { ui } from "../ui";
import { CodeForm, EnrolApp } from "./two-factor-forms";

export const metadata: Metadata = { title: "Two-factor check" };

export default function TwoFactorPage() {
  return (
    <main className={ui.narrowMain}>
      <h1 className={ui.h1}>Two-factor check</h1>
      <Suspense fallback={<p className={ui.lead}>Checking your account…</p>}>
        <Step />
      </Suspense>
      <form action={signOut}>
        <button type="submit" className={ui.linkButton}>
          Sign out
        </button>
      </form>
    </main>
  );
}

async function Step() {
  const step = await getTwoFactorStep();
  if (step.kind === "verify") {
    return (
      <div className={`${ui.card} flex flex-col gap-4`}>
        <p className="text-body">Enter the 6-digit code from your authenticator app.</p>
        <CodeForm factorId={step.factorId} />
      </div>
    );
  }
  return <EnrolApp />;
}
