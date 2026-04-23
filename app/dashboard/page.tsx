import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  await requireUser();

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-[color:var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(11,31,58,0.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[color:var(--navy)]">
          Felhasználói kezdőlap
        </h1>
      </section>
    </main>
  );
}
