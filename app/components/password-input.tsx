"use client";

import { useState } from "react";

export function PasswordInput({
  autoComplete,
  id,
  label,
  minLength = 1,
  onChange,
  required = true,
  value,
}: {
  autoComplete: string;
  id: string;
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  required?: boolean;
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
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          required={required}
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
