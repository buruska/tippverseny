"use client";

import { signIn } from "next-auth/react";
import type { ReactNode } from "react";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

const passwordLowercase = "abcdefghijkmnopqrstuvwxyz";
const passwordUppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const passwordNumbers = "23456789";
const passwordSymbols = "!@#$%^&*_-+=?";
const passwordCharacters = `${passwordLowercase}${passwordUppercase}${passwordNumbers}${passwordSymbols}`;

function getRandomCharacter(characters: string) {
  const randomValue = new Uint32Array(1);
  window.crypto.getRandomValues(randomValue);

  return characters[randomValue[0] % characters.length];
}

function shufflePassword(characters: string[]) {
  const shuffledCharacters = [...characters];

  for (let index = shuffledCharacters.length - 1; index > 0; index -= 1) {
    const randomValue = new Uint32Array(1);
    window.crypto.getRandomValues(randomValue);
    const swapIndex = randomValue[0] % (index + 1);
    const currentCharacter = shuffledCharacters[index];

    shuffledCharacters[index] = shuffledCharacters[swapIndex];
    shuffledCharacters[swapIndex] = currentCharacter;
  }

  return shuffledCharacters.join("");
}

function generateStrongPassword() {
  const requiredCharacters = [
    getRandomCharacter(passwordLowercase),
    getRandomCharacter(passwordUppercase),
    getRandomCharacter(passwordNumbers),
    getRandomCharacter(passwordSymbols),
  ];
  const extraCharacters = Array.from({ length: 12 }, () =>
    getRandomCharacter(passwordCharacters),
  );

  return shufflePassword([...requiredCharacters, ...extraCharacters]);
}

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
  const passwordChecks = [
    {
      label: "Legalább 12 karakter",
      isValid: password.length >= 12,
    },
    {
      label: "Tartalmaz kisbetűt",
      isValid: /[a-z]/.test(password),
    },
    {
      label: "Tartalmaz nagybetűt",
      isValid: /[A-Z]/.test(password),
    },
    {
      label: "Tartalmaz számot",
      isValid: /\d/.test(password),
    },
    {
      label: "Tartalmaz speciális karaktert",
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];
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
        (result.mode !== "login" && result.mode !== "register") ||
        !result.email
      ) {
        setError(result.error ?? "Nem sikerült ellenőrizni az email címet.");
        return;
      }

      setEmail(result.email);
      setStep(result.mode);
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
          <PasswordField
            autoComplete="current-password"
            id="invite-login-password"
            label="Jelszó"
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
          <PasswordField
            autoComplete="new-password"
            id="invite-password"
            label="Erős jelszó"
            onChange={setPassword}
            value={password}
          />
          <PasswordField
            autoComplete="new-password"
            id="invite-password-confirmation"
            label="Jelszó megerősítése"
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
              placeholder="000000"
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

function PasswordChecklist({
  checks,
  passwordsMatch,
  showPasswordMatch,
}: {
  checks: Array<{
    isValid: boolean;
    label: string;
  }>;
  passwordsMatch: boolean;
  showPasswordMatch: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted,#5B6B7F)]">
        Jelszó követelmények
      </p>
      <div className="mt-3 grid gap-2 text-sm">
        {checks.map((check) => (
          <PasswordChecklistItem
            isValid={check.isValid}
            key={check.label}
            label={check.label}
          />
        ))}
        <PasswordChecklistItem
          isValid={passwordsMatch}
          label="A jelszó és a megerősítés megegyezik"
          muted={!showPasswordMatch}
        />
      </div>
    </div>
  );
}

function PasswordChecklistItem({
  isValid,
  label,
  muted = false,
}: {
  isValid: boolean;
  label: string;
  muted?: boolean;
}) {
  const colorClass = muted
    ? "text-[color:var(--muted,#5B6B7F)]"
    : isValid
      ? "text-emerald-700"
      : "text-red-700";

  return (
    <div className={`flex items-center gap-2 font-medium ${colorClass}`}>
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 place-items-center rounded-full text-xs font-bold ${
          muted
            ? "bg-white text-[color:var(--muted,#5B6B7F)]"
            : isValid
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
        }`}
      >
        {isValid ? "✓" : "!"}
      </span>
      <span>{label}</span>
    </div>
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

function PasswordField({
  autoComplete,
  id,
  label,
  onChange,
  value,
}: {
  autoComplete: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div>
      <label className="text-sm font-semibold text-[color:var(--navy)]" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-2">
        <input
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 pr-14 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
          id={id}
          minLength={12}
          onChange={(event) => onChange(event.target.value)}
          required
          type={isPasswordVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={isPasswordVisible ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
          className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--muted,#5B6B7F)] transition hover:bg-[color:var(--card-muted)] hover:text-[color:var(--navy)]"
          onClick={() => setIsPasswordVisible((current) => !current)}
          type="button"
        >
          <PasswordVisibilityIcon isPasswordVisible={isPasswordVisible} />
        </button>
      </div>
    </div>
  );
}

function PasswordVisibilityIcon({
  isPasswordVisible,
}: {
  isPasswordVisible: boolean;
}) {
  if (isPasswordVisible) {
    return (
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
    );
  }

  return (
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
  );
}
