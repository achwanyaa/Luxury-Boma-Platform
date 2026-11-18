import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "../actions";
import { ui } from "../ui";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/console/sign-in">) {
  return (
    <main className={ui.narrowMain}>
      <div className="flex flex-col gap-1">
        <h1 className={ui.h1}>Staff sign-in</h1>
        <p className={ui.lead}>
          For LuxuryBoma staff. After your password you&apos;ll enter a code from your authenticator app.
        </p>
      </div>
      <Suspense fallback={null}>
        <NotStaffNotice searchParams={searchParams} />
      </Suspense>
      <SignInForm />
    </main>
  );
}

async function NotStaffNotice({ searchParams }: Pick<PageProps<"/console/sign-in">, "searchParams">) {
  const { reason } = await searchParams;
  if (reason !== "not-staff") return null;
  return (
    <div role="alert" className={`${ui.error} flex flex-col items-start gap-1`}>
      <p>The account you&apos;re signed in with is not a LuxuryBoma staff account.</p>
      <form action={signOut}>
        <button type="submit" className={ui.linkButton}>
          Sign out
        </button>
      </form>
    </div>
  );
}
