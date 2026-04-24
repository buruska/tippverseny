import { MatchStage, MatchStatus, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  WORLD_CUP_KNOCKOUT_PREFIX,
  knockoutMatches,
} from "../lib/world-cup-knockout.mjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const API_KEY = process.env.THESPORTSDB_API_KEY || "123";
const LEAGUE_ID = process.env.WORLD_CUP_LEAGUE_ID || "4429";
const LEAGUE_SLUG = process.env.WORLD_CUP_LEAGUE_SLUG || "fifa-world-cup";
const SEASON = process.env.WORLD_CUP_SEASON || "2026";
const REQUEST_INTERVAL_MS = Number.parseInt(
  process.env.THESPORTSDB_REQUEST_INTERVAL_MS || "2200",
  10,
);
const EXPECTED_MATCHES = 104;

function getPredictionLockAt(kickoffAt) {
  return new Date(kickoffAt.getTime() - 15 * 60 * 1000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "vb-tippverseny-2026/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Nem sikerult letolteni az oldalt (${response.status}): ${url}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "vb-tippverseny-2026/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Nem sikerult letolteni a JSON valaszt (${response.status}): ${url}`);
  }

  return response.json();
}

function extractEventIds(html) {
  return [...new Set([...html.matchAll(/\/event\/(\d+)-/g)].map((match) => match[1]))];
}

function parseKickoffAt(event) {
  const rawValue =
    event.strTimestamp ||
    (event.dateEvent && event.strTime ? `${event.dateEvent}T${event.strTime}` : null);

  if (!rawValue) {
    throw new Error(`Hianyzik a kickoff ido az esemennyel: ${event.idEvent}`);
  }

  const normalizedUtcValue =
    rawValue.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(rawValue)
      ? rawValue
      : `${rawValue}Z`;
  const kickoffAt = new Date(normalizedUtcValue);

  if (Number.isNaN(kickoffAt.getTime())) {
    throw new Error(`Ervenytelen kickoff ido az esemennyel: ${event.idEvent}`);
  }

  return new Date(kickoffAt.toISOString());
}

function mapStage(event) {
  if (event.strGroup) {
    return MatchStage.GROUP;
  }

  const round = Number.parseInt(event.intRound || "0", 10);

  switch (round) {
    case 4:
      return MatchStage.ROUND_OF_32;
    case 5:
      return MatchStage.ROUND_OF_16;
    case 6:
      return MatchStage.QUARTER_FINAL;
    case 7:
      return MatchStage.SEMI_FINAL;
    case 8:
      return MatchStage.THIRD_PLACE;
    case 9:
      return MatchStage.FINAL;
    default:
      return MatchStage.GROUP;
  }
}

function mapStatus(event) {
  const status = (event.strStatus || "").trim().toLowerCase();

  if (
    event.strPostponed === "yes" ||
    status.includes("cancel") ||
    status.includes("postpon") ||
    status.includes("abandon")
  ) {
    return MatchStatus.CANCELLED;
  }

  if (
    status.includes("in progress") ||
    status.includes("live") ||
    status.includes("half") ||
    status.includes("extra time") ||
    status.includes("pen")
  ) {
    return MatchStatus.LIVE;
  }

  if (status.includes("finish") || status === "ft") {
    return MatchStatus.FINISHED;
  }

  if (event.strLocked === "locked") {
    return MatchStatus.LOCKED;
  }

  return MatchStatus.SCHEDULED;
}

async function upsertTeam({ externalId, name, badgeUrl, groupName }) {
  if (!externalId || !name) {
    return null;
  }

  return prisma.team.upsert({
    where: {
      externalId: String(externalId),
    },
    update: {
      name,
      shortName: name,
      flagUrl: badgeUrl || null,
      groupName: groupName || null,
    },
    create: {
      externalId: String(externalId),
      name,
      shortName: name,
      flagUrl: badgeUrl || null,
      groupName: groupName || null,
    },
  });
}

async function fetchPublishedEventIds() {
  const seasonPageUrl = `https://www.thesportsdb.com/season/${LEAGUE_ID}-${LEAGUE_SLUG}/${SEASON}`;
  const html = await fetchText(seasonPageUrl);
  const eventIds = extractEventIds(html);

  if (eventIds.length === 0) {
    throw new Error("Nem talaltam meccsazonositokat a publikus szezonoldalon.");
  }

  return eventIds;
}

async function fetchEventDetails(eventIds) {
  const events = [];

  for (let index = 0; index < eventIds.length; index += 1) {
    const eventId = eventIds[index];
    const lookupUrl = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/lookupevent.php?id=${eventId}`;
    const payload = await fetchJson(lookupUrl);
    const event = payload.events?.[0];

    if (!event) {
      throw new Error(`Nem erkezett esemeny reszlet azonositohoz: ${eventId}`);
    }

    events.push(event);

    if ((index + 1) % 10 === 0 || index === eventIds.length - 1) {
      console.log(`Lekerve ${index + 1}/${eventIds.length} meccs reszlet`);
    }

    if (index < eventIds.length - 1) {
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  return events;
}

async function importEvent(event) {
  const groupName = event.strGroup || null;
  const [homeTeam, awayTeam] = await Promise.all([
    upsertTeam({
      externalId: event.idHomeTeam,
      name: event.strHomeTeam,
      badgeUrl: event.strHomeTeamBadge,
      groupName,
    }),
    upsertTeam({
      externalId: event.idAwayTeam,
      name: event.strAwayTeam,
      badgeUrl: event.strAwayTeamBadge,
      groupName,
    }),
  ]);

  const kickoffAt = parseKickoffAt(event);
  const stage = mapStage(event);
  const status = mapStatus(event);

  await prisma.match.upsert({
    where: {
      externalId: String(event.idEvent),
    },
    update: {
      stage,
      status,
      groupName,
      kickoffAt,
      lockAt: getPredictionLockAt(kickoffAt),
      homeTeamId: homeTeam?.id || null,
      awayTeamId: awayTeam?.id || null,
      homeScore: event.intHomeScore === null ? null : Number(event.intHomeScore),
      awayScore: event.intAwayScore === null ? null : Number(event.intAwayScore),
      finalHomeScore: event.intHomeScore === null ? null : Number(event.intHomeScore),
      finalAwayScore: event.intAwayScore === null ? null : Number(event.intAwayScore),
    },
    create: {
      externalId: String(event.idEvent),
      stage,
      status,
      groupName,
      kickoffAt,
      lockAt: getPredictionLockAt(kickoffAt),
      homeTeamId: homeTeam?.id || null,
      awayTeamId: awayTeam?.id || null,
      homeScore: event.intHomeScore === null ? null : Number(event.intHomeScore),
      awayScore: event.intAwayScore === null ? null : Number(event.intAwayScore),
      finalHomeScore: event.intHomeScore === null ? null : Number(event.intHomeScore),
      finalAwayScore: event.intAwayScore === null ? null : Number(event.intAwayScore),
    },
  });
}

function parseEasternKickoffToUtc(kickoffDate, kickoffTimeEt) {
  return new Date(`${kickoffDate}T${kickoffTimeEt}:00-04:00`);
}

async function importKnockoutPlaceholder(match) {
  const kickoffAt = parseEasternKickoffToUtc(match.kickoffDate, match.kickoffTimeEt);
  const lockAt = getPredictionLockAt(kickoffAt);
  const stage = MatchStage[match.stage];
  const existingMatchesAtSlot = await prisma.match.findMany({
    where: {
      stage,
      kickoffAt,
    },
    select: {
      externalId: true,
    },
  });

  const hasRealMatchAtSlot = existingMatchesAtSlot.some(
    (existingMatch) =>
      existingMatch.externalId !== match.externalId &&
      !existingMatch.externalId?.startsWith(WORLD_CUP_KNOCKOUT_PREFIX),
  );

  if (hasRealMatchAtSlot) {
    await prisma.match.deleteMany({
      where: {
        externalId: match.externalId,
      },
    });
    return;
  }

  await prisma.match.upsert({
    where: {
      externalId: match.externalId,
    },
    update: {
      stage,
      status: MatchStatus.SCHEDULED,
      groupName: null,
      kickoffAt,
      lockAt,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      finalHomeScore: null,
      finalAwayScore: null,
      wentToExtraTime: false,
      wentToPenalties: false,
    },
    create: {
      externalId: match.externalId,
      stage,
      status: MatchStatus.SCHEDULED,
      groupName: null,
      kickoffAt,
      lockAt,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      finalHomeScore: null,
      finalAwayScore: null,
      wentToExtraTime: false,
      wentToPenalties: false,
    },
  });
}

async function main() {
  console.log(`VB menetrend import indul (${SEASON})...`);

  const eventIds = await fetchPublishedEventIds();
  console.log(`Talalt publikus meccsek: ${eventIds.length}`);

  if (eventIds.length < EXPECTED_MATCHES) {
    console.warn(
      `Figyelem: a publikus feed jelenleg ${eventIds.length} meccset ad, nem a teljes ${EXPECTED_MATCHES}-et.`,
    );
  }

  const events = await fetchEventDetails(eventIds);

  for (const event of events) {
    await importEvent(event);
  }

  for (const knockoutMatch of knockoutMatches) {
    await importKnockoutPlaceholder(knockoutMatch);
  }

  const importedTeamCount = await prisma.team.count();
  const importedMatchCount = await prisma.match.count();

  console.log(`Import kesz. Csapatok: ${importedTeamCount}, meccsek: ${importedMatchCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
