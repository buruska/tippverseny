import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();

  if (session?.user) {
    redirect(session.user.role === "SUPERADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-[color:var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(11,31,58,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
          VB Tippverseny 2026
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[color:var(--navy)]">
          Bejelentkezés
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
          Lépj be az email címeddel és jelszavaddal. A superadmin jogosultság a
          felhasználói szerepkör alapján működik.
        </p>
        <LoginForm defaultCallbackUrl="/dashboard" />
      </section>
    </main>
  );
}
