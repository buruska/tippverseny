# VB Tippverseny 2026

Next.js alapprojekt a 2026-os focivb tippjatek alkalmazashoz.

## Technologia

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Prettier

## Elinditas

1. Telepites:

```bash
npm install
```

2. Keszits helyi kornyezeti fajlt:

```bash
copy .env.example .env.local
```

3. Fejlesztoi szerver:

```bash
npm run dev
```

4. Minosegellenorzes:

```bash
npm run lint
npm run typecheck
npm run build
```

## Kornyezeti valtozok

Az indulo projekt a kovetkezo valtozokat kesziti elo:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `AUTH_SECRET`

## Dokumentacio

- [PDF tervrajz](./docs/VB-Tippverseny-2026-tervrajz.pdf)
- [Implementalasi sorrend PDF](./docs/VB-Tippverseny-2026-implementalasi-sorrend.pdf)
- [Projekt tervrajz forras](./docs/projekt-tervrajz.md)
- [UI mintak](./docs/ui-mintak.svg)

## Kovetkezo lepesek

- adatbazis es Prisma schema
- autentikacio
- liga- es meghivokezeles
- meccsimport es tipplogika
