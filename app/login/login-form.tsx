"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { PasswordInput } from "@/app/components/password-input";

import { requestPasswordResetAction } from "./actions";

type LoginFormProps = {
  defaultCallbackUrl?: string;
};

export function LoginForm({ defaultCallbackUrl = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrlFromQuery = searchParams.get("callbackUrl");
  const callbackUrl = callbackUrlFromQuery ?? defaultCallbackUrl;
  const errorFromUrl = searchParams.get("error");
  const resetFromUrl = searchParams.get("reset");
  const verifiedFromUrl = searchParams.get("verified");
  const emailFromUrl = searchParams.get("email") ?? "";
  const [error, setError] = useState<string | null>(
    errorFromUrl ? "Sikertelen bejelentkezés. Ellenőrizd az adatokat." : null,
  );
  const [message, setMessage] = useState<string | null>(
    verifiedFromUrl === "success"
      ? "Az email címedet megerősítettük. Most már be tudsz jelentkezni."
      : resetFromUrl === "success"
      ? "Az új jelszó elmentve. Most már be tudsz jelentkezni."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(emailFromUrl);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

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

    let destination = result.url ?? callbackUrl;

    if (!callbackUrlFromQuery) {
      const session = await getSession();

      if (session?.user.role === "SUPERADMIN") {
        destination = "/admin";
      } else {
        destination = defaultCallbackUrl;
      }
    }

    router.push(destination);
    router.refresh();
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setIsResetSubmitting(true);

    const result = await requestPasswordResetAction(resetEmail);

    setIsResetSubmitting(false);

    if (!result.ok) {
      setResetError(result.error ?? "Nem sikerült elküldeni a reset linket.");
      return;
    }

    setResetMessage(
      result.message ??
        "Ha létezik ilyen fiók, elküldtük a jelszó-visszaállító linket az email címre.",
    );
  }

  return (
    <>
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
            onChange={(event) => {
              setEmail(event.target.value);

              if (!resetEmail) {
                setResetEmail(event.target.value);
              }
            }}
            placeholder="email@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-2">
          <PasswordInput
            autoComplete="current-password"
            id="password"
            label="Jelszó"
            minLength={1}
            onChange={setPassword}
            value={password}
          />
          <button
            className="text-sm font-semibold text-[color:var(--green)] transition hover:text-[#0f684d]"
            onClick={() => {
              setResetError(null);
              setResetMessage(null);
              setResetEmail(email);
              setIsResetModalOpen(true);
            }}
            type="button"
          >
            Elfelejtetted a jelszavadat?
          </button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
          </div>
        ) : null}

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

      {isResetModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--green)]">
                  Jelszó-visszaállítás
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                  Reset link küldése
                </h3>
              </div>
              <button
                aria-label="Modal bezárása"
                className="rounded-full px-3 py-2 text-xl leading-none text-[color:var(--muted,#5B6B7F)] hover:bg-[color:var(--card-muted)]"
                onClick={() => setIsResetModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handlePasswordReset}>
              <div>
                <label
                  className="text-sm font-semibold text-[color:var(--navy)]"
                  htmlFor="reset-email"
                >
                  Email cím
                </label>
                <input
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                  id="reset-email"
                  onChange={(event) => setResetEmail(event.target.value)}
                  placeholder="email@example.com"
                  required
                  type="email"
                  value={resetEmail}
                />
              </div>

              {resetMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {resetMessage}
                </div>
              ) : null}

              {resetError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {resetError}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
                  onClick={() => setIsResetModalOpen(false)}
                  type="button"
                >
                  Mégsem
                </button>
                <button
                  className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-65"
                  disabled={isResetSubmitting}
                  type="submit"
                >
                  {isResetSubmitting ? "Küldés..." : "Reset link küldése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
