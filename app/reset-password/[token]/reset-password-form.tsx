"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { PasswordChecklist } from "@/app/components/password-checklist";
import { PasswordInput } from "@/app/components/password-input";
import { generateStrongPassword, getPasswordChecks } from "@/lib/password";

import { resetPasswordAction } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const passwordChecks = getPasswordChecks(password);
  const passwordsMatch =
    password.length > 0 &&
    passwordConfirmation.length > 0 &&
    password === passwordConfirmation;
  const canSubmit = passwordChecks.every((check) => check.isValid) && passwordsMatch;

  function handleGeneratePassword() {
    const generatedPassword = generateStrongPassword();

    setPassword(generatedPassword);
    setPasswordConfirmation(generatedPassword);
    setError(null);
    setMessage("Erős jelszót generáltunk és kitöltöttük mindkét mezőt.");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPasswordReset();
  }

  function submitPasswordReset(allowReuse = false) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await resetPasswordAction(
        token,
        password,
        passwordConfirmation,
        allowReuse,
      );

      if (!result.ok) {
        if (result.requiresConfirmation) {
          setIsConfirmModalOpen(true);
          return;
        }

        setError(result.error ?? "Nem sikerült elmenteni az új jelszót.");
        return;
      }

      setIsConfirmModalOpen(false);
      const signInResult = await signIn("credentials", {
        email: result.email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (!signInResult?.ok) {
        router.push(
          `/login?reset=success&email=${encodeURIComponent(result.email ?? "")}`,
        );
        router.refresh();
        return;
      }

      const session = await getSession();
      const destination = session?.user.role === "SUPERADMIN" ? "/admin" : "/dashboard";

      router.push(signInResult.url ?? destination);
      router.refresh();
    });
  }

  return (
    <>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <button
          className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
          onClick={handleGeneratePassword}
          type="button"
        >
          Jelszó generálása
        </button>

        <PasswordInput
          autoComplete="new-password"
          id="reset-password"
          label="Új jelszó"
          minLength={12}
          onChange={setPassword}
          value={password}
        />

        <PasswordInput
          autoComplete="new-password"
          id="reset-password-confirmation"
          label="Új jelszó megerősítése"
          minLength={12}
          onChange={setPasswordConfirmation}
          value={passwordConfirmation}
        />

        <PasswordChecklist
          checks={passwordChecks}
          passwordsMatch={passwordsMatch}
          showPasswordMatch={passwordConfirmation.length > 0}
        />

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
          disabled={isPending || !canSubmit}
          type="submit"
        >
          {isPending ? "Mentés..." : "Új jelszó mentése"}
        </button>
      </form>

      {isConfirmModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--green)]">
                Jelszó megerősítése
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                Ugyanazt a jelszót használod
              </h3>
              <p className="mt-4 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
                Az új jelszó megegyezik a jelenlegivel. Biztosan szeretnéd így is
                felülírni a jelszót?
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
                disabled={isPending}
                onClick={() => setIsConfirmModalOpen(false)}
                type="button"
              >
                Mégsem
              </button>
              <button
                className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isPending}
                onClick={() => void submitPasswordReset(true)}
                type="button"
              >
                {isPending ? "Mentés..." : "Igen, mentés"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
