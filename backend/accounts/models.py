from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Estudiante o administrador de LibreChoice.

    Extiende AbstractUser de Django (que ya trae email, password hash,
    first_name/last_name, is_staff/is_superuser) con los campos académicos
    definidos en el esquema `librechoice_schema.sql` (tabla `users`).
    `is_staff` cumple el rol de `is_admin` del esquema original.
    """

    email = models.EmailField(unique=True)
    student_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    career = models.ForeignKey(
        "academics.Career", on_delete=models.SET_NULL, null=True, blank=True, related_name="students"
    )
    semester = models.PositiveSmallIntegerField(null=True, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    intereses = models.ManyToManyField(
        "academics.InterestTag", blank=True, related_name="interested_users"
    )
    email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
