"use server";

import crypto from "node:crypto";

import {
  InvitationStatus,
  MatchStage,
  MatchStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createLeagueSlugCandidate(baseSlug: string, attempt: number) {
  if (attempt === 0) {
    return baseSlug;
  }

  return `${baseSlug}-${attempt + 1}`;
}

async function createLeagueWithUniqueSlug(name: string, createdById: string) {
  const baseSlug = slugify(name) || "liga";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = createLeagueSlugCandidate(baseSlug, attempt);

    try {
      await prisma.league.create({
        data: {
          name,
          slug,
          createdById,
        },
      });

      return;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("slug")
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Nem sikerült egyedi liga-azonosítót létrehozni.");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createInviteUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

function getPredictionLockAt(kickoffAt: Date) {
  return new Date(kickoffAt.getTime() - 15 * 60 * 1000);
}

async function findOrCreateTeamByName(name: string) {
  const normalizedName = name.trim();
  const existingTeam = await prisma.team.findFirst({
    where: {
      name: normalizedName,
    },
    select: {
      id: true,
    },
  });

  if (existingTeam) {
    return existingTeam;
  }

  return prisma.team.create({
    data: {
      name: normalizedName,
      shortName: normalizedName,
    },
    select: {
      id: true,
    },
  });
}

const createMatchSchema = z.object({
  awayTeamName: z.string().trim().min(2, "A vendég csapat neve legalább 2 karakter legyen."),
  homeTeamName: z.string().trim().min(2, "A hazai csapat neve legalább 2 karakter legyen."),
  kickoffAtIso: z.string().trim().min(1, "Add meg a kezdési időpontot."),
  stage: z.nativeEnum(MatchStage),
});

const updateMatchStateSchema = z.object({
  awayScore: z.number().int().min(0).max(99).nullable(),
  homeScore: z.number().int().min(0).max(99).nullable(),
  liveMinute: z.number().int().min(1).max(130).nullable(),
  matchId: z.string().trim().min(1, "Hiányzó meccsazonosító."),
  status: z.nativeEnum(MatchStatus),
});

export async function createLeagueAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 3) {
    return {
      ok: false,
      error: "A liga neve legalább 3 karakter hosszú legyen.",
    };
  }

  try {
    await createLeagueWithUniqueSlug(name, user.id);
  } catch {
    return {
      ok: false,
      error: "Nem sikerült létrehozni a ligát. Próbáld újra.",
    };
  }

  revalidatePath("/admin");

  return {
    ok: true,
    error: null,
  };
}

export async function createMatchAction(input: {
  awayTeamName: string;
  homeTeamName: string;
  kickoffAtIso: string;
  stage?: MatchStage;
}) {
  await requireSuperAdmin();

  const parsed = createMatchSchema.safeParse({
    ...input,
    stage: input.stage ?? MatchStage.GROUP,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nem sikerült létrehozni a meccset.",
    };
  }

  const kickoffAt = new Date(parsed.data.kickoffAtIso);

  if (Number.isNaN(kickoffAt.getTime())) {
    return {
      ok: false,
      error: "Érvénytelen kezdési időpont.",
    };
  }

  const [homeTeam, awayTeam] = await Promise.all([
    findOrCreateTeamByName(parsed.data.homeTeamName),
    findOrCreateTeamByName(parsed.data.awayTeamName),
  ]);

  await prisma.match.create({
    data: {
      stage: parsed.data.stage,
      status: MatchStatus.SCHEDULED,
      kickoffAt,
      lockAt: getPredictionLockAt(kickoffAt),
      liveMinute: null,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: null,
      awayScore: null,
      finalHomeScore: null,
      finalAwayScore: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    error: null,
  };
}

export async function updateMatchLiveStateAction(input: {
  awayScore: number | null;
  homeScore: number | null;
  liveMinute: number | null;
  matchId: string;
  status: MatchStatus;
}) {
  await requireSuperAdmin();

  const parsed = updateMatchStateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nem sikerült frissíteni a meccset.",
    };
  }

  if (parsed.data.status === MatchStatus.LIVE && parsed.data.liveMinute === null) {
    return {
      ok: false,
      error: "Élő meccsnél meg kell adni a percet.",
    };
  }

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: {
      externalId: true,
      id: true,
    },
  });

  if (!match) {
    return {
      ok: false,
      error: "A meccs nem található.",
    };
  }

  if (match.externalId) {
    return {
      ok: false,
      error: "Az importált meccsek nem módosíthatók ezen a teszt felületen.",
    };
  }

  await prisma.match.update({
    where: {
      id: parsed.data.matchId,
    },
    data: {
      status: parsed.data.status,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      liveMinute: parsed.data.status === MatchStatus.LIVE ? parsed.data.liveMinute : null,
      finalHomeScore:
        parsed.data.status === MatchStatus.FINISHED ? parsed.data.homeScore : null,
      finalAwayScore:
        parsed.data.status === MatchStatus.FINISHED ? parsed.data.awayScore : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    error: null,
  };
}

export async function deleteLeagueAction(leagueId: string) {
  await requireSuperAdmin();

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return {
      ok: false,
      error: "A liga nem található.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const affectedUsers = await tx.user.findMany({
      where: {
        role: {
          not: UserRole.SUPERADMIN,
        },
        memberships: {
          some: {
            leagueId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    await tx.league.delete({
      where: { id: leagueId },
    });

    if (affectedUsers.length > 0) {
      await tx.user.deleteMany({
        where: {
          id: {
            in: affectedUsers.map((user) => user.id),
          },
          memberships: {
            none: {},
          },
        },
      });
    }
  });

  revalidatePath("/admin");

  return {
    ok: true,
    error: null,
  };
}

export async function createLeagueInviteLinkAction(leagueId: string) {
  const user = await requireSuperAdmin();

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return {
      ok: false,
      error: "A liga nem található.",
      inviteUrl: null,
    };
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      leagueId,
      email: null,
      status: InvitationStatus.PENDING,
    },
    select: {
      token: true,
    },
  });

  if (existingInvitation) {
    return {
      ok: true,
      error: null,
      inviteUrl: createInviteUrl(existingInvitation.token),
    };
  }

  const invitation = await prisma.invitation.create({
    data: {
      leagueId,
      email: null,
      token: createToken(),
      status: InvitationStatus.PENDING,
      invitedById: user.id,
    },
    select: {
      token: true,
    },
  });

  return {
    ok: true,
    error: null,
    inviteUrl: createInviteUrl(invitation.token),
  };
}
