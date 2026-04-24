import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InactivityCountdown } from "@/app/components/inactivity-countdown";

import { LeagueManager } from "./league-manager";
import { SignOutButton } from "../dashboard/sign-out-button";

export default async function AdminPage() {
  const user = await requireSuperAdmin();
  const leagues = await prisma.league.findMany({
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
  });

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

        <LeagueManager canManageLeagues leagues={leagueItems} />
      </section>
    </main>
  );
}
