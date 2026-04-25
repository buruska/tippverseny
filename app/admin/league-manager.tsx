"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  createMatchAction,
  createLeagueAction,
  createLeagueInviteLinkAction,
  deleteLeagueAction,
  updateMatchLiveStateAction,
} from "@/app/admin/actions";
import { BrowserDateTime } from "@/app/components/browser-date-time";
import type { LeagueRole, MatchStage, MatchStatus } from "@prisma/client";

type LeagueListItem = {
  id: string;
  name: string;
  memberCount: number;
  participants: Array<{
    id: string;
    name: string | null;
    email: string;
    points: number;
    role: LeagueRole;
    predictions: Array<{
      id: string;
      homeScore: number;
      awayScore: number;
      submittedAt: Date;
      kickoffAt: Date;
      stage: string;
      homeTeamName: string | null;
      awayTeamName: string | null;
    }>;
  }>;
};

type MatchListItem = {
  isManual: boolean;
  id: string;
  stage: MatchStage;
  status: MatchStatus;
  kickoffAt: Date;
  liveMinute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamName: string;
  awayTeamName: string;
};

type LeagueManagerProps = {
  leagues: LeagueListItem[];
  canManageLeagues: boolean;
  matches: MatchListItem[];
};

export function LeagueManager({ leagues, canManageLeagues, matches }: LeagueManagerProps) {
  const router = useRouter();
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);
  const [manualInviteUrl, setManualInviteUrl] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<{
    leagueName: string;
    participant: LeagueListItem["participants"][number];
  } | null>(null);
  const [leagueToDelete, setLeagueToDelete] = useState<LeagueListItem | null>(
    null,
  );

  function toggleLeagueDetails(leagueId: string) {
    setExpandedLeagueId((currentLeagueId) =>
      currentLeagueId === leagueId ? null : leagueId,
    );
  }

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
      setIsLeagueModalOpen(false);
      router.refresh();
    });
  }

  function handleCreateMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const kickoffAtLocalValue = String(formData.get("kickoffAtLocal") ?? "").trim();

    if (kickoffAtLocalValue.length === 0) {
      setError("Add meg a meccs kezdési időpontját.");
      return;
    }

    const kickoffAt = new Date(kickoffAtLocalValue);

    if (Number.isNaN(kickoffAt.getTime())) {
      setError("Érvénytelen kezdési időpont.");
      return;
    }

    startTransition(async () => {
      const result = await createMatchAction({
        homeTeamName: String(formData.get("homeTeamName") ?? ""),
        awayTeamName: String(formData.get("awayTeamName") ?? ""),
        kickoffAtIso: kickoffAt.toISOString(),
        stage: String(formData.get("stage") ?? "GROUP") as MatchStage,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setIsMatchModalOpen(false);
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

  function handleOpenPredictions(
    leagueName: string,
    participant: LeagueListItem["participants"][number],
  ) {
    setSelectedParticipant({
      leagueName,
      participant,
    });
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

  function handleUpdateMatch(
    event: FormEvent<HTMLFormElement>,
    matchId: string,
    currentStatus: MatchStatus,
  ) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const status = String(formData.get("status") ?? currentStatus) as MatchStatus;
    const homeScoreValue = String(formData.get("homeScore") ?? "").trim();
    const awayScoreValue = String(formData.get("awayScore") ?? "").trim();
    const liveMinuteValue = String(formData.get("liveMinute") ?? "").trim();

    startTransition(async () => {
      const result = await updateMatchLiveStateAction({
        matchId,
        status,
        homeScore: homeScoreValue === "" ? null : Number(homeScoreValue),
        awayScore: awayScoreValue === "" ? null : Number(awayScoreValue),
        liveMinute: liveMinuteValue === "" ? null : Number(liveMinuteValue),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="mt-8 rounded-[28px] border border-[color:var(--border)] bg-white p-6">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--navy)]">Teszt meccsek</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
            Ideiglenes superadmin eszköz meccsek hozzáadásához és élő állapotuk
            kézi frissítéséhez.
          </p>
        </div>

        {canManageLeagues ? (
          <button
            className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-bold text-white transition hover:translate-y-[-1px] hover:bg-[#16375f]"
            onClick={() => setIsMatchModalOpen(true)}
            type="button"
          >
            Új meccs
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4">
        {matches.length === 0 ? (
          <div className="rounded-3xl bg-[color:var(--card-muted)] p-6 text-sm leading-6 text-[color:var(--foreground)]">
            Még nincs rögzített meccs. Hozz létre egyet teszteléshez.
          </div>
        ) : (
          matches.map((match) => (
            <article
              className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-5"
              key={match.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
                    {getMatchStageLabel(match.stage)}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[color:var(--navy)]">
                    {match.homeTeamName} - {match.awayTeamName}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--muted,#5B6B7F)]">
                    Kezdés:{" "}
                    <BrowserDateTime
                      iso={new Date(match.kickoffAt).toISOString()}
                      locale="hu-HU"
                      options={{
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }}
                      utcFallbackOptions={{
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }}
                    />
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
                      {getMatchStatusLabel(match.status)}
                    </span>
                    {match.liveMinute !== null ? (
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--navy)]">
                        {match.liveMinute}. perc
                      </span>
                    ) : null}
                    {match.homeScore !== null && match.awayScore !== null ? (
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[color:var(--navy)]">
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                      {match.isManual ? "Kézi meccs" : "Importált meccs"}
                    </span>
                  </div>
                </div>

                {match.isManual ? (
                  <form
                    className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-4 sm:grid-cols-2 lg:min-w-[360px]"
                    onSubmit={(event) => handleUpdateMatch(event, match.id, match.status)}
                  >
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                        Állapot
                      </span>
                      <select
                        className="rounded-2xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--navy)] outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                        defaultValue={match.status}
                        name="status"
                      >
                        <option value="SCHEDULED">Ütemezve</option>
                        <option value="LOCKED">Lezárva</option>
                        <option value="LIVE">Élő</option>
                        <option value="FINISHED">Befejezett</option>
                        <option value="CANCELLED">Törölve</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                        Perc
                      </span>
                      <input
                        className="rounded-2xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--navy)] outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                        defaultValue={match.liveMinute ?? ""}
                        max={130}
                        min={1}
                        name="liveMinute"
                        placeholder="például 67"
                        type="number"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                        Hazai gól
                      </span>
                      <input
                        className="rounded-2xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--navy)] outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                        defaultValue={match.homeScore ?? ""}
                        max={99}
                        min={0}
                        name="homeScore"
                        type="number"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                        Vendég gól
                      </span>
                      <input
                        className="rounded-2xl border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--navy)] outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                        defaultValue={match.awayScore ?? ""}
                        max={99}
                        min={0}
                        name="awayScore"
                        type="number"
                      />
                    </label>

                    <div className="sm:col-span-2 sm:justify-self-end">
                      <button
                        className="rounded-full bg-[color:var(--green)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f684d] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                        type="submit"
                      >
                        {isPending ? "Mentés..." : "Meccs frissítése"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[color:var(--muted,#5B6B7F)] lg:min-w-[360px]">
                    Az API-ból importált meccsek itt csak megtekinthetők. Ezen a
                    teszt felületen csak a kézzel létrehozott meccsek módosíthatók.
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            onClick={() => setIsLeagueModalOpen(true)}
            type="button"
          >
            Új liga létrehozása
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4">
        {leagues.length === 0 ? (
          <div className="rounded-3xl bg-[color:var(--card-muted)] p-6 text-sm leading-6 text-[color:var(--foreground)]">
            Még nincs létrehozott liga. Hozd létre az első ligát, majd küldd el
            a meghívólinket a résztvevőknek.
          </div>
        ) : (
          leagues.map((league) => (
            <article
              className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-5"
              key={league.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <button
                    aria-expanded={expandedLeagueId === league.id}
                    aria-label={`${league.name} részleteinek megnyitása`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-2xl font-medium text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
                    onClick={() => toggleLeagueDetails(league.id)}
                    type="button"
                  >
                    {expandedLeagueId === league.id ? "−" : "+"}
                  </button>
                  <div>
                    <h3 className="text-lg font-bold text-[color:var(--navy)]">
                      {league.name}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--muted,#5B6B7F)]">
                      {league.memberCount} tag van a ligában
                    </p>
                  </div>
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
              </div>

              {expandedLeagueId === league.id ? (
                <div className="mt-5 rounded-[28px] border border-[color:var(--border)] bg-white p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-[color:var(--navy)]">
                        Résztvevők
                      </h4>
                      <p className="text-sm text-[color:var(--muted,#5B6B7F)]">
                        A ligában szereplő felhasználók és az összesített pontjaik.
                      </p>
                    </div>
                  </div>

                  {league.participants.length === 0 ? (
                    <div className="mt-4 rounded-2xl bg-[color:var(--card-muted)] px-4 py-3 text-sm text-[color:var(--foreground)]">
                      Ebben a ligában még nincs résztvevő.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {league.participants.map((participant, index) => (
                        <div
                          className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          key={participant.id}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-[color:var(--navy)]">
                                #{index + 1}
                              </span>
                              <span className="text-sm font-bold text-[color:var(--navy)]">
                                {participant.name ?? participant.email}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
                                {getLeagueRoleLabel(participant.role)}
                              </span>
                            </div>
                            {participant.name ? (
                              <p className="mt-1 text-sm text-[color:var(--muted,#5B6B7F)]">
                                {participant.email}
                              </p>
                            ) : null}
                          </div>

                          <div className="rounded-2xl bg-white px-4 py-3 text-center sm:min-w-28">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                              Pont
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[color:var(--navy)]">
                              {participant.points}
                            </p>
                          </div>

                          <button
                            className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:translate-y-[-1px] hover:bg-[color:var(--card-muted)]"
                            onClick={() => handleOpenPredictions(league.name, participant)}
                            type="button"
                          >
                            Tippek
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {isMatchModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-xl rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--green)]">
                  Új meccs
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                  Teszt meccs létrehozása
                </h3>
              </div>
              <button
                aria-label="Modal bezárása"
                className="rounded-full px-3 py-2 text-xl leading-none text-[color:var(--muted,#5B6B7F)] hover:bg-[color:var(--card-muted)]"
                onClick={() => setIsMatchModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="mt-6 grid gap-5" onSubmit={handleCreateMatch}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-semibold text-[color:var(--navy)]"
                    htmlFor="match-home-team-name"
                  >
                    Hazai csapat
                  </label>
                  <input
                    autoFocus
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                    id="match-home-team-name"
                    minLength={2}
                    name="homeTeamName"
                    placeholder="Például: Magyarország"
                    required
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-[color:var(--navy)]"
                    htmlFor="match-away-team-name"
                  >
                    Vendég csapat
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                    id="match-away-team-name"
                    minLength={2}
                    name="awayTeamName"
                    placeholder="Például: Brazília"
                    required
                    type="text"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-semibold text-[color:var(--navy)]"
                    htmlFor="match-stage"
                  >
                    Szakasz
                  </label>
                  <select
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                    defaultValue="GROUP"
                    id="match-stage"
                    name="stage"
                  >
                    <option value="GROUP">Csoportkör</option>
                    <option value="ROUND_OF_32">Nyolcaddöntő</option>
                    <option value="ROUND_OF_16">Tizenhat közé jutás</option>
                    <option value="QUARTER_FINAL">Negyeddöntő</option>
                    <option value="SEMI_FINAL">Elődöntő</option>
                    <option value="THIRD_PLACE">Bronzmérkőzés</option>
                    <option value="FINAL">Döntő</option>
                  </select>
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-[color:var(--navy)]"
                    htmlFor="match-kickoff-at"
                  >
                    Kezdési időpont
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[color:var(--green)] focus:ring-4 focus:ring-emerald-100"
                    id="match-kickoff-at"
                    name="kickoffAtLocal"
                    required
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-bold text-[color:var(--navy)] transition hover:bg-[color:var(--card-muted)]"
                  onClick={() => setIsMatchModalOpen(false)}
                  type="button"
                >
                  Mégsem
                </button>
                <button
                  className="rounded-full bg-[color:var(--navy)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16375f] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "Létrehozás..." : "Meccs létrehozása"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isLeagueModalOpen ? (
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
                onClick={() => setIsLeagueModalOpen(false)}
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
                  onClick={() => setIsLeagueModalOpen(false)}
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

      {selectedParticipant ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(11,31,58,0.45)] px-4">
          <div className="w-full max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(11,31,58,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--green)]">
                  Tag tippei
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[color:var(--navy)]">
                  {selectedParticipant.participant.name ??
                    selectedParticipant.participant.email}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted,#5B6B7F)]">
                  Liga: {selectedParticipant.leagueName}
                </p>
              </div>
              <button
                aria-label="Modal bezárása"
                className="rounded-full px-3 py-2 text-xl leading-none text-[color:var(--muted,#5B6B7F)] hover:bg-[color:var(--card-muted)]"
                onClick={() => setSelectedParticipant(null)}
                type="button"
              >
                ×
              </button>
            </div>

            {selectedParticipant.participant.predictions.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-[color:var(--card-muted)] px-4 py-3 text-sm text-[color:var(--foreground)]">
                Ennek a tagnak még nincs rögzített tippje ebben a ligában.
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {selectedParticipant.participant.predictions.map((prediction) => (
                  <div
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-4"
                    key={prediction.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                          {getMatchStageLabel(prediction.stage)}
                        </p>
                        <h4 className="mt-1 text-base font-bold text-[color:var(--navy)]">
                          {prediction.homeTeamName ?? "Hazai csapat"} -{" "}
                          {prediction.awayTeamName ?? "Vendég csapat"}
                        </h4>
                        <p className="mt-1 text-sm text-[color:var(--muted,#5B6B7F)]">
                          Kezdés:{" "}
                          <BrowserDateTime
                            iso={new Date(prediction.kickoffAt).toISOString()}
                            locale="hu-HU"
                            options={{
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }}
                            utcFallbackOptions={{
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }}
                          />
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white px-4 py-3 text-center sm:min-w-32">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted,#5B6B7F)]">
                          Tipp
                        </p>
                        <p className="mt-1 text-2xl font-bold text-[color:var(--navy)]">
                          {prediction.homeScore} - {prediction.awayScore}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-medium text-[color:var(--muted,#5B6B7F)]">
                      Mentve:{" "}
                      <BrowserDateTime
                        iso={new Date(prediction.submittedAt).toISOString()}
                        locale="hu-HU"
                        options={{
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                        utcFallbackOptions={{
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                      />
                    </p>
                  </div>
                ))}
              </div>
            )}
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
                 Azok a felhasználók is törlődnek, akiknek ez volt az egyetlen
                 ligájuk. Ez a művelet nem visszavonható.
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

function getLeagueRoleLabel(role: LeagueRole) {
  switch (role) {
    case "OWNER":
      return "Tulajdonos";
    case "ADMIN":
      return "Admin";
    default:
      return "Tag";
  }
}

function getMatchStageLabel(stage: string) {
  switch (stage) {
    case "GROUP":
      return "Csoportkör";
    case "ROUND_OF_32":
      return "Nyolcaddöntő";
    case "ROUND_OF_16":
      return "Tizenhat közé jutás";
    case "QUARTER_FINAL":
      return "Negyeddöntő";
    case "SEMI_FINAL":
      return "Elődöntő";
    case "THIRD_PLACE":
      return "Bronzmérkőzés";
    case "FINAL":
      return "Döntő";
    default:
      return stage;
  }
}

function getMatchStatusLabel(status: MatchStatus) {
  switch (status) {
    case "SCHEDULED":
      return "Ütemezve";
    case "LOCKED":
      return "Lezárva";
    case "LIVE":
      return "Élő";
    case "FINISHED":
      return "Befejezett";
    case "CANCELLED":
      return "Törölve";
    default:
      return status;
  }
}
