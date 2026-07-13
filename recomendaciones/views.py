from django.http import HttpResponse
from django.contrib.auth.models import User
from .services import recomendar_usuario


def probar_recomendacion(request):
    usuario = User.objects.get(username='Juan_Domingo')

    recomendaciones = recomendar_usuario(usuario)

    texto = ""

    for materia in recomendaciones:
        texto += materia.nombre + "<br>"

    return HttpResponse(texto)