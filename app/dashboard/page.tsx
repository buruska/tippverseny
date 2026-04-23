import Link from "next/link";

import { InactivityCountdown } from "@/app/components/inactivity-countdown";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const user = await requireUser();
  const memberships = await prisma.leagueMembership.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      joinedAt: "desc",
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      league: {
        select: {
          name: true,
          slug: true,
          _count: {
            select: {
              memberships: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-[color:var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(11,31,58,0.10)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
              Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[color:var(--navy)]">
              Felhasználói kezdőlap
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
              Itt látod, hogy melyik ligákban veszel részt.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <InactivityCountdown />
            <SignOutButton />
          </div>
        </div>

        <section className="mt-8 rounded-[28px] border border-[color:var(--border)] bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--navy)]">
              Saját ligáim
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
              Innen gyorsan meg tudod nyitni azokat a ligákat, ahová már
              csatlakoztál.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {memberships.length === 0 ? (
              <div className="rounded-3xl bg-[color:var(--card-muted)] p-6 text-sm leading-6 text-[color:var(--foreground)]">
                Jelenleg még nem vagy tagja egyetlen ligának sem.
              </div>
            ) : (
              memberships.map((membership) => (
                <article
                  className="flex flex-col gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-5 sm:flex-row sm:items-center sm:justify-between"
                  key={membership.id}
                >
                  <div>
                    <h3 className="text-lg font-bold text-[color:var(--navy)]">
                      {membership.league.name}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--muted,#5B6B7F)]">
                      {membership.league._count.memberships} tag van a ligában
                    </p>
                  </div>

                  <Link
                    className="inline-flex rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-bold text-white transition hover:translate-y-[-1px] hover:bg-[#16375f]"
                    href={`/leagues/${membership.league.slug}`}
                  >
                    Megnyitás
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
