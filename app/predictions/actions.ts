"use server";

import { z } from "zod";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const predictionSchema = z.object({
  matchId: z.string().trim().min(1, "Hiányzó meccsazonosító."),
  leagueId: z.string().trim().min(1, "Hiányzó ligaazonosító."),
  homeScore: z.coerce
    .number()
    .int("A hazai gól csak egész szám lehet.")
    .min(0, "A hazai gól nem lehet negatív.")
    .max(99, "A hazai gól túl nagy."),
  awayScore: z.coerce
    .number()
    .int("A vendég gól csak egész szám lehet.")
    .min(0, "A vendég gól nem lehet negatív.")
    .max(99, "A vendég gól túl nagy."),
});

function getPredictionLockAt(kickoffAt: Date) {
  return new Date(kickoffAt.getTime() - 15 * 60 * 1000);
}

export async function upsertPredictionAction(input: {
  matchId: string;
  leagueId: string;
  homeScore: number;
  awayScore: number;
}) {
  const session = await getSession();

  if (!session?.user) {
    return {
      ok: false,
      error: "A tippeléshez be kell jelentkezned.",
    };
  }

  const parsed = predictionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Érvénytelen tipp.",
    };
  }

  const membership = await prisma.leagueMembership.findUnique({
    where: {
      userId_leagueId: {
        userId: session.user.id,
        leagueId: parsed.data.leagueId,
      },
    },
    select: {
      leagueId: true,
      league: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!membership) {
    return {
      ok: false,
      error: "Ehhez a ligához nem adhatsz le tippet.",
    };
  }

  const match = await prisma.match.findUnique({
    where: {
      id: parsed.data.matchId,
    },
    select: {
      id: true,
      kickoffAt: true,
      lockAt: true,
    },
  });

  if (!match) {
    return {
      ok: false,
      error: "A kiválasztott meccs nem található.",
    };
  }

  const effectiveLockAt = match.lockAt ?? getPredictionLockAt(match.kickoffAt);

  if (effectiveLockAt <= new Date()) {
    return {
      ok: false,
      error: "A tippelés ennél a meccsnél már lezárult.",
    };
  }

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_leagueId_matchId: {
        userId: session.user.id,
        leagueId: parsed.data.leagueId,
        matchId: parsed.data.matchId,
      },
    },
    create: {
      userId: session.user.id,
      leagueId: parsed.data.leagueId,
      matchId: parsed.data.matchId,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    },
    update: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      submittedAt: new Date(),
    },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      leagueId: true,
      submittedAt: true,
    },
  });

  return {
    ok: true,
    error: null,
    prediction: {
      ...prediction,
      leagueName: membership.league.name,
    },
  };
}
