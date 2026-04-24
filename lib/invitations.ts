import { InvitationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getPendingInvitation(token: string) {
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
