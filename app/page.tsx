import Image from "next/image";
import Link from "next/link";

import { BrowserDateTime } from "@/app/components/browser-date-time";
import { InactivityCountdown } from "@/app/components/inactivity-countdown";
import { MatchPredictionControls } from "@/app/components/match-prediction-controls";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { getSession } from "@/lib/auth";
import { getKnockoutPlaceholderLabels } from "@/lib/world-cup-knockout.mjs";
import { prisma } from "@/lib/prisma";
import { getHungarianTeamName, getTeamFlagUrl } from "@/lib/world-cup-team-names";

export default async function HomePage() {
  const session = await getSession();
  const [matches, memberships, predictions] = await Promise.all([
    prisma.match.findMany({
      orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    }),
    session?.user
      ? prisma.leagueMembership.findMany({
          where: {
            userId: session.user.id,
          },
          orderBy: {
            joinedAt: "asc",
          },
          select: {
            leagueId: true,
            league: {
              select: {
                name: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    session?.user
      ? prisma.prediction.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            leagueId: true,
            matchId: true,
            homeScore: true,
            awayScore: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const predictionsByMatch = new Map<
    string,
    Map<string, { homeScore: number; awayScore: number }>
  >();

  for (const prediction of predictions) {
    const matchPredictions =
      predictionsByMatch.get(prediction.matchId) ??
      new Map<string, { homeScore: number; awayScore: number }>();

    matchPredictions.set(prediction.leagueId, {
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
    });
    predictionsByMatch.set(prediction.matchId, matchPredictions);
  }

  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
            2026-os Menetrend
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[color:var(--navy)] md:text-6xl">
            VB Tippverseny 2026
          </h1>
        </div>

        {session?.user ? (
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
              <InactivityCountdown />
              <SignOutButton />
            </div>
            <p className="text-sm font-semibold text-[color:var(--navy)]">
              Szia, {session.user.name ?? session.user.email}!
            </p>
          </div>
        ) : (
          <Link
            className="rounded-2xl bg-[color:var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] !text-white shadow-[0_12px_32px_rgba(11,31,58,0.16)] transition hover:translate-y-[-1px] hover:bg-[#16375f] hover:!text-white"
            href="/login"
          >
            Bejelentkezés
          </Link>
        )}
      </div>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[28px] border border-[color:var(--border)] bg-white/88 px-5 py-4 shadow-[0_18px_46px_rgba(11,31,58,0.08)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <p className="text-[color:var(--navy)]">
              <span className="text-xl font-black md:text-2xl">{matches.length}</span>{" "}
              <span className="text-sm font-medium text-[color:var(--foreground)]/72 md:text-base">
                meccs van hátra
              </span>
            </p>
          </div>
          <p className="max-w-xl text-right text-sm text-[color:var(--foreground)]/70">
            A meccsek kezdete a böngésző időzónájában van megjelenítve.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-[color:var(--border)] bg-white/75 px-8 py-16 text-center shadow-[0_18px_46px_rgba(11,31,58,0.08)]">
            <h2 className="text-2xl font-bold text-[color:var(--navy)]">Még nincs importált VB-meccs</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]/72">
              Futtasd a <code className="rounded bg-[color:var(--card-muted)] px-2 py-1">npm run matches:import</code>{" "}
              parancsot, és a főoldal automatikusan feltöltődik az importált menetrenddel.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-white/92 shadow-[0_18px_46px_rgba(11,31,58,0.08)]">
            {matches.map((match) => {
              const placeholderLabels = getKnockoutPlaceholderLabels(match.externalId);
              const homeTeamName =
                match.homeTeam?.name
                  ? getHungarianTeamName(match.homeTeam.name)
                  : (placeholderLabels?.home ?? "Ismeretlen csapat");
              const awayTeamName =
                match.awayTeam?.name
                  ? getHungarianTeamName(match.awayTeam.name)
                  : (placeholderLabels?.away ?? "Ismeretlen csapat");
              const matchPredictions = predictionsByMatch.get(match.id);
              const leaguePredictionOptions = memberships.map((membership) => ({
                leagueId: membership.leagueId,
                leagueName: membership.league.name,
                prediction: matchPredictions?.get(membership.leagueId) ?? null,
              }));
              return (
                <article
                  key={match.id}
                  className="border-b border-[color:var(--border)] px-4 py-4 last:border-b-0 md:px-6"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[color:var(--navy)] md:text-base">
                      <TeamFlag
                        flagUrl={match.homeTeam?.name ? getTeamFlagUrl(match.homeTeam.name) : null}
                        teamName={homeTeamName}
                      />
                      <span>{homeTeamName}</span>
                      <span className="px-1 text-[color:var(--foreground)]/55">-</span>
                      <TeamFlag
                        flagUrl={match.awayTeam?.name ? getTeamFlagUrl(match.awayTeam.name) : null}
                        teamName={awayTeamName}
                      />
                      <span>{awayTeamName}</span>
                    </div>

                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                        {session?.user ? (
                          <MatchPredictionControls
                            awayTeamName={awayTeamName}
                            homeTeamName={homeTeamName}
                            initiallyLocked={match.lockAt <= new Date()}
                            leagues={leaguePredictionOptions}
                            lockAtIso={match.lockAt.toISOString()}
                            matchId={match.id}
                          />
                        ) : null}

                        <div className="text-sm font-semibold text-[color:var(--foreground)]/75 lg:text-right">
                          <BrowserDateTime
                            iso={match.kickoffAt.toISOString()}
                            locale="hu-HU"
                            options={{
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }}
                            utcFallbackOptions={{
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }}
                          />
                          {match.groupName ? (
                            <span className="ml-2 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--green)]">
                              Csoport {match.groupName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

type TeamFlagProps = {
  flagUrl: string | null | undefined;
  teamName: string;
};

function TeamFlag({ flagUrl, teamName }: TeamFlagProps) {
  if (!flagUrl) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--card-muted)] text-[10px] font-black text-[color:var(--navy)]">
        ?
      </span>
    );
  }

  return (
    <Image
      alt={`${teamName} zászlója`}
      className="h-6 w-6 rounded-full border border-[color:var(--border)] bg-white object-contain p-0.5"
      height={24}
      loading="lazy"
      src={flagUrl}
      width={24}
    />
  );
}
