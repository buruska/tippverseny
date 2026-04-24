"use client";

import { signIn } from "next-auth/react";
import type { ReactNode } from "react";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PasswordChecklist } from "@/app/components/password-checklist";
import { PasswordInput } from "@/app/components/password-input";
import { generateStrongPassword, getPasswordChecks } from "@/lib/password";

import {
  acceptExistingInviteAction,
  checkInviteEmailAction,
  resendInviteCodeAction,
  startInviteRegistrationAction,
  verifyInviteCodeAction,
} from "./actions";

type InviteStep = "email" | "login" | "register" | "verify";

type InviteAcceptanceFormProps = {
  leagueName: string;
  token: string;
};

export function InviteAcceptanceForm({ leagueName, token }: InviteAcceptanceFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<InviteStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const passwordChecks = getPasswordChecks(password);
  const passwordsMatch =
    password.length > 0 &&
    passwordConfirmation.length > 0 &&
    password === passwordConfirmation;
  const canSubmitRegistration =
    passwordChecks.every((check) => check.isValid) && passwordsMatch;

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await checkInviteEmailAction(token, email);

      if (
        !result.ok ||
        (result.mode !== "login" &&
          result.mode !== "register" &&
          result.mode !== "verify") ||
        !result.email
      ) {
        setError(result.error ?? "Nem sikerült ellenőrizni az email címet.");
        return;
      }

      setEmail(result.email);
      setStep(result.mode);
      setMessage(result.message ?? null);
    });
  }

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await acceptExistingInviteAction(token, email, password);

      if (!result.ok || !result.redirectUrl) {
        setError(result.error ?? "Nem sikerült elfogadni a meghívót.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: result.redirectUrl,
      });

      if (!signInResult?.ok) {
        setError("A liga-tagság létrejött, de a bejelentkezés nem sikerült.");
        return;
      }

      router.push(signInResult.url ?? result.redirectUrl);
      router.refresh();
    });
  }

  function handleRegistrationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await startInviteRegistrationAction(
        token,
        email,
        password,
        passwordConfirmation,
      );

      if (!result.ok) {
        setError(result.error ?? "Nem sikerült elindítani a regisztrációt.");
        return;
      }

      setStep("verify");
      setMessage("Elküldtük a 6 számjegyű kódot. A kód 1 percig érvényes.");
    });
  }

  function handleGeneratePassword() {
    const generatedPassword = generateStrongPassword();

    setPassword(generatedPassword);
    setPasswordConfirmation(generatedPassword);
    setError(null);
    setMessage("Erős jelszót generáltunk és kitöltöttük mindkét mezőt.");
  }

  function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await verifyInviteCodeAction(token, email, code);

      if (!result.ok || !result.redirectUrl) {
        setError(result.error ?? "Nem sikerült véglegesíteni a regisztrációt.");
        return;
      }

      if (!password) {
        const loginUrl = `/login?callbackUrl=${encodeURIComponent(result.redirectUrl)}&verified=success&email=${encodeURIComponent(email)}`;

        router.push(loginUrl);
        router.refresh();
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: result.redirectUrl,
      });

      if (!signInResult?.ok) {
        router.push(result.redirectUrl);
        router.refresh();
        return;
      }

      router.push(signInResult.url ?? result.redirectUrl);
      router.refresh();
    });
  }

  function handleResendCode() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await resendInviteCodeAction(token, email);

      if (!result.ok) {
        setError(result.error ?? "Nem sikerült új kódot küldeni.");
        return;
      }

      setMessage("Új kódot küldtünk. Ez is 1 percig érvényes.");
    });
  }

  return (
    <div className="mt-8 text-left">
      {step === "email" ? (
        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          <div>
            <label className="text-sm font-semibold text-[color:var(--navy)]" htmlFor="invite-email">
              Email cím
            </label>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
              id="invite-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <SubmitButton isPending={isPending}>Tovább</SubmitButton>
        </form>
      ) : null}

      {step === "login" ? (
        <form className="space-y-5" onSubmit={handleLoginSubmit}>
          <InfoBox>
            Már van aktív fiók ehhez az email címhez. Add meg a jelszavad, és
            beléptetünk a(z) {leagueName} ligába.
          </InfoBox>
          <ReadonlyEmail email={email} onChangeEmail={() => setStep("email")} />
          <PasswordInput
            autoComplete="current-password"
            id="invite-login-password"
            label="Jelszó"
            minLength={1}
            onChange={setPassword}
            value={password}
          />
          <SubmitButton isPending={isPending}>Bejelentkezés és csatlakozás</SubmitButton>
        </form>
      ) : null}

      {step === "register" ? (
        <form className="space-y-5" onSubmit={handleRegistrationSubmit}>
          <InfoBox>
            Még nincs ligához tartozó fiók ezzel az email címmel. Hozz létre egy
            erős jelszót, majd emailben küldünk egy 6 számjegyű kódot.
          </InfoBox>
          <ReadonlyEmail email={email} onChangeEmail={() => setStep("email")} />
          <button
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
            onClick={handleGeneratePassword}
            type="button"
          >
            Jelszó generálása
          </button>
          <PasswordInput
            autoComplete="new-password"
            id="invite-password"
            label="Erős jelszó"
            minLength={12}
            onChange={setPassword}
            value={password}
          />
          <PasswordInput
            autoComplete="new-password"
            id="invite-password-confirmation"
            label="Jelszó megerősítése"
            minLength={12}
            onChange={setPasswordConfirmation}
            value={passwordConfirmation}
          />
          <PasswordChecklist
            checks={passwordChecks}
            passwordsMatch={passwordsMatch}
            showPasswordMatch={passwordConfirmation.length > 0}
          />
          <SubmitButton disabled={!canSubmitRegistration} isPending={isPending}>
            Regisztráció és kódküldés
          </SubmitButton>
        </form>
      ) : null}

      {step === "verify" ? (
        <form className="space-y-5" onSubmit={handleVerifySubmit}>
          <InfoBox>
            Írd be az emailben kapott 6 számjegyű kódot. Ha lejárt, kérhetsz
            újat.
          </InfoBox>
          <ReadonlyEmail email={email} onChangeEmail={() => setStep("email")} />
          <div>
            <label className="text-sm font-semibold text-[color:var(--navy)]" htmlFor="invite-code">
              Megerősítő kód
            </label>
            <input
              autoComplete="one-time-code"
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
              id="invite-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              pattern="\d{6}"
              placeholder="------"
              required
              type="text"
              value={code}
            />
          </div>
          <SubmitButton isPending={isPending}>Regisztráció véglegesítése</SubmitButton>
          <button
            className="w-full rounded-2xl border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={handleResendCode}
            type="button"
          >
            Új kód küldése
          </button>
        </form>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function SubmitButton({
  children,
  disabled = false,
  isPending,
}: {
  children: string;
  disabled?: boolean;
  isPending: boolean;
}) {
  return (
    <button
      className="w-full rounded-2xl bg-[color:var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:translate-y-[-1px] hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-65"
      disabled={isPending || disabled}
      type="submit"
    >
      {isPending ? "Feldolgozás..." : children}
    </button>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground)]">
      {children}
    </div>
  );
}

function ReadonlyEmail({
  email,
  onChangeEmail,
}: {
  email: string;
  onChangeEmail: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="break-all text-sm font-semibold text-[color:var(--navy)]">{email}</span>
      <button
        className="text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--green)]"
        onClick={onChangeEmail}
        type="button"
      >
        Módosítás
      </button>
    </div>
  );
}
