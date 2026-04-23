import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-10">
      <Link
        className="absolute right-6 top-6 rounded-2xl bg-[color:var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] !text-white shadow-[0_12px_32px_rgba(11,31,58,0.16)] transition hover:translate-y-[-1px] hover:bg-[#16375f] hover:!text-white"
        href="/login"
      >
        Bejelentkezés
      </Link>

      <section className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-[color:var(--navy)] md:text-7xl">
          VB Tippverseny 2026
        </h1>
      </section>
    </main>
  );
}
