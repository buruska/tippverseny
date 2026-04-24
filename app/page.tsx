import Link from "next/link";

import { BrowserDateTime } from "@/app/components/browser-date-time";
import { prisma } from "@/lib/prisma";

const stageLabels: Record<string, string> = {
  GROUP: "Csoportkor",
  ROUND_OF_32: "Legjobb 32",
  ROUND_OF_16: "Nyolcaddonto",
  QUARTER_FINAL: "Negyeddonto",
  SEMI_FINAL: "Elodonto",
  THIRD_PLACE: "Bronzmeccs",
  FINAL: "Donto",
};

export default async function HomePage() {
  const matches = await prisma.match.findMany({
    orderBy: [{ kickoffAt: "asc" }, { createdAt: "asc" }],
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
            2026-os Menetrend
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[color:var(--navy)] md:text-6xl">
            VB Tippverseny 2026
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[color:var(--foreground)]/76 md:text-base">
            Az importalt VB meccsek datum szerint rendezve. A kezdési idő mindig a böngésződ
            helyi időzónájában jelenik meg.
          </p>
        </div>

        <Link
          className="rounded-2xl bg-[color:var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] !text-white shadow-[0_12px_32px_rgba(11,31,58,0.16)] transition hover:translate-y-[-1px] hover:bg-[#16375f] hover:!text-white"
          href="/login"
        >
          Bejelentkezés
        </Link>
      </div>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[28px] border border-[color:var(--border)] bg-white/88 px-5 py-4 shadow-[0_18px_46px_rgba(11,31,58,0.08)] backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--navy)]/55">
              Osszes importalt meccs
            </p>
            <p className="mt-1 text-2xl font-black text-[color:var(--navy)]">{matches.length}</p>
          </div>
          <p className="max-w-xl text-right text-sm text-[color:var(--foreground)]/70">
            A lista az adatbazisban levo meccseket mutatja, a datum-es idomegjelenites pedig
            kliensoldalon a browser idozonajahoz igazodik.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-[color:var(--border)] bg-white/75 px-8 py-16 text-center shadow-[0_18px_46px_rgba(11,31,58,0.08)]">
            <h2 className="text-2xl font-bold text-[color:var(--navy)]">Még nincs importált VB-meccs</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]/72">
              Futtasd a <code className="rounded bg-[color:var(--card-muted)] px-2 py-1">npm run matches:import</code>{" "}
              parancsot, és a főoldal automatikusan feltöltődik az importált menetrenddel.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => {
              const homeTeamName = match.homeTeam?.name ?? "TBD";
              const awayTeamName = match.awayTeam?.name ?? "TBD";
              const stageLabel = stageLabels[match.stage] ?? match.stage;

              return (
                <article
                  key={match.id}
                  className="rounded-[28px] border border-[color:var(--border)] bg-white/92 p-5 shadow-[0_18px_46px_rgba(11,31,58,0.08)] transition hover:translate-y-[-2px]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[color:var(--card-muted)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--navy)]/70">
                      {stageLabel}
                    </span>
                    {match.groupName ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--green)]">
                        Csoport {match.groupName}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-2xl bg-[color:var(--card-muted)]/65 px-4 py-3 text-sm font-semibold text-[color:var(--navy)]">
                      <BrowserDateTime
                        iso={match.kickoffAt.toISOString()}
                        options={{
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                        utcFallbackOptions={{
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                      />
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-bold text-[color:var(--navy)]">
                          {homeTeamName}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground)]/55">
                          vs
                        </span>
                        <span className="text-right text-base font-bold text-[color:var(--navy)]">
                          {awayTeamName}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
