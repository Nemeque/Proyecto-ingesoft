from django.db import models


class Faculty(models.Model):
    """Facultades de la Universidad Nacional de Colombia."""

    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "faculties"

    def __str__(self):
        return self.name


class Career(models.Model):
    """Programas académicos de pregrado."""

    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=10, unique=True)
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="careers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Teacher(models.Model):
    """Docentes que dictan materias de libre elección."""

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True, null=True, blank=True)
    faculty = models.ForeignKey(
        Faculty, on_delete=models.SET_NULL, null=True, blank=True, related_name="teachers"
    )
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InterestTag(models.Model):
    """Etiquetas de interés académico (ej: Tecnología, Arte, Idiomas).

    Se usan tanto para el perfil del usuario como para etiquetar materias;
    son la base del motor de recomendación por contenido.
    """

    name = models.CharField(max_length=60, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
