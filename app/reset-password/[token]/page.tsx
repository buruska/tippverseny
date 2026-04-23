import { notFound } from "next/navigation";

import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashPasswordResetToken(token),
    },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  if (
    !passwordResetToken ||
    passwordResetToken.usedAt ||
    passwordResetToken.expiresAt <= new Date()
  ) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-[color:var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(11,31,58,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
          VB Tippverseny 2026
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[color:var(--navy)]">
          Új jelszó beállítása
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
          Adj meg egy új, erős jelszót. A mentés után visszairányítunk a
          bejelentkezéshez.
        </p>
        <ResetPasswordForm token={token} />
      </section>
    </main>
  );
}
