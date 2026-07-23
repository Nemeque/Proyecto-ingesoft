"""
Importa materias reales desde un archivo CSV (por ejemplo, exportado o copiado
del buscador de asignaturas del SIA, filtrando por Componente = Libre Elección).

Uso:
    python manage.py import_courses ruta/al/archivo.csv
    python manage.py import_courses ruta/al/archivo.csv --dry-run

Columnas esperadas (encabezado exacto, en este orden o cualquier orden —
se leen por nombre de columna, no por posición):

    codigo,nombre,creditos,facultad,profesor,modalidad,dificultad,
    cupos_disponibles,cupos_totales,horario,prerequisitos,descripcion,
    etiquetas,imagen

- codigo: código SIA de la asignatura (clave para actualizar si ya existe)
- nombre: nombre de la asignatura
- creditos: número entero
- facultad: nombre de la facultad (se crea si no existe)
- profesor: nombre del docente (opcional, se crea si no existe)
- modalidad: presencial | virtual | híbrida (por defecto: presencial)
- dificultad: Básico | Intermedio | Avanzado (por defecto: Intermedio)
- cupos_disponibles / cupos_totales: enteros (opcional, por defecto 20)
- horario: horarios separados por ";" (ej. "Lunes 8-10am;Miércoles 8-10am")
- prerequisites: códigos separados por ";" (opcional)
- descripcion: texto libre (opcional)
- etiquetas: palabras clave separadas por ";" (ej. "Arte;Música") — alimentan
  el motor de recomendación
- imagen: URL de imagen (opcional; si se deja vacío, el frontend usa un
  placeholder con las iniciales de la facultad)

Ver docs/cursos_libre_eleccion_ejemplo.csv para una plantilla con datos reales
de Cátedras de Sede (ejemplos verificados en catedras-bogota.unal.edu.co) y
docs/GUIA_IMPORTAR_CURSOS.md para cómo obtener el CSV completo desde el SIA.
"""
import csv

from django.core.management.base import BaseCommand, CommandError

from academics.models import Faculty, InterestTag, Teacher
from courses.models import Course

REQUIRED_COLUMNS = {"codigo", "nombre", "creditos", "facultad"}


def _split(value: str) -> list[str]:
    return [v.strip() for v in value.split(";") if v.strip()] if value else []


class Command(BaseCommand):
    help = "Importa materias reales desde un CSV (ver docstring del archivo para el formato)."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="Ruta al archivo CSV a importar")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra qué se importaría sin escribir en la base de datos.",
        )

    def handle(self, *args, **options):
        path = options["csv_path"]
        dry_run = options["dry_run"]

        try:
            f = open(path, encoding="utf-8-sig", newline="")
        except OSError as exc:
            raise CommandError(f"No se pudo abrir '{path}': {exc}")

        with f:
            reader = csv.DictReader(f)
            headers = {h.strip().lower() for h in (reader.fieldnames or [])}
            missing = REQUIRED_COLUMNS - headers
            if missing:
                raise CommandError(
                    f"Faltan columnas obligatorias en el CSV: {', '.join(sorted(missing))}. "
                    f"Columnas encontradas: {', '.join(sorted(headers)) or '(ninguna)'}"
                )

            created, updated, skipped = 0, 0, 0
            faculty_cache: dict[str, Faculty] = {}
            teacher_cache: dict[str, Teacher] = {}

            for row_num, row in enumerate(reader, start=2):
                row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}

                codigo = row.get("codigo")
                nombre = row.get("nombre")
                facultad_nombre = row.get("facultad")
                if not codigo or not nombre or not facultad_nombre:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Fila {row_num}: falta codigo/nombre/facultad — se omite."
                        )
                    )
                    skipped += 1
                    continue

                try:
                    creditos = int(row.get("creditos") or 3)
                except ValueError:
                    creditos = 3

                if dry_run:
                    self.stdout.write(f"[dry-run] {codigo} — {nombre} ({facultad_nombre})")
                    continue

                faculty = faculty_cache.get(facultad_nombre)
                if not faculty:
                    faculty, _ = Faculty.objects.get_or_create(
                        name=facultad_nombre,
                        defaults={"code": facultad_nombre[:10].upper()},
                    )
                    faculty_cache[facultad_nombre] = faculty

                teacher = None
                profesor_nombre = row.get("profesor")
                if profesor_nombre:
                    teacher = teacher_cache.get(profesor_nombre)
                    if not teacher:
                        teacher, _ = Teacher.objects.get_or_create(
                            name=profesor_nombre, defaults={"faculty": faculty}
                        )
                        teacher_cache[profesor_nombre] = teacher

                modalidad = (row.get("modalidad") or "presencial").lower()
                if modalidad not in dict(Course.Modality.choices):
                    modalidad = Course.Modality.PRESENCIAL

                dificultad = row.get("dificultad") or "Intermedio"
                if dificultad not in dict(Course.Difficulty.choices):
                    dificultad = Course.Difficulty.INTERMEDIO

                def _int(key, default):
                    try:
                        return int(row.get(key) or default)
                    except ValueError:
                        return default

                cupos_disponibles = _int("cupos_disponibles", 20)
                cupos_totales = max(_int("cupos_totales", cupos_disponibles), cupos_disponibles)

                course, was_created = Course.objects.update_or_create(
                    code=codigo,
                    defaults={
                        "title": nombre,
                        "description": row.get("descripcion", ""),
                        "credits": creditos,
                        "faculty": faculty,
                        "teacher": teacher,
                        "modality": modalidad,
                        "difficulty": dificultad,
                        "status": Course.Status.ACTIVA,
                        "seats_available": cupos_disponibles,
                        "seats_total": cupos_totales,
                        "image_url": row.get("imagen", ""),
                        "schedule": _split(row.get("horario", "")),
                        "prerequisites": _split(row.get("prerequisitos", "")),
                    },
                )

                tag_names = _split(row.get("etiquetas", ""))
                if tag_names:
                    tags = [InterestTag.objects.get_or_create(name=t)[0] for t in tag_names]
                    course.tags.set(tags)

                created += was_created
                updated += not was_created

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run completo — no se escribió nada."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo: {created} materias creadas, {updated} actualizadas, {skipped} omitidas."
            )
        )
