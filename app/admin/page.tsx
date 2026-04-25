import { InactivityCountdown } from "@/app/components/inactivity-countdown";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHungarianTeamName } from "@/lib/world-cup-team-names";

import { SignOutButton } from "../dashboard/sign-out-button";
import { LeagueManager } from "./league-manager";

export default async function AdminPage() {
  const user = await requireSuperAdmin();
  const [leagues, matches] = await Promise.all([
    prisma.league.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        memberships: {
          orderBy: {
            joinedAt: "asc",
          },
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        scoreEntries: {
          select: {
            userId: true,
            points: true,
          },
        },
        predictions: {
          orderBy: {
            match: {
              kickoffAt: "asc",
            },
          },
          select: {
            userId: true,
            homeScore: true,
            awayScore: true,
            submittedAt: true,
            match: {
              select: {
                id: true,
                kickoffAt: true,
                stage: true,
                homeTeam: {
                  select: {
                    name: true,
                    shortName: true,
                  },
                },
                awayTeam: {
                  select: {
                    name: true,
                    shortName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    }),
    prisma.match.findMany({
      orderBy: [{ kickoffAt: "asc" }, { createdAt: "desc" }],
      select: {
        externalId: true,
        id: true,
        stage: true,
        status: true,
        kickoffAt: true,
        liveMinute: true,
        homeScore: true,
        awayScore: true,
        homeTeam: {
          select: {
            name: true,
          },
        },
        awayTeam: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const leagueItems = leagues.map((league) => ({
    id: league.id,
    name: league.name,
    memberCount: league._count.memberships,
    participants: league.memberships
      .map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        points: league.scoreEntries
          .filter((scoreEntry) => scoreEntry.userId === membership.user.id)
          .reduce((total, scoreEntry) => total + scoreEntry.points, 0),
        predictions: league.predictions
          .filter((prediction) => prediction.userId === membership.user.id)
          .map((prediction) => ({
            id: prediction.match.id,
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            submittedAt: prediction.submittedAt,
            kickoffAt: prediction.match.kickoffAt,
            stage: prediction.match.stage,
            homeTeamName:
              prediction.match.homeTeam?.shortName ?? prediction.match.homeTeam?.name ?? null,
            awayTeamName:
              prediction.match.awayTeam?.shortName ?? prediction.match.awayTeam?.name ?? null,
          })),
      }))
      .sort((left, right) => {
        if (right.points !== left.points) {
          return right.points - left.points;
        }

        return (left.name ?? left.email).localeCompare(right.name ?? right.email, "hu");
      }),
  }));

  const matchItems = matches.map((match) => ({
    isManual: !match.externalId,
    id: match.id,
    stage: match.stage,
    status: match.status,
    kickoffAt: match.kickoffAt,
    liveMinute: match.liveMinute,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTeamName: match.homeTeam?.name ? getHungarianTeamName(match.homeTeam.name) : "Hazai csapat",
    awayTeamName: match.awayTeam?.name ? getHungarianTeamName(match.awayTeam.name) : "Vendég csapat",
  }));

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-[color:var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(11,31,58,0.10)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
              Admin felület
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[color:var(--navy)]">
              Szia, {user.name ?? user.email}!
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <InactivityCountdown />
            <SignOutButton />
          </div>
        </div>

        <LeagueManager canManageLeagues leagues={leagueItems} matches={matchItems} />
      </section>
    </main>
  );
}
