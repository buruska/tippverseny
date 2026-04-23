"use server";

import bcrypt from "bcryptjs";

import { passwordSchema } from "@/lib/password";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export async function resetPasswordAction(
  token: string,
  passwordValue: string,
  passwordConfirmationValue: string,
) {
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

  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashPasswordResetToken(token),
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (
    !passwordResetToken ||
    passwordResetToken.usedAt ||
    passwordResetToken.expiresAt <= new Date()
  ) {
    return {
      ok: false,
      error: "Ez a jelszó-visszaállító link már nem érvényes.",
    };
  }

  const passwordHash = await bcrypt.hash(parsedPassword.data, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: passwordResetToken.userId,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetToken.update({
      where: {
        id: passwordResetToken.id,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: passwordResetToken.userId,
        usedAt: null,
        id: {
          not: passwordResetToken.id,
        },
      },
      data: {
        usedAt: now,
      },
    }),
  ]);

  return {
    ok: true,
    error: null,
  };
}
