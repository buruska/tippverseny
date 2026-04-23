export function PasswordChecklist({
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
