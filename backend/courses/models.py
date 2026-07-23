from django.conf import settings
from django.db import models
from django.utils import timezone

from academics.models import Faculty, InterestTag, Teacher


class Course(models.Model):
    """Catálogo de materias de libre elección (tabla `courses` del esquema SQL).

    Simplificaciones respecto a `librechoice_schema.sql` para la entrega
    temprana: los horarios (`course_schedules`) y los prerrequisitos
    (`course_prerequisites`) se guardan como listas JSON en vez de tablas
    relacionales aparte; se podrán migrar a tablas propias en un sprint
    posterior sin romper el contrato de la API.
    """

    class Modality(models.TextChoices):
        PRESENCIAL = "presencial", "Presencial"
        VIRTUAL = "virtual", "Virtual"
        HIBRIDA = "híbrida", "Híbrida"

    class Difficulty(models.TextChoices):
        BASICO = "Básico", "Básico"
        INTERMEDIO = "Intermedio", "Intermedio"
        AVANZADO = "Avanzado", "Avanzado"

    class Status(models.TextChoices):
        ACTIVA = "activa", "Activa"
        INACTIVA = "inactiva", "Inactiva"
        PROXIMA = "proxima", "Próxima"

    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    credits = models.PositiveSmallIntegerField()
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="courses")
    teacher = models.ForeignKey(
        Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses"
    )
    modality = models.CharField(max_length=12, choices=Modality.choices, default=Modality.PRESENCIAL)
    difficulty = models.CharField(
        max_length=12, choices=Difficulty.choices, default=Difficulty.INTERMEDIO
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVA)
    seats_available = models.PositiveSmallIntegerField(default=0)
    seats_total = models.PositiveSmallIntegerField(default=0)
    image_url = models.URLField(max_length=500, blank=True)

    tags = models.ManyToManyField(InterestTag, blank=True, related_name="courses")
    schedule = models.JSONField(default=list, blank=True, help_text="Lista de horarios, ej. ['Lunes 8-10am']")
    prerequisites = models.JSONField(
        default=list, blank=True, help_text="Códigos de materias prerrequisito"
    )
    is_new = models.BooleanField(default=False)
    is_popular = models.BooleanField(default=False)

    # métricas calculadas — actualizadas por señales al crear/editar reseñas
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    enrollment_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-rating_avg", "title"]

    def __str__(self):
        return f"{self.code} — {self.title}"


class Review(models.Model):
    """Calificaciones y comentarios de estudiantes sobre materias."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "course")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.course} ({self.rating}★)"


class Favorite(models.Model):
    """Materias guardadas por el usuario ('Mi Lista')."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="favorited_by")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "course")
        ordering = ["-added_at"]


class ViewHistory(models.Model):
    """Registro de materias vistas — alimenta el motor de recomendación."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="view_history")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="views")
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-viewed_at"]


class CourseRequest(models.Model):
    """Solicitud de un estudiante para agregar una materia al catálogo.

    El frontend envía una solicitud POST /api/courses/requests con los datos
    de la materia que el estudiante quiere ver añadida. Un administrador
    revisa las solicitudes desde el admin de Django y, si procede, crea el
    Course correspondiente. Esto cierra el flujo "no encuentro la materia
    que busco" sin que el estudiante tenga que escribir un correo.
    """

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        EN_REVISION = "en_revision", "En revisión"
        APROBADA = "aprobada", "Aprobada"
        RECHAZADA = "rechazada", "Rechazada"

    class Nivel(models.TextChoices):
        PREGRADO = "Pregrado", "Pregrado"
        POSGRADO = "Posgrado", "Posgrado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_requests",
        null=True,
        blank=True,
        help_text="NULL si la solicitud llegó sin autenticación (raro, pero posible).",
    )
    nombre = models.CharField(max_length=200)
    codigo = models.CharField(max_length=20, blank=True)
    facultad = models.CharField(max_length=200, blank=True)
    creditos = models.PositiveSmallIntegerField(default=3)
    nivel = models.CharField(max_length=10, choices=Nivel.choices, default=Nivel.PREGRADO)
    modalidad = models.CharField(max_length=12, default="presencial")
    justificacion = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDIENTE)
    admin_notes = models.TextField(blank=True, help_text="Notas internas del administrador al revisar.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Solicitud: {self.nombre} ({self.status})"
