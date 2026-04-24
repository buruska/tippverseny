import { getPendingInvitation } from "@/lib/invitations";

import { InviteAcceptanceForm } from "./invite-acceptance-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { invitation, error } = await getPendingInvitation(token);

  if (!invitation) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-10">
        <section className="w-full max-w-xl rounded-[32px] border border-[color:var(--border)] bg-white p-8 text-center shadow-[0_24px_80px_rgba(11,31,58,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--green)]">
            Meghívó
          </p>
          <h1 className="mt-4 text-3xl font-bold text-[color:var(--navy)]">
            Ez a meghívó már nem használható
          </h1>
          <p className="mt-4 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
            {error ?? "A meghívó nem található vagy már lejárt. Kérj új linket a liga adminjától."}
          </p>
        </section>
      </main>
    );
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
