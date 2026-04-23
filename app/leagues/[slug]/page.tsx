import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await prisma.league.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          memberships: true,
        },
      },
    },
  });

  if (!league) {
    notFound();
  }

  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/leagues/${slug}`);
  }

  const membership = await prisma.leagueMembership.findUnique({
    where: {
      userId_leagueId: {
        userId: session.user.id,
        leagueId: league.id,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership && session.user.role !== "SUPERADMIN") {
    redirect("/dashboard?error=league-access-denied");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-[color:var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(11,31,58,0.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
          Liga oldal
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[color:var(--navy)]">
          {league.name}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
          Sikeresen csatlakoztál a ligához. Jelenleg {league._count.memberships}
          tag van ebben a ligában.
        </p>
      </section>
    </main>
  );
}
