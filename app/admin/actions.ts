"use server";

import crypto from "node:crypto";

import { InvitationStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

  await prisma.league.delete({
    where: { id: leagueId },
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
