"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  createLeagueAction,
  createLeagueInviteLinkAction,
  deleteLeagueAction,
} from "@/app/admin/actions";

type LeagueListItem = {
  id: string;
  name: string;
  memberCount: number;
};

type LeagueManagerProps = {
  leagues: LeagueListItem[];
  canManageLeagues: boolean;
};

export function LeagueManager({ leagues, canManageLeagues }: LeagueManagerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);
  const [manualInviteUrl, setManualInviteUrl] = useState<string | null>(null);
  const [leagueToDelete, setLeagueToDelete] = useState<LeagueListItem | null>(
    null,
  );

  function handleCreateLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createLeagueAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setIsModalOpen(false);
      router.refresh();
    });
  }

  function handleCreateInviteLink(leagueId: string) {
    setError(null);
    setManualInviteUrl(null);

    startTransition(async () => {
      const result = await createLeagueInviteLinkAction(leagueId);

      if (!result.ok || !result.inviteUrl) {
        setError(result.error ?? "Nem sikerült meghívólinket létrehozni.");
        return;
      }

      try {
        await navigator.clipboard.writeText(result.inviteUrl);
        setCopiedLeagueId(leagueId);
      } catch {
        setManualInviteUrl(result.inviteUrl);
      }
    });
  }

  function handleDeleteLeague(league: LeagueListItem) {
    setError(null);
    setManualInviteUrl(null);
    setLeagueToDelete(league);
  }

  function confirmDeleteLeague() {
    if (!leagueToDelete) {
      return;
    }

    const leagueId = leagueToDelete.id;
    startTransition(async () => {
      const result = await deleteLeagueAction(leagueId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setLeagueToDelete(null);
      router.refresh();
    });
  }

  return (
    <section className="mt-8 rounded-[28px] border border-[color:var(--border)] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--navy)]">Ligák</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
            Itt látszanak az általad létrehozott ligák és a hozzájuk tartozó
            meghívólinkek.
          </p>
        </div>

        {canManageLeagues ? (
          <button
            className="rounded-full bg-[color:var(--green)] px-5 py-3 text-sm font-bold text-white transition hover:translate-y-[-1px] hover:bg-[#0f684d]"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            Új liga létrehozása
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {manualInviteUrl ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A böngésző nem engedte az automatikus másolást. Másold ki kézzel:
          <code className="mt-2 block break-all rounded-xl bg-white px-3 py-2">
            {manualInviteUrl}
          </code>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {leagues.length === 0 ? (
          <div className="rounded-3xl bg-[color:var(--card-muted)] p-6 text-sm leading-6 text-[color:var(--foreground)]">
            Még nincs létrehozott liga. Hozd létre az első ligát, majd küldd el
            a meghívólinket a résztvevőknek.
          </div>
        ) : (
          leagues.map((league) => (
            <article
              className="flex flex-col gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-5 sm:flex-row sm:items-center sm:justify-between"
              key={league.id}
            >
              <div>
                <h3 className="text-lg font-bold text-[color:var(--navy)]">
                  {league.name}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--muted,#5B6B7F)]">
                  {league.memberCount} tag van a ligában
                </p>
              </div>

              {canManageLeagues ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-bold text-white transition hover:translate-y-[-1px] hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => handleCreateInviteLink(league.id)}
                    type="button"
                  >
                    {copiedLeagueId === league.id ? "Link másolva" : "Meghívó"}
                  </button>
                  <button
                    className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:translate-y-[-1px] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => handleDeleteLeague(league)}
                    type="button"
                  >
                    Törlés
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--green)]">
                  Új liga
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                  Liga létrehozása
                </h3>
              </div>
              <button
                aria-label="Modal bezárása"
                className="rounded-full px-3 py-2 text-xl leading-none text-[color:var(--muted,#5B6B7F)] hover:bg-[color:var(--card-muted)]"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleCreateLeague}>
              <div>
                <label
                  className="text-sm font-semibold text-[color:var(--navy)]"
                  htmlFor="league-name"
                >
                  Liga neve
                </label>
                <input
                  autoFocus
                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                  id="league-name"
                  minLength={3}
                  name="name"
                  placeholder="Például: Barátok VB ligája"
                  required
                  type="text"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                >
                  Mégsem
                </button>
                <button
                  className="rounded-full bg-[color:var(--green)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f684d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "Létrehozás..." : "Liga létrehozása"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {leagueToDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-600">
                Liga törlése
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                Biztosan törlöd?
              </h3>
              <p className="mt-4 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
                A(z) <strong>{leagueToDelete.name}</strong> liga törlésével a
                hozzá tartozó meghívók, tagságok, tippek és pontok is törlődnek.
                Ez a művelet nem visszavonható.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
                disabled={isPending}
                onClick={() => setLeagueToDelete(null)}
                type="button"
              >
                Mégsem
              </button>
              <button
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={confirmDeleteLeague}
                type="button"
              >
                {isPending ? "Törlés..." : "Igen, törlöm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
