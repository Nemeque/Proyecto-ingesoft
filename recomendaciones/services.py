from collections import defaultdict
from .models import Valoracion, Materia


def recomendar_usuario(usuario):
    # materias ya vistas por el usuario
    mis_materias = set(
        Valoracion.objects.filter(usuario=usuario)
        .values_list('materia_id', flat=True)
    )

    # si es un usuario nuevo
    if not mis_materias:
        return Materia.objects.all()[:5]

    recomendaciones = defaultdict(int)

    # buscar usuarios con materias en común
    usuarios_parecidos = Valoracion.objects.filter(
        materia_id__in=mis_materias
    ).exclude(
        usuario=usuario
    )

    for valoracion in usuarios_parecidos:
        usuario_similar = valoracion.usuario

        materias_similar = Valoracion.objects.filter(
            usuario=usuario_similar,
            calificacion__gte=4
        )

        for m in materias_similar:
            if m.materia_id not in mis_materias:
                recomendaciones[m.materia_id] += 1

    resultado = sorted(
        recomendaciones.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return [
        Materia.objects.get(id=materia_id)
        for materia_id, _ in resultado[:5]
    ]
