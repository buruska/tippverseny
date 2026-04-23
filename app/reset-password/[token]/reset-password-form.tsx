"use client";

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
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await resetPasswordAction(
        token,
        password,
        passwordConfirmation,
      );

      if (!result.ok) {
        setError(result.error ?? "Nem sikerült elmenteni az új jelszót.");
        return;
      }

      router.push("/login?reset=success");
      router.refresh();
    });
  }

  return (
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
  );
}
