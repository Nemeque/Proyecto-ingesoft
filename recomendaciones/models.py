from django.db import models
from django.contrib.auth.models import User


class Materia(models.Model):
    nombre = models.CharField(max_length=100)
    codigo = models.CharField(max_length=20, unique=True)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre


from django.core.validators import MinValueValidator, MaxValueValidator

class Valoracion(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    materia = models.ForeignKey(Materia, on_delete=models.CASCADE)

    calificacion = models.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5)
        ]
    )

    primera_optativa = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'materia')
