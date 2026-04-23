"use server";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { InvitationStatus, LeagueRole, UserRole } from "@prisma/client";
import { z } from "zod";

import { sendVerificationCodeEmail } from "@/lib/email";
import { passwordSchema } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().trim().toLowerCase().email("Érvénytelen email cím.");
const codeSchema = z.string().trim().regex(/^\d{6}$/, "A kód pontosan 6 számjegy legyen.");

type InviteMode = "login" | "register";

function createVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashVerificationCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET ?? "development-secret";

  return crypto.createHash("sha256").update(`${email}:${code}:${secret}`).digest("hex");
}

async function getPendingInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      leagueId: true,
      status: true,
      league: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!invitation) {
    return {
      invitation: null,
      error: "A meghívó nem található.",
    };
  }

  if (
    invitation.status !== InvitationStatus.PENDING ||
    (invitation.expiresAt && invitation.expiresAt <= new Date())
  ) {
    return {
      invitation: null,
      error: "Ez a meghívó már nem érvényes.",
    };
  }

  return {
    invitation,
    error: null,
  };
}

async function sendCodeForInvitation(input: {
  email: string;
  invitationId: string;
  leagueId: string;
  leagueName: string;
  userId: string;
}) {
  const code = createVerificationCode();
  const now = new Date();

  await prisma.emailVerificationCode.updateMany({
    where: {
      email: input.email,
      leagueId: input.leagueId,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  });

  await prisma.emailVerificationCode.create({
    data: {
      email: input.email,
      codeHash: hashVerificationCode(input.email, code),
      userId: input.userId,
      leagueId: input.leagueId,
      invitationId: input.invitationId,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  await sendVerificationCodeEmail({
    code,
    email: input.email,
    leagueName: input.leagueName,
  });
}

async function addUserToLeague(userId: string, leagueId: string) {
  await prisma.leagueMembership.upsert({
    where: {
      userId_leagueId: {
        userId,
        leagueId,
      },
    },
    create: {
      userId,
      leagueId,
      role: LeagueRole.MEMBER,
    },
    update: {},
  });
}

function getSuccessfulInviteRedirectUrl() {
  return "/";
}

export async function checkInviteEmailAction(token: string, emailValue: string) {
  const parsedEmail = emailSchema.safeParse(emailValue);

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: parsedEmail.error.issues[0]?.message ?? "Érvénytelen email cím.",
      mode: null as InviteMode | null,
      email: null,
    };
  }

  const { invitation, error } = await getPendingInvitation(token);

  if (!invitation) {
    return {
      ok: false,
      error,
      mode: null,
      email: null,
    };
  }

  const email = parsedEmail.data;

  if (invitation.email && invitation.email !== email) {
    return {
      ok: false,
      error: "Ez a meghívó másik email címhez tartozik.",
      mode: null,
      email: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      memberships: {
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  const hasExistingAccount =
    Boolean(user?.passwordHash) &&
    (user?.role === UserRole.SUPERADMIN || (user?.memberships.length ?? 0) > 0);

  return {
    ok: true,
    error: null,
    mode: hasExistingAccount ? "login" : "register",
    email,
  };
}

export async function acceptExistingInviteAction(
  token: string,
  emailValue: string,
  passwordValue: string,
) {
  const parsedEmail = emailSchema.safeParse(emailValue);

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: parsedEmail.error.issues[0]?.message ?? "Érvénytelen email cím.",
      redirectUrl: null,
    };
  }

  const { invitation, error } = await getPendingInvitation(token);

  if (!invitation) {
    return {
      ok: false,
      error,
      redirectUrl: null,
    };
  }

  const email = parsedEmail.data;

  if (invitation.email && invitation.email !== email) {
    return {
      ok: false,
      error: "Ez a meghívó másik email címhez tartozik.",
      redirectUrl: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return {
      ok: false,
      error: "Ehhez az email címhez még nincs aktív fiók. Kérj új kódot a regisztrációhoz.",
      redirectUrl: null,
    };
  }

  const isValidPassword = await bcrypt.compare(passwordValue, user.passwordHash);

  if (!isValidPassword) {
    return {
      ok: false,
      error: "Hibás jelszó.",
      redirectUrl: null,
    };
  }

  await addUserToLeague(user.id, invitation.leagueId);

  return {
    ok: true,
    error: null,
    redirectUrl: getSuccessfulInviteRedirectUrl(),
  };
}

export async function startInviteRegistrationAction(
  token: string,
  emailValue: string,
  passwordValue: string,
  passwordConfirmationValue: string,
) {
  const parsedEmail = emailSchema.safeParse(emailValue);

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: parsedEmail.error.issues[0]?.message ?? "Érvénytelen email cím.",
    };
  }

  const parsedPassword = passwordSchema.safeParse(passwordValue);

  if (!parsedPassword.success) {
    return {
      ok: false,
      error: parsedPassword.error.issues[0]?.message ?? "Nem elég erős a jelszó.",
    };
  }

  if (passwordValue !== passwordConfirmationValue) {
    return {
      ok: false,
      error: "A két jelszó nem egyezik.",
    };
  }

  const { invitation, error } = await getPendingInvitation(token);

  if (!invitation) {
    return {
      ok: false,
      error,
    };
  }

  const email = parsedEmail.data;

  if (invitation.email && invitation.email !== email) {
    return {
      ok: false,
      error: "Ez a meghívó másik email címhez tartozik.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      memberships: {
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  if (
    existingUser?.passwordHash &&
    (existingUser.role === UserRole.SUPERADMIN || existingUser.memberships.length > 0)
  ) {
    return {
      ok: false,
      error: "Ehhez az email címhez már van fiók. Jelentkezz be a jelszavaddal.",
    };
  }

  const passwordHash = await bcrypt.hash(parsedPassword.data, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
    },
    update: {
      passwordHash,
    },
    select: {
      id: true,
    },
  });

  try {
    await sendCodeForInvitation({
      email,
      invitationId: invitation.id,
      leagueId: invitation.leagueId,
      leagueName: invitation.league.name,
      userId: user.id,
    });
  } catch {
    return {
      ok: false,
      error: "Nem sikerült elküldeni a megerősítő kódot. Próbáld újra később.",
    };
  }

  return {
    ok: true,
    error: null,
  };
}

export async function resendInviteCodeAction(token: string, emailValue: string) {
  const parsedEmail = emailSchema.safeParse(emailValue);

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: parsedEmail.error.issues[0]?.message ?? "Érvénytelen email cím.",
    };
  }

  const { invitation, error } = await getPendingInvitation(token);

  if (!invitation) {
    return {
      ok: false,
      error,
    };
  }

  const email = parsedEmail.data;

  if (invitation.email && invitation.email !== email) {
    return {
      ok: false,
      error: "Ez a meghívó másik email címhez tartozik.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      error: "Először add meg a regisztrációs adatokat.",
    };
  }

  try {
    await sendCodeForInvitation({
      email,
      invitationId: invitation.id,
      leagueId: invitation.leagueId,
      leagueName: invitation.league.name,
      userId: user.id,
    });
  } catch {
    return {
      ok: false,
      error: "Nem sikerült új kódot küldeni. Próbáld újra később.",
    };
  }

  return {
    ok: true,
    error: null,
  };
}

export async function verifyInviteCodeAction(
  token: string,
  emailValue: string,
  codeValue: string,
) {
  const parsedEmail = emailSchema.safeParse(emailValue);
  const parsedCode = codeSchema.safeParse(codeValue);

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: parsedEmail.error.issues[0]?.message ?? "Érvénytelen email cím.",
      redirectUrl: null,
    };
  }

  if (!parsedCode.success) {
    return {
      ok: false,
      error: parsedCode.error.issues[0]?.message ?? "Érvénytelen kód.",
      redirectUrl: null,
    };
  }

  const { invitation, error } = await getPendingInvitation(token);

  if (!invitation) {
    return {
      ok: false,
      error,
      redirectUrl: null,
    };
  }

  const email = parsedEmail.data;

  if (invitation.email && invitation.email !== email) {
    return {
      ok: false,
      error: "Ez a meghívó másik email címhez tartozik.",
      redirectUrl: null,
    };
  }

  const codeHash = hashVerificationCode(email, parsedCode.data);
  const verificationCode = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
      codeHash,
      invitationId: invitation.id,
      leagueId: invitation.leagueId,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!verificationCode) {
    return {
      ok: false,
      error: "A kód hibás vagy lejárt. Kérj új kódot.",
      redirectUrl: null,
    };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: verificationCode.userId },
      data: { emailVerifiedAt: now },
    }),
    prisma.leagueMembership.upsert({
      where: {
        userId_leagueId: {
          userId: verificationCode.userId,
          leagueId: invitation.leagueId,
        },
      },
      create: {
        userId: verificationCode.userId,
        leagueId: invitation.leagueId,
        role: LeagueRole.MEMBER,
      },
      update: {},
    }),
  ]);

  return {
    ok: true,
    error: null,
    redirectUrl: getSuccessfulInviteRedirectUrl(),
  };
}
