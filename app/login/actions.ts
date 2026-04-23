"use server";

import { sendPasswordResetEmail } from "@/lib/email";
import {
  createPasswordResetToken,
  getPasswordResetExpiresAt,
  getPasswordResetUrl,
  hashPasswordResetToken,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validations/auth";

export async function requestPasswordResetAction(emailValue: string) {
  const parsed = signInSchema.shape.email.safeParse(emailValue);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Érvénytelen email cím.",
    };
  }

  const email = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return {
      ok: true,
      error: null,
      message:
        "Ha létezik ilyen fiók, elküldtük a jelszó-visszaállító linket az email címre.",
    };
  }

  const token = createPasswordResetToken();
  const now = new Date();

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashPasswordResetToken(token),
      userId: user.id,
      expiresAt: getPasswordResetExpiresAt(),
    },
  });

  try {
    await sendPasswordResetEmail({
      email: user.email,
      resetUrl: getPasswordResetUrl(token),
    });
  } catch {
    return {
      ok: false,
      error: "Nem sikerült elküldeni a jelszó-visszaállító emailt.",
    };
  }

  return {
    ok: true,
    error: null,
    message:
      "Ha létezik ilyen fiók, elküldtük a jelszó-visszaállító linket az email címre.",
  };
}
