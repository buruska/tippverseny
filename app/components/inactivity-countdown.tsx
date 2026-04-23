"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const TIMEOUT_SECONDS = 5 * 60;
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "mousedown",
  "scroll",
  "touchstart",
] as const;

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function InactivityCountdown() {
  const [remainingSeconds, setRemainingSeconds] = useState(TIMEOUT_SECONDS);
  const deadlineRef = useRef(0);
  const hasSignedOutRef = useRef(false);
  const isWarning = remainingSeconds <= 10;

  useEffect(() => {
    function resetTimer() {
      if (hasSignedOutRef.current) {
        return;
      }

      deadlineRef.current = Date.now() + TIMEOUT_SECONDS * 1000;
      setRemainingSeconds(TIMEOUT_SECONDS);
    }

    function tick() {
      const secondsLeft = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );

      setRemainingSeconds(secondsLeft);

      if (secondsLeft === 0 && !hasSignedOutRef.current) {
        hasSignedOutRef.current = true;
        void signOut({ callbackUrl: "/login?error=session-timeout" });
      }
    }

    const intervalId = window.setInterval(tick, 1000);
    resetTimer();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    return () => {
      window.clearInterval(intervalId);

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-base font-bold tabular-nums transition-colors ${
          isWarning ? "text-red-600" : "text-[color:var(--navy)]"
        }`}
      >
        {formatRemainingTime(remainingSeconds)}
      </span>
      <span className="text-xs font-semibold text-[color:var(--muted,#5B6B7F)]">
        inaktivitás után
      </span>
    </div>
  );
}
