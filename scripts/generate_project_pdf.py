from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
OUTPUT_PATH = DOCS_DIR / "VB-Tippverseny-2026-tervrajz.pdf"

PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)

NAVY = colors.HexColor("#0B1F3A")
GREEN = colors.HexColor("#127A5A")
RED = colors.HexColor("#D93A2F")
GOLD = colors.HexColor("#F4C95D")
INK = colors.HexColor("#102033")
MUTED = colors.HexColor("#5B6B7F")
LINE = colors.HexColor("#D9E1EA")
SURFACE = colors.HexColor("#F5F8FB")
WHITE = colors.white


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))


def set_font(c: canvas.Canvas, name: str = "Arial", size: int = 11, color=INK) -> None:
    c.setFont(name, size)
    c.setFillColor(color)


def draw_page_background(c: canvas.Canvas, page_no: int, title: str, subtitle: str) -> None:
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    c.setFillColor(NAVY)
    c.rect(0, PAGE_HEIGHT - 34 * mm, PAGE_WIDTH, 34 * mm, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(PAGE_WIDTH - 70 * mm, PAGE_HEIGHT - 34 * mm, 70 * mm, 34 * mm, fill=1, stroke=0)

    set_font(c, "Arial-Bold", 24, WHITE)
    c.drawString(18 * mm, PAGE_HEIGHT - 18 * mm, title)

    set_font(c, "Arial", 10, colors.HexColor("#D9E6F5"))
    c.drawString(18 * mm, PAGE_HEIGHT - 25 * mm, subtitle)

    set_font(c, "Arial", 9, MUTED)
    c.drawRightString(PAGE_WIDTH - 18 * mm, 12 * mm, f"{page_no}. oldal")


def wrap_text(c: canvas.Canvas, text: str, width: float, font_name: str = "Arial", font_size: int = 11) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if c.stringWidth(trial, font_name, font_size) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped_text(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    text: str,
    font_name: str = "Arial",
    font_size: int = 11,
    leading: int = 15,
    color=INK,
) -> float:
    lines = wrap_text(c, text, width, font_name, font_size)
    set_font(c, font_name, font_size, color)
    text_obj = c.beginText(x, y)
    text_obj.setLeading(leading)
    for line in lines:
        text_obj.textLine(line)
    c.drawText(text_obj)
    return y - leading * len(lines)


def fit_wrapped_text(
    c: canvas.Canvas,
    text: str,
    width: float,
    height: float,
    font_name: str = "Arial",
    start_size: int = 11,
    min_size: int = 7,
) -> tuple[int, int, list[str]]:
    for font_size in range(start_size, min_size - 1, -1):
        leading = font_size + 3
        lines = wrap_text(c, text, width, font_name, font_size)
        if len(lines) * leading <= height:
            return font_size, leading, lines
    final_size = min_size
    final_leading = min_size + 3
    return final_size, final_leading, wrap_text(c, text, width, font_name, final_size)


def draw_wrapped_text_box(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    text: str,
    font_name: str = "Arial",
    start_size: int = 11,
    min_size: int = 7,
    color=INK,
) -> None:
    font_size, leading, lines = fit_wrapped_text(c, text, width, height, font_name, start_size, min_size)
    set_font(c, font_name, font_size, color)
    text_obj = c.beginText(x, y)
    text_obj.setLeading(leading)
    for line in lines:
        text_obj.textLine(line)
    c.drawText(text_obj)


def draw_section_title(c: canvas.Canvas, x: float, y: float, title: str) -> float:
    set_font(c, "Arial-Bold", 16, NAVY)
    c.drawString(x, y, title)
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(x, y - 4, x + 28 * mm, y - 4)
    return y - 8 * mm


def draw_bullet_list(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    items: list[str],
    font_size: int = 11,
    text_color=INK,
    bullet_color=RED,
) -> float:
    for item in items:
        set_font(c, "Arial-Bold", font_size, bullet_color)
        c.drawString(x, y, "•")
        y = draw_wrapped_text(c, x + 6 * mm, y, width - 6 * mm, item, "Arial", font_size, font_size + 4, text_color) - 4
    return y


def draw_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str, body: str, accent=GREEN) -> None:
    c.setFillColor(SURFACE)
    c.roundRect(x, y - h, w, h, 8 * mm, fill=1, stroke=0)
    c.setFillColor(accent)
    c.roundRect(x, y - 10 * mm, w, 10 * mm, 8 * mm, fill=1, stroke=0)
    draw_wrapped_text_box(c, x + 6 * mm, y - 4.5 * mm, w - 12 * mm, 6 * mm, title, "Arial-Bold", 12, 8, WHITE)
    draw_wrapped_text_box(c, x + 6 * mm, y - 18 * mm, w - 12 * mm, h - 20 * mm, body, "Arial", 10, 7, INK)


def draw_flow_box(c: canvas.Canvas, x: float, y: float, w: float, h: float, text: str, fill_color) -> None:
    c.setFillColor(fill_color)
    c.roundRect(x, y - h, w, h, 6 * mm, fill=1, stroke=0)
    draw_wrapped_text_box(c, x + 5 * mm, y - 8 * mm, w - 10 * mm, h - 6 * mm, text, "Arial-Bold", 10, 7, WHITE)


def draw_arrow(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float, color=NAVY) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(1.8)
    c.line(x1, y1, x2, y2)
    if abs(x2 - x1) >= abs(y2 - y1):
        direction = 1 if x2 >= x1 else -1
        c.line(x2, y2, x2 - 6 * direction, y2 + 3)
        c.line(x2, y2, x2 - 6 * direction, y2 - 3)
    else:
        direction = 1 if y2 >= y1 else -1
        c.line(x2, y2, x2 - 3, y2 - 6 * direction)
        c.line(x2, y2, x2 + 3, y2 - 6 * direction)


def draw_table(
    c: canvas.Canvas,
    x: float,
    y: float,
    col_widths: list[float],
    row_height: float,
    headers: list[str],
    rows: list[list[str]],
) -> None:
    total_width = sum(col_widths)
    c.setFillColor(NAVY)
    c.rect(x, y - row_height, total_width, row_height, fill=1, stroke=0)
    cursor_x = x
    for idx, header in enumerate(headers):
        set_font(c, "Arial-Bold", 9, WHITE)
        c.drawString(cursor_x + 3 * mm, y - 7 * mm, header)
        cursor_x += col_widths[idx]

    current_y = y - row_height
    fills = [WHITE, SURFACE]
    for r_idx, row in enumerate(rows):
        fill = fills[r_idx % 2]
        c.setFillColor(fill)
        c.rect(x, current_y - row_height, total_width, row_height, fill=1, stroke=0)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.rect(x, current_y - row_height, total_width, row_height, fill=0, stroke=1)

        cursor_x = x
        for idx, cell in enumerate(row):
            cell_width = col_widths[idx]
            draw_wrapped_text_box(c, cursor_x + 3 * mm, current_y - 4.5 * mm, cell_width - 6 * mm, row_height - 3 * mm, cell, "Arial", 8, 6, INK)
            c.line(cursor_x, current_y, cursor_x, current_y - row_height)
            cursor_x += cell_width
        c.line(x + total_width, current_y, x + total_width, current_y - row_height)
        current_y -= row_height


def page_cover(c: canvas.Canvas) -> None:
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.circle(PAGE_WIDTH - 42 * mm, PAGE_HEIGHT - 34 * mm, 34 * mm, fill=1, stroke=0)
    c.setFillColor(RED)
    c.circle(PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 66 * mm, 20 * mm, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.circle(26 * mm, 34 * mm, 18 * mm, fill=1, stroke=0)

    set_font(c, "Arial-Bold", 30, WHITE)
    c.drawString(22 * mm, PAGE_HEIGHT - 42 * mm, "VB Tippverseny 2026")
    set_font(c, "Arial", 16, colors.HexColor("#DCE7F5"))
    c.drawString(22 * mm, PAGE_HEIGHT - 54 * mm, "Projektterv PDF – architektúra, folyamatok, UI minták és API ajánlások")

    c.setFillColor(WHITE)
    c.roundRect(22 * mm, PAGE_HEIGHT - 138 * mm, 116 * mm, 62 * mm, 8 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 14, NAVY)
    c.drawString(30 * mm, PAGE_HEIGHT - 92 * mm, "Projektcél")
    draw_wrapped_text(
        c,
        30 * mm,
        PAGE_HEIGHT - 102 * mm,
        100 * mm,
        "Webes, később mobilra is telepíthető tippjáték, ahol a baráti kör ligákban tippel a 2026-os labdarúgó-világbajnokság meccseire.",
        "Arial",
        10,
        13,
        INK,
    )

    c.setFillColor(colors.HexColor("#112844"))
    c.roundRect(146 * mm, PAGE_HEIGHT - 138 * mm, 110 * mm, 62 * mm, 8 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 13, WHITE)
    c.drawString(154 * mm, PAGE_HEIGHT - 92 * mm, "Alapadatok")
    draw_bullet_list(
        c,
        154 * mm,
        PAGE_HEIGHT - 104 * mm,
        94 * mm,
        [
            "Nyitómeccs: 2026. június 11.",
            "Döntő: 2026. július 19.",
            "Formátum: 48 csapat, 104 mérkőzés.",
        ],
        10,
        text_color=colors.HexColor("#EAF4FF"),
        bullet_color=GOLD,
    )

    y = PAGE_HEIGHT - 162 * mm
    set_font(c, "Arial-Bold", 17, WHITE)
    c.drawString(22 * mm, y, "Mi kerüljön az első verzióba?")
    y -= 9 * mm
    draw_bullet_list(
        c,
        22 * mm,
        y,
        230 * mm,
        [
            "Superadmin liga- és meghívókezelés.",
            "Több ligás részvétel egyetlen felhasználói fiókkal.",
            "Első ligából automatikusan átvett tippek, ligánként felülírható módon.",
            "Tippleadás zárolása a kezdés előtt 15 perccel, szerveroldali ellenőrzéssel.",
            "Pontozás: 3 pontos telitalálat, beleértve a pontos döntetlent is; 2 pont a helyes gólkülönbségért vagy a nem pontos döntetlenért.",
            "Az egyenes kiesésben is csak a rendes játékidő számít; hosszabbítás és tizenegyespárbaj nem.",
        ],
        11,
        text_color=WHITE,
        bullet_color=GOLD,
    )

    set_font(c, "Arial", 10, colors.HexColor("#C5D6EA"))
    c.drawString(22 * mm, 16 * mm, "Forrásellenőrzés: FIFA, football-data.org, API-Football, OpenLigaDB, TheSportsDB")


def page_architecture(c: canvas.Canvas) -> None:
    draw_page_background(c, 2, "Technikai követelmények", "Javasolt stack és rendszerarchitektúra")
    left_x = 18 * mm
    top_y = PAGE_HEIGHT - 46 * mm

    y = draw_section_title(c, left_x, top_y, "Ajánlott stack")
    y = draw_bullet_list(
        c,
        left_x,
        y,
        92 * mm,
        [
            "Next.js App Router + TypeScript a teljes webes alkalmazáshoz.",
            "Tailwind CSS és saját vagy shadcn/ui komponensrendszer a modern felülethez.",
            "Auth.js a bejelentkezéshez és sessionkezeléshez.",
            "Prisma + PostgreSQL a felhasználók, ligák, meccsek és tippek tárolásához.",
            "Resend vagy Postmark az emailes meghívókhoz.",
            "PWA induláskor, Capacitor később Android és iOS csomagoláshoz.",
        ],
    )

    y -= 4 * mm
    y = draw_section_title(c, left_x, y, "Szükséges szoftverek")
    draw_bullet_list(
        c,
        left_x,
        y,
        92 * mm,
        [
            "Git és GitHub vagy GitLab repository.",
            "Node.js LTS és pnpm.",
            "VS Code.",
            "Postman vagy Bruno az API teszteléshez.",
            "Android Studio, illetve iOS buildhez macOS és Xcode.",
        ],
    )

    right_x = 124 * mm
    set_font(c, "Arial-Bold", 16, NAVY)
    c.drawString(right_x, PAGE_HEIGHT - 56 * mm, "Rendszerkép")

    draw_flow_box(c, right_x, PAGE_HEIGHT - 74 * mm, 44 * mm, 18 * mm, "Web és PWA kliens", NAVY)
    draw_flow_box(c, right_x, PAGE_HEIGHT - 110 * mm, 44 * mm, 18 * mm, "Next.js szerver", GREEN)
    draw_flow_box(c, right_x - 54 * mm, PAGE_HEIGHT - 146 * mm, 44 * mm, 18 * mm, "PostgreSQL", RED)
    draw_flow_box(c, right_x, PAGE_HEIGHT - 146 * mm, 44 * mm, 18 * mm, "Email szolgáltató", NAVY)
    draw_flow_box(c, right_x + 54 * mm, PAGE_HEIGHT - 146 * mm, 44 * mm, 18 * mm, "Sport API", GREEN)
    draw_flow_box(c, right_x, PAGE_HEIGHT - 182 * mm, 44 * mm, 18 * mm, "Cron / Sync worker", RED)

    draw_arrow(c, right_x + 22 * mm, PAGE_HEIGHT - 92 * mm, right_x + 22 * mm, PAGE_HEIGHT - 110 * mm)
    draw_arrow(c, right_x + 22 * mm, PAGE_HEIGHT - 128 * mm, right_x - 32 * mm, PAGE_HEIGHT - 146 * mm + 4 * mm)
    draw_arrow(c, right_x + 22 * mm, PAGE_HEIGHT - 128 * mm, right_x + 22 * mm, PAGE_HEIGHT - 146 * mm + 4 * mm)
    draw_arrow(c, right_x + 22 * mm, PAGE_HEIGHT - 128 * mm, right_x + 76 * mm, PAGE_HEIGHT - 146 * mm + 4 * mm)
    draw_arrow(c, right_x + 22 * mm, PAGE_HEIGHT - 164 * mm, right_x + 22 * mm, PAGE_HEIGHT - 182 * mm + 4 * mm)

    draw_card(
        c,
        118 * mm,
        82 * mm,
        70 * mm,
        28 * mm,
        "Mi maradjon Next.js-ben?",
        "Landing oldal, auth, ligakezelés, meccslista, tippleadás, leaderboard, admin felületek és szerver oldali API logika.",
        accent=GOLD,
    )
    draw_card(
        c,
        192 * mm,
        82 * mm,
        70 * mm,
        28 * mm,
        "Mi legyen külső szolgáltatás?",
        "Adatbázis, email, külső sportadat API és időzített szinkronizálás. A kliens soha ne hívja közvetlenül a sport API-kat.",
        accent=RED,
    )


def page_domain_flow(c: canvas.Canvas) -> None:
    draw_page_background(c, 3, "Működési folyamat", "Liga, meghívó, tippek, zárolás és pontozás")
    set_font(c, "Arial-Bold", 16, NAVY)
    c.drawString(18 * mm, PAGE_HEIGHT - 52 * mm, "Fő üzleti folyamat")

    box_y = PAGE_HEIGHT - 74 * mm
    box_w = 38 * mm
    box_h = 16 * mm
    gap = 8 * mm
    steps = [
        ("Liga létrehozás", NAVY),
        ("Email meghívó", GREEN),
        ("Belépés a ligába", RED),
        ("Tipp leadása", NAVY),
        ("Automatikus másolás", GREEN),
        ("15 perces zárolás", RED),
    ]
    x = 18 * mm
    centers = []
    for label, color in steps:
        draw_flow_box(c, x, box_y, box_w, box_h, label, color)
        centers.append((x + box_w, box_y - box_h / 2))
        x += box_w + gap
    for idx in range(len(centers) - 1):
        draw_arrow(c, centers[idx][0], centers[idx][1], centers[idx + 1][0] - box_w, centers[idx + 1][1])

    draw_flow_box(c, 70 * mm, PAGE_HEIGHT - 114 * mm, 56 * mm, 18 * mm, "Eredményfrissítés külső API-ból", GREEN)
    draw_flow_box(c, 140 * mm, PAGE_HEIGHT - 114 * mm, 46 * mm, 18 * mm, "Pontszámítás", NAVY)
    draw_flow_box(c, 198 * mm, PAGE_HEIGHT - 114 * mm, 48 * mm, 18 * mm, "Leaderboard frissítés", RED)
    draw_arrow(c, 126 * mm, PAGE_HEIGHT - 123 * mm, 140 * mm, PAGE_HEIGHT - 123 * mm)
    draw_arrow(c, 186 * mm, PAGE_HEIGHT - 123 * mm, 198 * mm, PAGE_HEIGHT - 123 * mm)

    y = draw_section_title(c, 18 * mm, PAGE_HEIGHT - 138 * mm, "Kulcslogika")
    draw_bullet_list(
        c,
        18 * mm,
        y,
        116 * mm,
        [
            "Minden felhasználónak ligánként külön Prediction rekordja van.",
            "Az első aktív ligában megadott tipp számít alap tippnek.",
            "Más ligákban a rendszer csak akkor másolja át automatikusan, ha még nincs kézi felülírás.",
            "Szerveroldali szabály: lockAt = kickoffAt - 15 perc.",
            "A kezdéshez közeli mentéseket a backendnek kell elutasítania, nem elég frontenden tiltani.",
        ],
    )

    y2 = draw_section_title(c, 144 * mm, PAGE_HEIGHT - 138 * mm, "Pontozási elv")
    draw_card(
        c,
        144 * mm,
        y2,
        108 * mm,
        28 * mm,
        "Pontszabály összefoglaló",
        "3 pont: pontos eredmény, beleértve a pontos döntetlent is. 2 pont: helyes végkimenetel és gólkülönbség, vagy helyes, de nem pontos döntetlen. 1 pont: csak a helyes végkimenetel. Részletes példák a következő oldalon.",
        accent=GREEN,
    )


def page_scoring(c: canvas.Canvas) -> None:
    draw_page_background(c, 4, "Pontozás", "Példák és értelmezés")
    draw_card(
        c,
        18 * mm,
        PAGE_HEIGHT - 52 * mm,
        110 * mm,
        34 * mm,
        "Pontozási szabályrendszer",
        "3 pont jár a teljesen pontos eredményért, tehát a pontos döntetlenért is. 2 pont jár akkor, ha a végkimenetel és a gólkülönbség is stimmel, valamint akkor is, ha döntetlen lett a meccs és a tipp is döntetlen, de nem ugyanazzal az eredménnyel. 1 pont jár a helyes végkimenetelért. Minden más eset 0 pont.",
        accent=GREEN,
    )
    draw_card(
        c,
        134 * mm,
        PAGE_HEIGHT - 52 * mm,
        116 * mm,
        34 * mm,
        "Kieséses szakasz szabály",
        "Az egyenes kieséses meccseknél csak a rendes játékidő eredményét kell figyelembe venni. A 2x15 perces hosszabbítás és a tizenegyespárbaj nem számít bele a tipp kiértékelésébe.",
        accent=NAVY,
    )
    draw_table(
        c,
        18 * mm,
        PAGE_HEIGHT - 96 * mm,
        [34 * mm, 34 * mm, 20 * mm, 156 * mm],
        16 * mm,
        ["Valós eredmény", "Tipp", "Pont", "Magyarázat"],
        [
            ["2–1", "2–1", "3", "Telitalálat: a hazai és a vendég gólok száma is pontos."],
            ["3–1", "2–0", "2", "A végkimenetel és a gólkülönbség is megegyezik."],
            ["2–2", "2–2", "3", "Pontos döntetlen, ezért ez is teljes értékű telitalálat."],
            ["1–1", "0–0", "2", "Döntetlen lett a meccs, és a tipp is döntetlen, csak nem pontos eredménnyel."],
            ["2–1", "1–0", "1", "A győztes stimmel, de a gólkülönbség már nem."],
            ["1–2", "2–1", "0", "Rosszul eltalált végkimenetel."],
        ],
    )
    draw_card(
        c,
        18 * mm,
        56 * mm,
        232 * mm,
        22 * mm,
        "Példa kieséses meccsre",
        "Ha a rendes játékidő 1–1, majd hosszabbításban vagy tizenegyesekkel dől el a továbbjutás, akkor a tippjáték hivatalos eredménye továbbra is 1–1.",
        accent=RED,
    )


def page_roadmap(c: canvas.Canvas) -> None:
    draw_page_background(c, 5, "Megvalósítási lépések", "Fázisok, sprintlogika és Git munkarend")
    set_font(c, "Arial-Bold", 16, NAVY)
    c.drawString(18 * mm, PAGE_HEIGHT - 52 * mm, "Javasolt megvalósítási sorrend")

    phases = [
        ("0", "Alapok", "Git repo, Next.js scaffold, Tailwind, lint, build, CI."),
        ("1", "Auth és user", "Bejelentkezés, session, szerepkörök, meghívó elfogadása."),
        ("2", "Liga modul", "Liga létrehozás, tagság, meghívók küldése emailben."),
        ("3", "Meccsadatok", "VB menetrend import, csapatok, kickoff idők, időzóna-kezelés."),
        ("4", "Tippelés", "Meccslista, tippoldal, auto-copy, override, 15 perces lock."),
        ("5", "Pontozás", "Eredmény sync, pontszámítás, leaderboard, audit log."),
        ("6", "Mobil és indulás", "PWA, finomhangolás, tesztelés, deploy, később Capacitor."),
    ]

    columns = [
        (18 * mm, phases[:4]),
        (92 * mm, phases[4:]),
    ]
    start_y = PAGE_HEIGHT - 72 * mm
    for col_x, items in columns:
        for idx, (num, title, desc) in enumerate(items):
            accent = [NAVY, GREEN, RED][idx % 3]
            row_y = start_y - idx * 28 * mm
            c.setFillColor(accent)
            c.circle(col_x + 8 * mm, row_y, 7 * mm, fill=1, stroke=0)
            set_font(c, "Arial-Bold", 11, WHITE)
            c.drawCentredString(col_x + 8 * mm, row_y - 4, num)
            draw_card(c, col_x + 18 * mm, row_y + 8 * mm, 54 * mm, 20 * mm, title, desc, accent=accent)

    set_font(c, "Arial-Bold", 16, NAVY)
    c.drawString(150 * mm, PAGE_HEIGHT - 52 * mm, "Git munkarend")
    draw_bullet_list(
        c,
        150 * mm,
        PAGE_HEIGHT - 64 * mm,
        100 * mm,
        [
            "main: stabil ág.",
            "develop: integrációs ág.",
            "feature/...: új funkciók.",
            "fix/...: hibajavítások.",
            "Minden merge előtt lint, typecheck és build fusson le.",
            "Ajánlott commitstílus: feat:, fix:, docs:, chore:.",
        ],
    )

    draw_card(
        c,
        150 * mm,
        92 * mm,
        98 * mm,
        34 * mm,
        "Indulási tanács",
        "Érdemes először web + PWA verziót élesíteni. A natív mobilcsomagolás csak akkor jöjjön, amikor a játékszabályok, a sync és a leaderboard már stabil.",
        accent=GOLD,
    )


def draw_ui_browser(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    c.setFillColor(SURFACE)
    c.roundRect(x, y - h, w, h, 8 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.roundRect(x, y - 12 * mm, w, 12 * mm, 8 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 11, WHITE)
    c.drawString(x + 5 * mm, y - 7.5 * mm, "Tippverseny dashboard")

    c.setFillColor(GREEN)
    c.roundRect(x + 6 * mm, y - 30 * mm, 60 * mm, 20 * mm, 5 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 12, WHITE)
    c.drawString(x + 10 * mm, y - 18 * mm, "USA – Paraguay")
    set_font(c, "Arial", 9, colors.HexColor("#D7F4EA"))
    c.drawString(x + 10 * mm, y - 25 * mm, "Következő meccs • zárás 15 perc múlva")

    c.setFillColor(WHITE)
    c.roundRect(x + 72 * mm, y - 30 * mm, 42 * mm, 20 * mm, 5 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 18, NAVY)
    c.drawString(x + 80 * mm, y - 20 * mm, "2.")
    set_font(c, "Arial", 9, MUTED)
    c.drawString(x + 80 * mm, y - 27 * mm, "helyezés")

    card_y = y - 40 * mm
    for label, left, right, note in [
        ("Brazília – Marokkó", "2", "0", "automatikus másolás aktív"),
        ("Németország – Curaçao", "3", "1", "egy ligában felülírva"),
    ]:
        c.setFillColor(WHITE)
        c.roundRect(x + 6 * mm, card_y - 16 * mm, w - 12 * mm, 16 * mm, 4 * mm, fill=1, stroke=0)
        set_font(c, "Arial-Bold", 11, NAVY)
        c.drawString(x + 10 * mm, card_y - 6 * mm, label)
        set_font(c, "Arial", 8, MUTED)
        c.drawString(x + 10 * mm, card_y - 12 * mm, note)
        c.setFillColor(colors.HexColor("#EDF2F7"))
        c.roundRect(x + w - 32 * mm, card_y - 12 * mm, 10 * mm, 8 * mm, 2 * mm, fill=1, stroke=0)
        c.roundRect(x + w - 20 * mm, card_y - 12 * mm, 10 * mm, 8 * mm, 2 * mm, fill=1, stroke=0)
        set_font(c, "Arial-Bold", 10, NAVY)
        c.drawCentredString(x + w - 27 * mm, card_y - 7.2 * mm, left)
        c.drawCentredString(x + w - 15 * mm, card_y - 7.2 * mm, right)
        card_y -= 20 * mm


def draw_ui_mobile(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    c.setFillColor(NAVY)
    c.roundRect(x, y - h, w, h, 10 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#29496F"))
    c.roundRect(x + 24 * mm, y - 7 * mm, 18 * mm, 2.5 * mm, 1.2 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 10, colors.HexColor("#C9DDF3"))
    c.drawString(x + 8 * mm, y - 18 * mm, "Group A")
    set_font(c, "Arial-Bold", 13, WHITE)
    c.drawString(x + 8 * mm, y - 27 * mm, "Mexikó – Dél-Afrika")
    set_font(c, "Arial", 8, colors.HexColor("#9FC3E6"))
    c.drawString(x + 8 * mm, y - 34 * mm, "Lock: 14 perc")

    c.setFillColor(WHITE)
    c.roundRect(x + 8 * mm, y - 54 * mm, 12 * mm, 12 * mm, 3 * mm, fill=1, stroke=0)
    c.roundRect(x + 24 * mm, y - 54 * mm, 12 * mm, 12 * mm, 3 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 14, NAVY)
    c.drawCentredString(x + 14 * mm, y - 46.5 * mm, "1")
    c.drawCentredString(x + 30 * mm, y - 46.5 * mm, "0")

    c.setFillColor(GREEN)
    c.roundRect(x + 8 * mm, y - 71 * mm, 28 * mm, 10 * mm, 4 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 9, WHITE)
    c.drawCentredString(x + 22 * mm, y - 64.8 * mm, "Mentve")

    c.setFillColor(colors.HexColor("#18395E"))
    c.roundRect(x + 8 * mm, y - 86 * mm, 44 * mm, 12 * mm, 4 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 8, WHITE)
    c.drawString(x + 11 * mm, y - 79 * mm, "Auto-copy: 2 liga")

    c.setFillColor(WHITE)
    c.roundRect(x + 8 * mm, y - 104 * mm, 44 * mm, 16 * mm, 4 * mm, fill=1, stroke=0)
    set_font(c, "Arial", 8, MUTED)
    c.drawString(x + 11 * mm, y - 94 * mm, "Pontozás")
    set_font(c, "Arial-Bold", 8, NAVY)
    c.drawString(x + 11 * mm, y - 100 * mm, "3 exact • 2 diff / nem exact X")


def page_ui(c: canvas.Canvas) -> None:
    draw_page_background(c, 6, "UI minták", "Kezdő irány webes és mobil felületekhez")
    draw_wrapped_text(
        c,
        18 * mm,
        PAGE_HEIGHT - 52 * mm,
        240 * mm,
        "A cél egy modern, sportos, mégis letisztult felület. A színek utalhatnak a világbajnokság hangulatára, de érdemes kerülni a hivatalos FIFA logók és védett arculati elemek használatát.",
        "Arial",
        11,
        14,
        INK,
    )

    draw_ui_browser(c, 18 * mm, PAGE_HEIGHT - 72 * mm, 132 * mm, 94 * mm)
    draw_ui_mobile(c, 162 * mm, PAGE_HEIGHT - 72 * mm, 60 * mm, 118 * mm)

    draw_card(
        c,
        18 * mm,
        76 * mm,
        72 * mm,
        30 * mm,
        "Ajánlott színek",
        "Mély navy: #0B1F3A, stadionzöld: #127A5A, élénk piros: #D93A2F, arany akcentus: #F4C95D, világos háttér: #F5F8FB.",
        accent=GOLD,
    )
    draw_card(
        c,
        94 * mm,
        76 * mm,
        72 * mm,
        30 * mm,
        "Fő képernyők",
        "Dashboard, tippelési oldal, liga ranglista, admin felület és meghívókezelés. A lock állapot mindenhol legyen egyértelmű.",
        accent=GREEN,
    )
    draw_card(
        c,
        170 * mm,
        76 * mm,
        74 * mm,
        30 * mm,
        "UX irányelvek",
        "Gyors mentési visszajelzés, helyi időzónás kezdési idő, mobilon egykezes tippleadás, leaderboardon átlátható pontmagyarázat.",
        accent=RED,
    )


def page_apis(c: canvas.Canvas) -> None:
    draw_page_background(c, 7, "API lehetőségek", "Ingyenes vagy részben ingyenes adatforrások")
    draw_wrapped_text(
        c,
        18 * mm,
        PAGE_HEIGHT - 52 * mm,
        240 * mm,
        "Az összehasonlítás 2026. április 22-én ellenőrzött forrásokra épül. A livescore, a rate limit és a hozzáférési modell szolgáltatónként eltérhet, ezért érdemes legalább egy elsődleges és egy fallback forrást betervezni.",
        "Arial",
        10,
        13,
        INK,
    )

    draw_table(
        c,
        18 * mm,
        PAGE_HEIGHT - 68 * mm,
        [34 * mm, 24 * mm, 24 * mm, 24 * mm, 24 * mm, 72 * mm],
        13 * mm,
        ["API", "Free", "Menetrend", "Eredmény", "Livescore", "Megjegyzés"],
        [
            ["API-Football", "Igen", "Igen", "Igen", "Igen", "Free csomagban 100 kérés/nap; a coverage oldal szerint a World Cup is elérhető."],
            ["football-data.org", "Igen", "Igen", "Igen", "Nem a free-ben", "A Worldcup szerepel a free tierben, de a score és a schedule késleltetett."],
            ["OpenLigaDB", "Igen", "Igen", "Igen", "Részben", "Nyilvános, közösségi adatforrás; a főoldalon jelenleg a WM 2026 is látható."],
            ["TheSportsDB", "Igen", "Igen", "Igen", "Nem free-ben", "A dokumentáció szerint a free kulcs: 123, a livescore és a V2 inkább premium."],
            ["worldcupjson.net", "Igen", "Igen", "Igen", "Igen", "Valós idejűként hirdeti magát, de maga az oldal is jelzi, hogy nincs garancia a pontosságra."],
        ],
    )

    draw_card(
        c,
        18 * mm,
        48 * mm,
        70 * mm,
        28 * mm,
        "Ajánlott indulás",
        "Menetrend seedelésre football-data.org, eredményfrissítésre API-Football vagy OpenLigaDB. Minden külső választ adatbázisba cache-elj.",
        accent=GREEN,
    )
    draw_card(
        c,
        92 * mm,
        48 * mm,
        70 * mm,
        28 * mm,
        "Cache stratégia",
        "Aktív meccsnél 1–3 perces polling, egyébként ritkább szinkron. A kliens csak a saját backendből kérdezzen, ne közvetlenül az API-ból.",
        accent=NAVY,
    )
    draw_card(
        c,
        166 * mm,
        48 * mm,
        78 * mm,
        28 * mm,
        "Ellenőrzött források",
        "FIFA, football-data.org, API-Football, OpenLigaDB, TheSportsDB és worldcupjson.net. Ezeket a dokumentációban is hivatkozásként érdemes megtartani.",
        accent=RED,
    )


def build_pdf() -> Path:
    register_fonts()
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=landscape(A4))
    c.setTitle("VB Tippverseny 2026 – projektterv")
    c.setAuthor("OpenAI Codex")
    c.setSubject("Projektterv, flowchartok, UI minták és API ajánlások")

    page_cover(c)
    c.showPage()

    page_architecture(c)
    c.showPage()

    page_domain_flow(c)
    c.showPage()

    page_scoring(c)
    c.showPage()

    page_roadmap(c)
    c.showPage()

    page_ui(c)
    c.showPage()

    page_apis(c)
    c.showPage()

    c.save()
    return OUTPUT_PATH


if __name__ == "__main__":
    output = build_pdf()
    print(output)
