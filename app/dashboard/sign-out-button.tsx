"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      Kijelentkezés
    </button>
  );
}
