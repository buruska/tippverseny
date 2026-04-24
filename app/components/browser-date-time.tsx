"use client";

import { useSyncExternalStore } from "react";

type BrowserDateTimeProps = {
  iso: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  utcFallbackOptions?: Intl.DateTimeFormatOptions;
};

function subscribe() {
  return () => undefined;
}

function formatDateTime(
  iso: string,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(iso));
}

export function BrowserDateTime({
  iso,
  locale,
  options,
  utcFallbackOptions,
}: BrowserDateTimeProps) {
  const browserFormatted = useSyncExternalStore(
    subscribe,
    () =>
      formatDateTime(iso, locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      }),
    () => "",
  );

  const fallbackFormatted = formatDateTime(iso, locale ?? "hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    ...utcFallbackOptions,
  });

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {browserFormatted || `${fallbackFormatted} UTC`}
    </time>
  );
}
