"""
Extrae materias de Libre Elección del buscador público del SIA (UNAL) y las
guarda en un CSV listo para `python manage.py import_courses`.

Basado en la técnica de https://github.com/imlargo/sia-extractor (ese
proyecto lo hace para la sede Medellín, con Go + la librería `rod`; esta
versión usa Python + Playwright para la sede Bogotá). Los selectores CSS y
los nombres de los campos del SIA (Nivel, Sede, Tipología, "Componente de
Libre Elección", etc.) vienen verificados de ese código real — lo que NO
está verificado son los valores exactos de Bogotá en los menús desplegables
(ese proyecto los tiene para Medellín, no para Bogotá). Por eso el modo
--discover existe: corre eso primero.

## Instalación
    pip install playwright beautifulsoup4
    playwright install chromium

## Modo interactivo (recomendado — combina discover + extract)
    python scrape_sia.py

Esto lista las opciones reales de cada desplegable, te pide el texto exacto
en cada paso (con tolerancia a espacios y acentos), y al final TE PREGUNTA
si quieres extraer las materias en la misma sesión. Así no tienes que
copiar y pegar valores a mano entre dos comandos separados.

## Sólo descubrir los valores (modo original)
    python scrape_sia.py --discover

## Extracción directa (cuando ya confirmaste los valores)
    python scrape_sia.py --sede "1101 SEDE BOGOTÁ" --facultad-por "1 SEDE BOGOTÁ" --carrera-por "1CLE COMPONENTE DE LIBRE ELECCIÓN" --out ../docs/cursos_sia_bogota.csv

Luego:
    cd ../backend
    python manage.py import_courses ../docs/cursos_sia_bogota.csv

## Mejoras en esta versión (Sprint 3)
  * **Normalización de espacios**: el SIA usa a veces U+00A0 (espacio
    irrompible) y el usuario copia texto con espacios dobles o tabs —
    ahora se normaliza todo a un solo espacio ASCII antes de comparar.
  * **Fuzzy matching**: si el texto que escribes no coincide EXACTO con
    una opción, se busca la opción más parecida (difflib) y se avisa con
    qué se matcheó. Si la similaridad es muy baja, se listan las opciones
    cercanas para que corras de nuevo.
  * **Modo interactivo por defecto**: una sola sesión lista opciones,
    pide texto y EXTRAe en el mismo flujo — ya no hay que correr dos
    comandos ni copiar valores a mano.
  * **Reintentos y mensajes claros**: si algo falla, te dice exactamente
    qué opción escribir.
"""
import argparse
import csv
import json
import re
import sys
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print("Falta playwright. Instala con: pip install playwright && playwright install chromium")
    sys.exit(1)

SIA_URL = (
    "https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf"
    "?taskflowId=task-flow-AC_CatalogoAsignaturas"
)

# IDs reales de los <select> del formulario (confirmados en sia-extractor,
# el mismo taskflow "AC_CatalogoAsignaturas" para todas las sedes).
SEL_NIVEL = r"#pt1\:r1\:0\:soc1\:\:content"
SEL_SEDE = r"#pt1\:r1\:0\:soc9\:\:content"
SEL_FACULTAD = r"#pt1\:r1\:0\:soc2\:\:content"
SEL_CARRERA = r"#pt1\:r1\:0\:soc3\:\:content"
SEL_TIPOLOGIA = r"#pt1\:r1\:0\:soc4\:\:content"
# Estos 4 solo aparecen cuando Tipología = "LIBRE ELECCIÓN"
SEL_POR = r"#pt1\:r1\:0\:soc5\:\:content"
SEL_SEDE_POR = r"#pt1\:r1\:0\:soc10\:\:content"
SEL_FACULTAD_POR = r"#pt1\:r1\:0\:soc6\:\:content"
SEL_CARRERA_POR = r"#pt1\:r1\:0\:soc7\:\:content"

VALUE_NIVEL = "Pregrado"
VALUE_TIPOLOGIA_LIBRE_ELECCION = "LIBRE ELECCIÓN"
VALUE_POR = "Por facultad y plan"

SLEEP_POSTBACK = 3.0  # el ADF del SIA tarda en re-renderizar tras cada selección

# Heurística facultad -> etiqueta de interés (para alimentar el recomendador).
# Es una inferencia simple, no un dato oficial del SIA — ajústala si quieres.
FACULTAD_TAGS = {
    "ARTES": "Arte",
    "DERECHO": "Política",
    "CIENCIAS HUMANAS": "Historia",
    "CIENCIAS ECONÓMICAS": "Economía",
    "MEDICINA": "Salud",
    "ENFERMERÍA": "Salud",
    "ODONTOLOGÍA": "Salud",
    "CIENCIAS": "Ciencia",
    "AGRARIAS": "Medio Ambiente",
    "INGENIERÍA": "Tecnología",
}


# ──────────────────────────────────────────────────────────────────────────
# Normalización de texto — clave para que el match no falle por espacios
# irrompibles (U+00A0), tabs, espacios dobles, o diferencias de acentos.
# ──────────────────────────────────────────────────────────────────────────

def normalize_text(s: str) -> str:
    """Normaliza un texto para comparación robusta.

    1. Reemplaza espacios irrompibles y similares por espacio ASCII.
    2. Reemplaza tabs y saltos de línea por espacio.
    3. Colapsa múltiples espacios en uno.
    4. Quita espacios al inicio y final.
    5. Normaliza unicode a NFC (forma canónica compuesta).
    """
    if not s:
        return ""
    # Reemplazar espacios especiales comunes en HTML/SIA
    s = s.replace("\u00a0", " ")   # NO-BREAK SPACE (el más común en el SIA)
    s = s.replace("\u202f", " ")   # NARROW NO-BREAK SPACE
    s = s.replace("\u2009", " ")   # THIN SPACE
    s = s.replace("\u2007", " ")   # FIGURE SPACE
    s = s.replace("\u200b", "")    # ZERO WIDTH SPACE (no es espacio, lo borra)
    s = s.replace("\t", " ").replace("\r", " ").replace("\n", " ")
    # Normalización unicode (NFC junta combinaciones de acentos)
    s = unicodedata.normalize("NFC", s)
    # Colapsar espacios múltiples
    s = re.sub(r" +", " ", s)
    return s.strip()


def normalize_loose(s: str) -> str:
    """Como normalize_text, pero además quita acentos y pasa a MAYÚSCULAS.
    Útil para una segunda ronda de matching cuando el usuario escribió
    'BOGOTA' sin acento y el SIA muestra 'BOGOTÁ'."""
    s = normalize_text(s)
    # Quitar acentos
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.upper()


# ──────────────────────────────────────────────────────────────────────────
# Fuzzy matching — encuentra la opción real más parecida al input del user
# ──────────────────────────────────────────────────────────────────────────

def find_best_match(user_input: str, options: list[str], min_score: float = 0.6) -> tuple[str | None, float, list[str]]:
    """Busca la opción real que mejor coincide con lo que el usuario escribió.

    Devuelve (mejor_opcion_original, score, sugerencias_cercanas).
    - mejor_opcion_original: el texto EXACTO de la opción del SIA (sin
      normalizar, para que Playwright lo pueda seleccionar). None si no
      hay nada suficientemente parecido.
    - score: 0.0 - 1.0, similaridad de la mejor opción.
    - sugerencias_cercanas: opciones con score >= min_score, por si el
      usuario quiere corregir.

    El matching es en 3 rondas:
      1. Igualdad exacta tras normalize_text (caso común).
      2. Igualdad tras normalize_loose (sin acentos, en mayúsculas).
      3. difflib.SequenceMatcher sobre la versión loose.
    """
    if not options:
        return None, 0.0, []

    norm_input = normalize_text(user_input)
    loose_input = normalize_loose(user_input)

    # Ronda 1: igualdad exacta (normalizada)
    for opt in options:
        if normalize_text(opt) == norm_input:
            return opt, 1.0, []

    # Ronda 2: igualdad loose (sin acentos, mayúsculas)
    for opt in options:
        if normalize_loose(opt) == loose_input:
            return opt, 0.95, []

    # Ronda 3: fuzzy con difflib
    scored = []
    for opt in options:
        ratio = SequenceMatcher(None, loose_input, normalize_loose(opt)).ratio()
        scored.append((opt, ratio))
    scored.sort(key=lambda t: t[1], reverse=True)

    best_opt, best_score = scored[0]
    suggestions = [opt for opt, sc in scored if sc >= min_score]

    if best_score >= min_score:
        return best_opt, best_score, suggestions
    return None, best_score, suggestions


def guess_tag(facultad: str) -> str:
    facultad_upper = (facultad or "").upper()
    for key, tag in FACULTAD_TAGS.items():
        if key in facultad_upper:
            return tag
    return ""


# ──────────────────────────────────────────────────────────────────────────
# Helpers de Playwright
# ──────────────────────────────────────────────────────────────────────────

def wait_until_enabled(page, selector: str, timeout_ms: int = 25000):
    """El SIA deja los <select> con `disabled` puesto mientras el ADF procesa
    el postback parcial anterior (a veces por más de los 3s que se asumía al
    principio). Aquí se espera activamente a que se quite `disabled`, en vez
    de una pausa fija que puede quedarse corta."""
    page.wait_for_function(
        """(sel) => {
            const el = document.querySelector(sel);
            return el && !el.disabled;
        }""",
        arg=selector,
        timeout=timeout_ms,
        polling=200,
    )


def list_options(page, selector: str) -> list[str]:
    page.wait_for_selector(selector, timeout=15000)
    return [
        o.strip()
        for o in page.eval_on_selector_all(f"{selector} option", "els => els.map(e => e.textContent)")
        if o.strip()
    ]


def select_option_smart(page, selector: str, user_input: str, step_name: str) -> str:
    """Selecciona una opción del <select> usando fuzzy matching.

    A diferencia de la versión anterior que llamaba `select_option(label=)`
    directo (y que fallaba al primer espacio raro), esta función:
      1. Lista las opciones reales del select.
      2. Busca la que mejor coincide con `user_input` (ver find_best_match).
      3. Si hay match >= 0.6, selecciona Esa opción (con el texto EXACTO
         que el SIA espera, no el texto del usuario).
      4. Si no hay match, imprime las opciones cercanas y lanza excepción
         para que el usuario sepa qué escribir.

    Devuelve el texto original de la opción seleccionada (útil para
    reusarlo en la fase de extracción).
    """
    options = list_options(page, selector)
    if not options:
        raise PWTimeout(f"{step_name}: no se encontraron opciones en {selector}")

    best, score, suggestions = find_best_match(user_input, options, min_score=0.6)

    if best is None:
        print(f"\n   ✗ {step_name}: '{user_input}' no coincide con ninguna opción (score={score:.2f}).")
        print("     Opciones disponibles:")
        for opt in options:
            print(f"       - {opt}")
        if suggestions:
            print("     Quizás querías una de estas:")
            for s in suggestions:
                print(f"       → {s}")
        raise ValueError(f"{step_name}: input '{user_input}' no matchea ninguna opción")

    if score < 1.0:
        print(f"   ⚠ {step_name}: '{user_input}' no coincide exacto — usando '{best}' (score={score:.2f})")

    # click + select + esperar postback
    wait_until_enabled(page, selector)
    page.click(selector)
    page.select_option(selector, label=best)
    time.sleep(SLEEP_POSTBACK)
    return best


def safe_select(page, selector: str, user_input: str, step_name: str) -> str:
    """Envuelve select_option_smart con mensajes de progreso y captura de
    pantalla si falla."""
    print(f"-> {step_name}: seleccionando '{user_input}'...")
    try:
        result = select_option_smart(page, selector, user_input, step_name)
    except (PWTimeout, ValueError) as e:
        shot = f"error_{re.sub(r'[^a-zA-Z0-9]+', '_', step_name)}.png"
        try:
            page.screenshot(path=shot)
            print(f"   Captura guardada en {shot}.")
        except Exception:
            pass
        print(f"   ERROR: {e}")
        print(f"   Revisa si el texto '{user_input}' coincide EXACTO con una opción real (usa --discover).")
        raise
    print(f"   ✓ ok.")
    return result


# ──────────────────────────────────────────────────────────────────────────
# Parseo del detalle de una asignatura
# ──────────────────────────────────────────────────────────────────────────

def parse_detail(page) -> dict:
    """Extrae los datos del panel de detalle de una asignatura.
    Es el equivalente en Python de src/parser/parser.js del proyecto de
    referencia — mismos selectores, misma estructura de datos."""
    page.wait_for_selector(".af_showDetailHeader_content0", timeout=15000)

    h2 = page.query_selector("h2")
    raw_name = h2.inner_text().strip() if h2 else ""
    m = re.search(r"\(([^)]+)\)", raw_name)
    codigo = m.group(1).strip() if m else ""
    nombre = raw_name.replace(f"({codigo})", "").strip()

    creditos_el = page.query_selector(".detass-creditos span")
    creditos = creditos_el.inner_text().strip() if creditos_el else ""

    facultad_el = page.query_selector(".detass-centro")
    facultad = (facultad_el.inner_text().replace("Facultad: ", "").strip()) if facultad_el else ""

    profesores, horarios_list, prerequisitos = [], [], []
    total_cupos = 0

    bloques = page.query_selector_all(".borde.salto:not(.ficha-docente)")
    for bloque in bloques:
        items = bloque.query_selector_all(".margin-t")
        if len(items) < 2:
            prerequisitos.append(items[0].inner_text().strip() if items else "")
            continue

        datos = items[1].query_selector_all(":scope > *")

        def campo(idx):
            if idx < len(datos):
                t = datos[idx].inner_text()
                return t.split(": ", 1)[1].strip() if ": " in t else t.strip()
            return ""

        profesor = campo(0)
        if profesor:
            profesores.append(profesor)

        cupos_txt = campo(5)
        try:
            total_cupos += int(cupos_txt)
        except ValueError:
            pass

        if len(datos) > 2:
            panel = datos[2].query_selector(".af_panelGroupLayout")
            if panel:
                filas = panel.query_selector_all(":scope > * > *")
                for fila in filas[2:]:
                    txt = fila.inner_text().strip()
                    if txt:
                        horarios_list.append(txt)

    return {
        "codigo": codigo,
        "nombre": nombre,
        "creditos": creditos or "3",
        "facultad": facultad,
        "profesor": profesores[0] if profesores else "",
        "cupos_disponibles": str(total_cupos),
        "cupos_totales": str(total_cupos),
        "horario": ";".join(horarios_list),
        "prerequisitos": ";".join(p for p in prerequisitos if p),
        "modalidad": "virtual" if any("REMOTA" in p.upper() or "VIRTUAL" in p.upper() for p in profesores) else "presencial",
        "dificultad": "Intermedio",
        "descripcion": "",
        "etiquetas": guess_tag(facultad),
        "imagen": "",
    }


# ──────────────────────────────────────────────────────────────────────────
# Fases: discover y extract
# ──────────────────────────────────────────────────────────────────────────

def run_discover(page, want_libre_eleccion: bool) -> dict | None:
    """Fase de descubrimiento — lista opciones y pide al usuario que elija.

    Devuelve un dict con los valores seleccionados (sede, sede_por,
    facultad_por, carrera_por) para que run_extract pueda usarlos sin
    volver a preguntar. Si want_libre_eleccion=False, sólo llega hasta
    Sede/Facultad y devuelve None.
    """
    print("\n=== Nivel ===")
    safe_select(page, SEL_NIVEL, VALUE_NIVEL, "Nivel")

    print("\n=== Opciones de Sede ===")
    sede_options = list_options(page, SEL_SEDE)
    for o in sede_options:
        print("  -", o)

    sede = input("\nEscribe el texto EXACTO de tu sede (ej. 1101 SEDE BOGOTÁ): ").strip()
    sede_selected = safe_select(page, SEL_SEDE, sede, "Sede")

    if not want_libre_eleccion:
        print("\n=== Opciones de Facultad ===")
        for o in list_options(page, SEL_FACULTAD):
            print("  -", o)
        return None

    print("\n=== Opciones de Tipología ===")
    for o in list_options(page, SEL_TIPOLOGIA):
        print("  -", o)
    safe_select(page, SEL_TIPOLOGIA, VALUE_TIPOLOGIA_LIBRE_ELECCION, "Tipología")

    print("\n=== Opciones de 'Por' ===")
    for o in list_options(page, SEL_POR):
        print("  -", o)
    safe_select(page, SEL_POR, VALUE_POR, "Por")

    print("\n=== Opciones de Sede (para Libre Elección) ===")
    sede_por_options = list_options(page, SEL_SEDE_POR)
    for o in sede_por_options:
        print("  -", o)
    sede_por = input("\nEscribe el texto EXACTO (ej. 1101 SEDE BOGOTÁ): ").strip()
    sede_por_selected = safe_select(page, SEL_SEDE_POR, sede_por, "SedePor")

    print("\n=== Opciones de Facultad/Componente (para Libre Elección) ===")
    facultad_por_options = list_options(page, SEL_FACULTAD_POR)
    for o in facultad_por_options:
        print("  -", o)
    facultad_por = input("\nEscribe el texto EXACTO (busca 'COMPONENTE DE LIBRE ELECCIÓN' o similar): ").strip()
    facultad_por_selected = safe_select(page, SEL_FACULTAD_POR, facultad_por, "FacultadPor")

    # CarreraPor — normalmente es el componente de libre elección específico
    print("\n=== Opciones de Plan/Carrera (para Libre Elección) ===")
    carrera_por_options = list_options(page, SEL_CARRERA_POR)
    for o in carrera_por_options:
        print("  -", o)
    carrera_por = input("\nEscribe el texto EXACTO (ej. 1CLE COMPONENTE DE LIBRE ELECCIÓN): ").strip()
    carrera_por_selected = safe_select(page, SEL_CARRERA_POR, carrera_por, "CarreraPor")

    return {
        "sede": sede_selected,
        "sede_por": sede_por_selected,
        "facultad_por": facultad_por_selected,
        "carrera_por": carrera_por_selected,
    }


def run_extract(page, sede: str, facultad_por: str, carrera_por: str, out_path: Path, raw_json_path: Path, sede_por: str | None = None):
    """Fase de extracción — selecciona todo y descarga el catálogo a CSV.

    Si `sede_por` es None, se reutiliza el valor de `sede` (en la mayoría
    de sedes del SIA el valor de SedePor es igual al de Sede).
    """
    if sede_por is None:
        sede_por = sede

    safe_select(page, SEL_NIVEL, VALUE_NIVEL, "Nivel")
    safe_select(page, SEL_SEDE, sede, "Sede")
    safe_select(page, SEL_TIPOLOGIA, VALUE_TIPOLOGIA_LIBRE_ELECCION, "Tipología")
    safe_select(page, SEL_POR, VALUE_POR, "Por")
    safe_select(page, SEL_SEDE_POR, sede_por, "SedePor")
    safe_select(page, SEL_FACULTAD_POR, facultad_por, "FacultadPor")
    safe_select(page, SEL_CARRERA_POR, carrera_por, "CarreraPor")

    print("\nBuscando materias...")
    # El botón de buscar del SIA usa la clase .af_button_link
    page.click(".af_button_link")
    try:
        page.wait_for_selector(".af_table_data-table-VH-lines tbody tr", timeout=20000)
    except PWTimeout:
        page.screenshot(path="error_busqueda.png")
        print("  ✗ No aparecieron resultados. Captura: error_busqueda.png")
        raise
    time.sleep(SLEEP_POSTBACK)

    rows = page.query_selector_all(".af_table_data-table-VH-lines tbody tr")
    total = len(rows)
    print(f"Materias encontradas: {total}")

    if total == 0:
        print("No hay materias para estos filtros. Revisa los valores seleccionados.")
        return

    resultados = []
    for i in range(total):
        # se re-consulta cada vez porque el DOM cambia al entrar/salir del detalle
        rows = page.query_selector_all(".af_table_data-table-VH-lines tbody tr")
        link = rows[i].query_selector(".af_commandLink")
        if not link:
            continue
        link.click()
        try:
            data = parse_detail(page)
            resultados.append(data)
            print(f"  [{i+1}/{total}] {data['codigo']} — {data['nombre']}")
        except PWTimeout:
            page.screenshot(path=f"error_fila_{i+1}.png")
            print(f"  [{i+1}/{total}] no se pudo leer el detalle — ver error_fila_{i+1}.png")
        # Volver al listado — el botón "Volver" del SIA usa .af_button
        try:
            page.click(".af_button")
        except PWTimeout:
            # a veces hay varios botones .af_button y el primero no es "volver"
            page.go_back()
        time.sleep(1.5)

    raw_json_path.write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")

    fieldnames = [
        "codigo", "nombre", "creditos", "facultad", "profesor", "modalidad",
        "dificultad", "cupos_disponibles", "cupos_totales", "horario",
        "prerequisitos", "descripcion", "etiquetas", "imagen",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in resultados:
            writer.writerow(r)

    print(f"\n✓ Listo: {len(resultados)} materias -> {out_path}")
    print(f"  Respaldo JSON completo: {raw_json_path}")


# ──────────────────────────────────────────────────────────────────────────
# Entrypoint
# ──────────────────────────────────────────────────────────────────────────

def ask_yes_no(prompt: str, default: bool = True) -> bool:
    """Pregunta sí/no por terminal. default=True → Enter significa sí."""
    suffix = " [S/n]" if default else " [s/N]"
    raw = input(prompt + suffix).strip().lower()
    if not raw:
        return default
    return raw in ("s", "si", "sí", "y", "yes")


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--discover",
        action="store_true",
        help="Sólo descubre los valores de los desplegables y sale (no extrae).",
    )
    parser.add_argument(
        "--sede",
        default=None,
        help="Valor exacto del desplegable Sede (confírmalo con --discover). Si se omite en modo interactivo, se pregunta.",
    )
    parser.add_argument(
        "--facultad-por",
        default=None,
        help="Valor exacto de Facultad en el bloque 'Por facultad y plan'.",
    )
    parser.add_argument(
        "--carrera-por",
        default=None,
        help="Valor exacto del Componente de Libre Elección (Plan/Carrera).",
    )
    parser.add_argument(
        "--sede-por",
        default=None,
        help="Valor exacto de Sede en el bloque 'Por facultad y plan' (por defecto = --sede).",
    )
    parser.add_argument(
        "--out",
        default="cursos_sia_bogota.csv",
        help="Archivo CSV de salida.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Corre sin ventana visible (úsalo solo cuando ya confirmaste que funciona).",
    )
    args = parser.parse_args()

    # Modo interactivo = NO se pasaron --sede/--facultad-por/--carrera-por Y NO es --discover puro
    has_extract_args = all([args.sede, args.facultad_por, args.carrera_por])
    interactive = not args.discover and not has_extract_args

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        page = browser.new_page()
        page.goto(SIA_URL, wait_until="networkidle", timeout=30000)

        try:
            if args.discover:
                # Modo discover puro — sólo listar y salir
                run_discover(page, want_libre_eleccion=True)
                print("\n--- Discover completo. Vuelve a correr con --sede/--facultad-por/--carrera-por para extraer. ---")

            elif interactive:
                # Modo interactivo: discover + extract en una sola sesión
                print("\n" + "=" * 60)
                print("  MODO INTERACTIVO — discover + extract en una sesión")
                print("=" * 60)
                print(
                    "\nVamos a listar las opciones de cada desplegable y pedirte el texto.\n"
                    "No te preocupes por espacios extra o acentos — el script normaliza.\n"
                )

                discovered = run_discover(page, want_libre_eleccion=True)
                if discovered is None:
                    print("\nNo se completó el discover. Saliendo.")
                    return

                print("\n" + "=" * 60)
                print("  Valores seleccionados:")
                print(f"    Sede:        {discovered['sede']}")
                print(f"    SedePor:     {discovered['sede_por']}")
                print(f"    FacultadPor: {discovered['facultad_por']}")
                print(f"    CarreraPor:  {discovered['carrera_por']}")
                print("=" * 60)

                continuar = ask_yes_no("\n¿Quieres extraer las materias ahora con estos valores?", default=True)
                if not continuar:
                    print("\nSaliendo sin extraer. Anota los valores de arriba para correr --sede/--facultad-por/--carrera-por después.")
                    return

                out_path = Path(args.out)
                raw_json_path = out_path.with_suffix(".json")
                run_extract(
                    page,
                    sede=discovered["sede"],
                    facultad_por=discovered["facultad_por"],
                    carrera_por=discovered["carrera_por"],
                    sede_por=discovered["sede_por"],
                    out_path=out_path,
                    raw_json_path=raw_json_path,
                )

            else:
                # Modo extract directo con argumentos
                sede = args.sede or "1101 SEDE BOGOTÁ"
                facultad_por = args.facultad_por or "1 SEDE BOGOTÁ"
                carrera_por = args.carrera_por or "1CLE COMPONENTE DE LIBRE ELECCIÓN"
                sede_por = args.sede_por or sede

                out_path = Path(args.out)
                raw_json_path = out_path.with_suffix(".json")
                run_extract(
                    page,
                    sede=sede,
                    facultad_por=facultad_por,
                    carrera_por=carrera_por,
                    sede_por=sede_por,
                    out_path=out_path,
                    raw_json_path=raw_json_path,
                )

        finally:
            browser.close()


if __name__ == "__main__":
    main()
