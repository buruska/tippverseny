"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import { upsertPredictionAction } from "@/app/predictions/actions";

type LeaguePrediction = {
  leagueId: string;
  leagueName: string;
  prediction: {
    homeScore: number;
    awayScore: number;
  } | null;
};

type MatchPredictionControlsProps = {
  awayTeamName: string;
  homeTeamName: string;
  isLocked: boolean;
  leagues: LeaguePrediction[];
  matchId: string;
};

type DraftScores = Record<
  string,
  {
    homeScore: string;
    awayScore: string;
  }
>;

export function MatchPredictionControls({
  awayTeamName,
  homeTeamName,
  isLocked,
  leagues,
  matchId,
}: MatchPredictionControlsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [leaguePredictions, setLeaguePredictions] = useState(leagues);
  const [draftScores, setDraftScores] = useState<DraftScores>(() =>
    Object.fromEntries(
      leagues.map((league) => [
        league.leagueId,
        {
          homeScore: league.prediction ? String(league.prediction.homeScore) : "",
          awayScore: league.prediction ? String(league.prediction.awayScore) : "",
        },
      ]),
    ),
  );

  const summary = useMemo(
    () =>
      leaguePredictions
        .filter((league) => league.prediction)
        .map(
          (league) =>
            `${league.leagueName}: ${league.prediction?.homeScore}-${league.prediction?.awayScore}`,
        ),
    [leaguePredictions],
  );

  function updateDraft(leagueId: string, side: "homeScore" | "awayScore", value: string) {
    const normalizedValue = value.replace(/\D/g, "").slice(0, 2);

    setDraftScores((currentDraftScores) => ({
      ...currentDraftScores,
      [leagueId]: {
        ...currentDraftScores[leagueId],
        [side]: normalizedValue,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, leagueId: string) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const draft = draftScores[leagueId];

    if (!draft || draft.homeScore === "" || draft.awayScore === "") {
      setError("Mindkét gólmezőt ki kell tölteni.");
      return;
    }

    startTransition(async () => {
      const result = await upsertPredictionAction({
        matchId,
        leagueId,
        homeScore: Number(draft.homeScore),
        awayScore: Number(draft.awayScore),
      });

      if (!result.ok || !result.prediction) {
        setError(result.error ?? "Nem sikerült elmenteni a tippet.");
        return;
      }

      setLeaguePredictions((currentLeagues) =>
        currentLeagues.map((league) =>
          league.leagueId === leagueId
            ? {
                ...league,
                prediction: {
                  homeScore: result.prediction.homeScore,
                  awayScore: result.prediction.awayScore,
                },
              }
            : league,
        ),
      );
      setMessage("A tipp sikeresen elmentve.");
      setIsModalOpen(false);
    });
  }

  if (leagues.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2 lg:items-end">
        {isLocked ? (
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--foreground)]/65">
            Tippelés lezárva
          </span>
        ) : (
          <button
            className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
            onClick={() => {
              setError(null);
              setMessage(null);
              setIsModalOpen(true);
            }}
            type="button"
          >
            {summary.length > 0 ? "Módosítás" : "Tippelés"}
          </button>
        )}

        {summary.length > 0 ? (
          <p className="text-xs font-medium text-[color:var(--foreground)]/72">
            Tippjeid: {summary.join(" | ")}
          </p>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--green)]">
                  Tippelés
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                  {homeTeamName} - {awayTeamName}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
                  Ligánként egy tippet adhatsz le. A tippelés a kezdés előtt 15 perccel lezárul.
                </p>
              </div>
              <button
                aria-label="Modal bezárása"
                className="rounded-full px-3 py-2 text-xl leading-none text-[color:var(--muted,#5B6B7F)] hover:bg-[color:var(--card-muted)]"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {leaguePredictions.map((league) => (
                <form
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-4"
                  key={league.leagueId}
                  onSubmit={(event) => handleSubmit(event, league.leagueId)}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="text-base font-bold text-[color:var(--navy)]">
                        {league.leagueName}
                      </h4>
                      <p className="mt-1 text-sm text-[color:var(--muted,#5B6B7F)]">
                        {league.prediction
                          ? `Jelenlegi tipped: ${league.prediction.homeScore}-${league.prediction.awayScore}`
                          : "Ehhez a ligához még nincs tipped."}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3">
                        <ScoreInput
                          label={homeTeamName}
                          onChange={(value) => updateDraft(league.leagueId, "homeScore", value)}
                          value={draftScores[league.leagueId]?.homeScore ?? ""}
                        />
                        <span className="mt-6 text-sm font-bold text-[color:var(--navy)]">-</span>
                        <ScoreInput
                          label={awayTeamName}
                          onChange={(value) => updateDraft(league.leagueId, "awayScore", value)}
                          value={draftScores[league.leagueId]?.awayScore ?? ""}
                        />
                      </div>
                      <button
                        className="rounded-full bg-[color:var(--navy)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                        type="submit"
                      >
                        {isPending ? "Mentés..." : "Mentés"}
                      </button>
                    </div>
                  </div>
                </form>
              ))}
            </div>

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
        </div>
      ) : null}
    </>
  );
}

function ScoreInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-[color:var(--muted,#5B6B7F)]">{label}</span>
      <input
        className="w-16 rounded-2xl border border-[color:var(--border)] bg-white px-3 py-2 text-center text-lg font-bold text-[color:var(--navy)] outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
        inputMode="numeric"
        maxLength={2}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        type="text"
        value={value}
      />
    </label>
  );
}
