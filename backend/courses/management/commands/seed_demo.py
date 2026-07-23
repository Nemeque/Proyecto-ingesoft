from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from academics.models import Career, Faculty, InterestTag

User = get_user_model()

FACULTADES_UNAL = [
    "Facultad de Ingeniería",
    "Facultad de Ciencias",
    "Facultad de Artes",
    "Facultad de Ciencias Humanas",
    "Facultad de Ciencias Económicas",
    "Facultad de Derecho, Ciencias Políticas y Sociales",
    "Facultad de Medicina",
    "Facultad de Odontología",
    "Facultad de Enfermería",
    "Facultad de Ciencias Agrarias",
    "Bienestar Universitario",
]

CARRERAS_POR_FACULTAD = {
    "Facultad de Ingeniería": [
        "Ingeniería de Sistemas",
        "Ingeniería Civil",
        "Ingeniería Industrial",
        "Ingeniería Eléctrica",
        "Ingeniería Mecánica",
        "Ingeniería Química",
    ],
    "Facultad de Ciencias": ["Matemáticas", "Física", "Química", "Biología"],
    "Facultad de Medicina": ["Medicina"],
    "Facultad de Odontología": ["Odontología"],
    "Facultad de Enfermería": ["Enfermería"],
    "Facultad de Derecho, Ciencias Políticas y Sociales": [
        "Derecho",
        "Sociología",
        "Trabajo Social",
    ],
    "Facultad de Ciencias Económicas": ["Economía", "Administración de Empresas"],
    "Facultad de Artes": ["Diseño Gráfico", "Artes Plásticas", "Música"],
    "Facultad de Ciencias Humanas": ["Historia", "Filosofía"],
    "Facultad de Ciencias Agrarias": ["Agronomía", "Veterinaria"],
}

INTEREST_TAGS = [
    "Tecnología", "Arte", "Idiomas", "Ciencia", "Emprendimiento", "Deporte",
    "Música", "Literatura", "Medio Ambiente", "Salud", "Filosofía", "Historia",
    "Economía", "Política", "Diseño", "Matemáticas",
]

FIXED_DEMO_EMAIL = "demo@librechoice.edu.co"
FIXED_DEMO_PASSWORD = "demo1234"


def _unique_code(base: str, used: set, fallback: str = "GEN") -> str:
    base = base or fallback
    code = base
    i = 1
    while code in used:
        i += 1
        code = f"{base}{i}"
    used.add(code)
    return code


class Command(BaseCommand):
    help = (
        "Carga los datos base de LibreChoice: facultades, carreras, etiquetas de "
        "interés y una cuenta de acceso de demostración. NO carga materias — "
        "para eso usa `import_courses <archivo.csv>` con datos reales (ver "
        "docs/cursos_libre_eleccion_ejemplo.csv)."
    )

    def handle(self, *args, **options):
        self.stdout.write("Sembrando datos base de LibreChoice…")

        tags = self._seed_tags()
        faculties = self._seed_faculties()
        self._seed_careers(faculties)
        self._seed_fixed_demo_account()

        self.stdout.write(
            self.style.SUCCESS(f"Listo: {len(tags)} etiquetas, {len(faculties)} facultades.")
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Cuenta demo lista -> email: {FIXED_DEMO_EMAIL}  password: {FIXED_DEMO_PASSWORD}"
            )
        )
        self.stdout.write(
            "Para cargar materias reales: "
            "python manage.py import_courses ../docs/cursos_libre_eleccion_ejemplo.csv"
        )

    def _seed_fixed_demo_account(self):
        career = Career.objects.filter(name="Ingeniería de Sistemas").first()
        user, was_new = User.objects.get_or_create(
            email=FIXED_DEMO_EMAIL,
            defaults={
                "username": FIXED_DEMO_EMAIL,
                "first_name": "Usuario",
                "last_name": "Demo",
                "career": career,
                "semester": 5,
            },
        )
        # Nota: has_usable_password() no sirve aquí — en esta versión de Django
        # devuelve True incluso con password="" (usuario recién creado sin
        # set_password), así que se chequea el campo directamente.
        if was_new or not user.password:
            user.set_password(FIXED_DEMO_PASSWORD)
            user.save()

    def _seed_tags(self):
        tags = []
        for name in INTEREST_TAGS:
            tag, _ = InterestTag.objects.get_or_create(name=name)
            tags.append(tag)
        return tags

    def _seed_faculties(self):
        used_codes = set(Faculty.objects.values_list("code", flat=True))
        faculties = {}
        for name in FACULTADES_UNAL:
            base = "".join(w[0] for w in name.replace("Facultad de ", "").split())[:4].upper()
            code = _unique_code(base, used_codes)
            faculty, _ = Faculty.objects.get_or_create(name=name, defaults={"code": code})
            faculties[name] = faculty
        return faculties

    def _seed_careers(self, faculties):
        used_codes = set(Career.objects.values_list("code", flat=True))
        for faculty_name, carreras in CARRERAS_POR_FACULTAD.items():
            faculty = faculties[faculty_name]
            for carrera in carreras:
                base = "".join(w[0] for w in carrera.split())[:4].upper()
                code = _unique_code(base, used_codes, fallback="CAR")
                Career.objects.get_or_create(
                    name=carrera, defaults={"code": code[:10], "faculty": faculty}
                )
