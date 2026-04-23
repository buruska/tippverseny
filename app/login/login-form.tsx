"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  defaultCallbackUrl?: string;
};

export function LoginForm({ defaultCallbackUrl = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? defaultCallbackUrl;
  const errorFromUrl = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    errorFromUrl ? "Sikertelen bejelentkezés. Ellenőrizd az adatokat." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!result?.ok) {
      setError("Hibás email cím vagy jelszó.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-semibold text-[color:var(--navy)]" htmlFor="email">
          Email cím
        </label>
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
          id="email"
          name="email"
          placeholder="email@example.com"
          required
          type="email"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-[color:var(--navy)]" htmlFor="password">
          Jelszó
        </label>
        <div className="relative mt-2">
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 pr-14 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
            className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--muted,#5B6B7F)] transition hover:bg-[color:var(--card-muted)] hover:text-[color:var(--navy)]"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6 0 9.5 6 9.5 8a7.6 7.6 0 0 1-2 3" />
                <path d="M6.5 6.8C4 8.4 2.5 10.8 2.5 12c0 2 3.5 8 9.5 8 1.5 0 2.9-.4 4.1-1" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M2.5 12c0-2 3.5-8 9.5-8s9.5 6 9.5 8-3.5 8-9.5 8-9.5-6-9.5-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <button
        className="w-full rounded-2xl bg-[color:var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:translate-y-[-1px] hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Bejelentkezés..." : "Bejelentkezés"}
      </button>
    </form>
  );
}
