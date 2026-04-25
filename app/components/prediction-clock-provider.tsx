"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

const PredictionClockContext = createContext<number | null>(null);

export function PredictionClockProvider({ children }: { children: ReactNode }) {
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <PredictionClockContext.Provider value={currentTimestamp}>
      {children}
    </PredictionClockContext.Provider>
  );
}

export function usePredictionClock() {
  const currentTimestamp = useContext(PredictionClockContext);

  if (currentTimestamp === null) {
    throw new Error("usePredictionClock must be used within PredictionClockProvider.");
  }

  return currentTimestamp;
}
