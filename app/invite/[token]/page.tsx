import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { InviteAcceptanceForm } from "./invite-acceptance-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      league: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="w-full max-w-xl rounded-[32px] border border-[color:var(--border)] bg-white p-8 text-center shadow-[0_24px_80px_rgba(11,31,58,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
          Meghívó
        </p>
        <h1 className="mt-4 text-3xl font-bold text-[color:var(--navy)]">
          {invitation.league.name}
        </h1>
        <InviteAcceptanceForm leagueName={invitation.league.name} token={token} />
      </section>
    </main>
  );
}
