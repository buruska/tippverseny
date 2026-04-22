const stack = [
  "Next.js App Router",
  "TypeScript",
  "Tailwind CSS",
  "ESLint + Prettier",
  "Dokumentacio a docs mappaban",
];

const nextSteps = [
  "Prisma schema es adatbazis",
  "Auth es szerepkorok",
  "Liga- es meghivokezeles",
  "VB meccsimport",
  "Tippleadas es pontszamitas",
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10 lg:px-14">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_24px_80px_rgba(11,31,58,0.10)]">
          <div className="bg-[linear-gradient(135deg,var(--navy),#16375f_55%,var(--green))] px-8 py-8 text-white md:px-10">
            <p className="text-sm uppercase tracking-[0.28em] text-white/75">
              Projekt scaffold
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
              VB Tippverseny 2026
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/82 md:text-lg">
              Az alap Next.js projekt letrehozva. Innen mar a domain logikara,
              az adatmodellre es a ligakezelesre tudunk epiteni.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-[color:var(--gold)] px-5 py-3 text-sm font-semibold text-[color:var(--navy)]">
                Projektterv PDF
              </span>
              <span className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white">
                Implementalasi sorrend
              </span>
            </div>
          </div>

          <div className="grid gap-6 px-8 py-8 md:grid-cols-2 md:px-10">
            <div className="rounded-[24px] bg-[color:var(--card-muted)] p-6">
              <h2 className="text-lg font-semibold text-[color:var(--navy)]">
                Mi keszult el?
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--foreground)]">
                {stack.map((item) => (
                  <li className="flex items-start gap-3" key={item}>
                    <span className="mt-2 h-2 w-2 rounded-full bg-[color:var(--green)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] bg-[color:var(--navy)] p-6 text-white">
              <h2 className="text-lg font-semibold">Kovetkezo fejlesztesi blokk</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-white/82">
                {nextSteps.map((item, index) => (
                  <li className="flex items-start gap-3" key={item}>
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/12 text-xs font-semibold text-[color:var(--gold)]">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--green)]">
              Konytarstruktura
            </p>
            <div className="mt-4 rounded-2xl bg-[#0f213b] p-5 text-sm leading-7 text-white/80">
              <div>app/</div>
              <div>docs/</div>
              <div>scripts/</div>
              <div>package.json</div>
              <div>tsconfig.json</div>
              <div>.env.example</div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--red)]">
              Futtatasi parancsok
            </p>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--foreground)]">
              <div className="rounded-2xl bg-[color:var(--card-muted)] px-4 py-3">
                <code>npm run dev</code>
              </div>
              <div className="rounded-2xl bg-[color:var(--card-muted)] px-4 py-3">
                <code>npm run lint</code>
              </div>
              <div className="rounded-2xl bg-[color:var(--card-muted)] px-4 py-3">
                <code>npm run typecheck</code>
              </div>
              <div className="rounded-2xl bg-[color:var(--card-muted)] px-4 py-3">
                <code>npm run build</code>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
