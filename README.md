# VB Tippverseny 2026

Next.js alapprojekt a 2026-os focivb tippjáték alkalmazáshoz.

## Technológia

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Prettier

## Elindítás

1. Telepítés:

```bash
npm install
```

2. Készíts helyi környezeti fájlt:

```bash
copy .env.example .env.local
```

3. Fejlesztői szerver:

```bash
npm run dev
```

4. Minőségellenőrzés:

```bash
npm run lint
npm run typecheck
npm run build
```

## Környezeti változók

Az induló projekt a következő változókat készíti elő:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_BASE_URL`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `AUTH_SECRET`
- `EMAIL_FROM`
- `RESEND_API_KEY`

## Adatbázis és Prisma

Az adatbázis réteget Prisma kezeli PostgreSQL providerrel.

Hasznos parancsok:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:studio
```

Fejlesztés előtt másold át az `.env.example` fájlt `.env.local` fájlba, majd állítsd be a saját `DATABASE_URL` értéket.

Superadmin létrehozása:

```bash
$env:SUPERADMIN_EMAIL="admin@example.com"
$env:SUPERADMIN_PASSWORD="change-me"
npm run db:create-superadmin
```

A jelszó soha nem kerülhet commitba. A script csak hash-elt jelszót ment az adatbázisba.

## Meghívó és regisztráció

A liga meghívólinkje email címet kér. Meglévő ligatag esetén jelszavas belépéssel lehet csatlakozni, új felhasználónál erős jelszó és 6 számjegyű email-kód szükséges. A kód 1 percig érvényes, és a felületen újraküldhető.

Valódi emailküldéshez állítsd be a `RESEND_API_KEY` és `EMAIL_FROM` változókat. Ha nincs `RESEND_API_KEY`, fejlesztés közben a szerver logba kerül a kód.

## Autentikáció

Az alkalmazás email + jelszó alapú belépést használ `next-auth` Credentials providerrel. A session JWT alapú, és tartalmazza a felhasználó `id`, `email`, `name` és `role` adatait.

Fontos oldalak:

- `/login` - bejelentkezés
- `/dashboard` - bejelentkezett felhasználói kezdőlap
- `/admin` - csak `SUPERADMIN` szerepkörrel érhető el

## Dokumentáció

- [PDF tervrajz](./docs/VB-Tippverseny-2026-tervrajz.pdf)
- [Implementálási sorrend PDF](./docs/VB-Tippverseny-2026-implementalasi-sorrend.pdf)
- [Projekt tervrajz forrás](./docs/projekt-tervrajz.md)
- [UI minták](./docs/ui-mintak.svg)

## Következő lépések

- adatbázis és Prisma schema
- autentikáció
- liga- és meghívókezelés
- meccsimport és tipplogika
