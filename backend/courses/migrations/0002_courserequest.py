# Generated for CourseRequest model (Sprint 3 — solicitudes de materia)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CourseRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=200)),
                ("codigo", models.CharField(blank=True, max_length=20)),
                ("facultad", models.CharField(blank=True, max_length=200)),
                ("creditos", models.PositiveSmallIntegerField(default=3)),
                (
                    "nivel",
                    models.CharField(
                        choices=[("Pregrado", "Pregrado"), ("Posgrado", "Posgrado")],
                        default="Pregrado",
                        max_length=10,
                    ),
                ),
                ("modalidad", models.CharField(default="presencial", max_length=12)),
                ("justificacion", models.TextField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente"),
                            ("en_revision", "En revisión"),
                            ("aprobada", "Aprobada"),
                            ("rechazada", "Rechazada"),
                        ],
                        default="pendiente",
                        max_length=12,
                    ),
                ),
                (
                    "admin_notes",
                    models.TextField(blank=True, help_text="Notas internas del administrador al revisar."),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        help_text="NULL si la solicitud llegó sin autenticación (raro, pero posible).",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="course_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
