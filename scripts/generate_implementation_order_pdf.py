from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
OUTPUT_PATH = DOCS_DIR / "VB-Tippverseny-2026-implementalasi-sorrend.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 18 * mm
TOP_Y = PAGE_HEIGHT - 24 * mm
BOTTOM_Y = 18 * mm

NAVY = colors.HexColor("#0B1F3A")
GREEN = colors.HexColor("#127A5A")
RED = colors.HexColor("#D93A2F")
GOLD = colors.HexColor("#F4C95D")
INK = colors.HexColor("#172638")
MUTED = colors.HexColor("#556476")
SURFACE = colors.HexColor("#F5F8FB")
LINE = colors.HexColor("#D6E0EA")
WHITE = colors.white


ITEMS = [
    ("Repo és alapok", "Hozd létre a Git repót és az alap projektstruktúrát. Ide tartozik a Next.js + TypeScript + Tailwind, az ESLint, a formatter, a .env kezelés és az alap README."),
    ("Adatbázis és Prisma", "Kösd be az adatbázist és készítsd el a Prisma sémát. Először az alap entitások kellenek: User, League, LeagueMembership, Invitation, Team, Match, Prediction, ScoreEntry."),
    ("Autentikáció", "Építsd meg a bejelentkezést, a sessionkezelést és a szerepkör-ellenőrzést, különösen a superadmin jogosultságot."),
    ("Superadmin felület", "Készítsd el a superadmin alapfelületét, ahol új ligát tud létrehozni, ligát szerkeszteni és látja a tagokat."),
    ("Meghívásos belépés", "Készítsd el az emailes meghívó küldést, a tokenkezelést, a meghívó elfogadását és a ligához csatlakozást."),
    ("VB meccsek importja", "Importáld a vb csapatait és meccseit külső API-ból. Először csak a meccsnaptár és a kickoff idők kellenek."),
    ("Időkezelés", "A meccsek időpontját UTC-ben tárold, a megjelenítést pedig a felhasználó időzónájához igazítsd."),
    ("Tippelési adatmodell", "Készítsd el a Prediction alaplogikát: egy felhasználó egy meccsre, egy ligában egy tippet tudjon leadni."),
    ("15 perces zárolás", "Implementáld a lock szabályt frontend visszajelzéssel és backend tiltással is. A backend legyen a végső igazság."),
    ("Automatikus tippmásolás", "Az első ligában leadott tipp legyen az alap, és másolódjon át a többi ligába, ha ott még nincs egyedi tipp."),
    ("Ligánkénti felülírás", "Tedd lehetővé, hogy a felhasználó ugyanarra a meccsre más ligában eltérő tippet adhasson."),
    ("Tippelési UI", "Építsd meg a meccslista és a tippleadási felületet. Jól látszódjon a kezdési idő, a lock állapot, a mentés és az auto-copy."),
    ("Eredményfrissítés", "Kösd be az eredményfrissítést külső API-ból. Első körben a végleges eredményimport is elég."),
    ("Pontszámítás", "Implementáld a pontozási logikát: 3 pont a pontos eredményért, beleértve a pontos döntetlent is; 2 pont a helyes gólkülönbségért vagy a nem pontos döntetlenért; 1 pont a helyes végkimenetelért."),
    ("Kieséses szabály", "Az egyenes kieséses meccseknél csak a rendes játékidő számít. A hosszabbítás és a tizenegyespárbaj nem számít bele a tipp kiértékelésébe."),
    ("Pontok eltárolása", "Készíts ScoreEntry vagy más aggregált tárolást, hogy ne mindig mindent újraszámolva kelljen megjeleníteni."),
    ("Leaderboard", "Építsd meg a ligánkénti ranglistát pontszámmal, telitalálatok számával és helyezésváltozással."),
    ("Admin sync eszközök", "Legyen kézi újraszinkronizálás, hibás meccs újraszámolása és meghívó újraküldése."),
    ("Automatizált tesztek", "Írj teszteket a kritikus üzleti logikára: pontszámítás, döntetlenek, kieséses szabály, 15 perces lock, auto-copy és override."),
    ("PWA", "Tedd telepíthetővé az alkalmazást manifesttel, ikonokkal és mobilbarát működéssel."),
    ("UX finomítás", "Javítsd a loading állapotokat, hibakezelést, üres állapotokat és a mobil optimalizálást."),
    ("CI/CD", "Állíts be legalább lint, typecheck és build ellenőrzést minden push vagy PR előtt."),
    ("Beta és mobil build", "Deployold a beta verziót egy szűk körnek, és csak stabil web + PWA után csomagold Androidra és iOS-re."),
]


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))


def set_font(c: canvas.Canvas, name: str = "Arial", size: int = 10, color=INK) -> None:
    c.setFont(name, size)
    c.setFillColor(color)


def wrap_text(c: canvas.Canvas, text: str, width: float, font_name: str, font_size: int) -> list[str]:
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


def item_height(c: canvas.Canvas, title: str, body: str, width: float) -> float:
    title_lines = wrap_text(c, title, width, "Arial-Bold", 11)
    body_lines = wrap_text(c, body, width, "Arial", 10)
    return 14 * mm + (len(title_lines) - 1) * 5 * mm + len(body_lines) * 5.2 * mm


def draw_header(c: canvas.Canvas, page_no: int) -> None:
    c.setFillColor(NAVY)
    c.rect(0, PAGE_HEIGHT - 26 * mm, PAGE_WIDTH, 26 * mm, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(PAGE_WIDTH - 46 * mm, PAGE_HEIGHT - 26 * mm, 46 * mm, 26 * mm, fill=1, stroke=0)

    set_font(c, "Arial-Bold", 20, WHITE)
    c.drawString(MARGIN_X, PAGE_HEIGHT - 14 * mm, "VB Tippverseny 2026")
    set_font(c, "Arial", 10, colors.HexColor("#D8E6F5"))
    c.drawString(MARGIN_X, PAGE_HEIGHT - 20 * mm, "Implementálási sorrend – javasolt fejlesztési útiterv")

    set_font(c, "Arial", 9, MUTED)
    c.drawRightString(PAGE_WIDTH - MARGIN_X, 12 * mm, f"{page_no}. oldal")


def draw_intro(c: canvas.Canvas, y: float) -> float:
    c.setFillColor(SURFACE)
    c.roundRect(MARGIN_X, y - 24 * mm, PAGE_WIDTH - 2 * MARGIN_X, 24 * mm, 5 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 12, NAVY)
    c.drawString(MARGIN_X + 5 * mm, y - 8 * mm, "Használati javaslat")
    intro = (
        "Ezt a sorrendet úgy érdemes követni, hogy mindig a stabil alapokra épüljenek a következő funkciók. "
        "Először az adatmodell, a belépés és a liga-kezelés legyen kész, és csak utána jöjjön a tipplogika, "
        "az eredményszinkron és a mobilos csomagolás."
    )
    lines = wrap_text(c, intro, PAGE_WIDTH - 2 * MARGIN_X - 10 * mm, "Arial", 10)
    set_font(c, "Arial", 10, INK)
    text = c.beginText(MARGIN_X + 5 * mm, y - 14 * mm)
    text.setLeading(12)
    for line in lines:
        text.textLine(line)
    c.drawText(text)
    return y - 30 * mm


def draw_item(c: canvas.Canvas, x: float, y: float, idx: int, title: str, body: str, width: float) -> float:
    box_h = item_height(c, title, body, width - 18 * mm)
    c.setFillColor(WHITE)
    c.roundRect(x, y - box_h, width, box_h, 4 * mm, fill=1, stroke=0)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.roundRect(x, y - box_h, width, box_h, 4 * mm, fill=0, stroke=1)

    badge_color = [NAVY, GREEN, RED][(idx - 1) % 3]
    c.setFillColor(badge_color)
    c.circle(x + 8 * mm, y - 8 * mm, 5.5 * mm, fill=1, stroke=0)
    set_font(c, "Arial-Bold", 10, WHITE)
    c.drawCentredString(x + 8 * mm, y - 11 * mm, str(idx))

    title_lines = wrap_text(c, title, width - 24 * mm, "Arial-Bold", 11)
    body_lines = wrap_text(c, body, width - 24 * mm, "Arial", 10)

    set_font(c, "Arial-Bold", 11, NAVY)
    text_y = y - 5.5 * mm
    for line in title_lines:
        c.drawString(x + 16 * mm, text_y, line)
        text_y -= 4.8 * mm

    set_font(c, "Arial", 10, INK)
    for line in body_lines:
        c.drawString(x + 16 * mm, text_y, line)
        text_y -= 4.6 * mm

    return y - box_h - 4 * mm


def build_pdf() -> Path:
    register_fonts()
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=A4)
    c.setTitle("VB Tippverseny 2026 – implementálási sorrend")
    c.setAuthor("OpenAI Codex")
    c.setSubject("Fejlesztési sorrend és implementálási terv")

    page_no = 1
    draw_header(c, page_no)
    y = TOP_Y - 10 * mm
    y = draw_intro(c, y)

    content_width = PAGE_WIDTH - 2 * MARGIN_X
    for idx, (title, body) in enumerate(ITEMS, start=1):
        needed = item_height(c, title, body, content_width - 18 * mm) + 6 * mm
        if y - needed < BOTTOM_Y:
            c.showPage()
            page_no += 1
            draw_header(c, page_no)
            y = TOP_Y - 10 * mm
        y = draw_item(c, MARGIN_X, y, idx, title, body, content_width)

    c.save()
    return OUTPUT_PATH


if __name__ == "__main__":
    output = build_pdf()
    print(output)
