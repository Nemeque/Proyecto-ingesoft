"""Motor de recomendación de LibreChoice.

Enfoque *content-based* con scikit-learn: cada materia se representa como un
documento de texto formado por sus etiquetas (`tags`); el perfil del usuario
se construye a partir de sus `intereses` y de las etiquetas de las materias
que ya calificó positivamente (rating >= 4). Se vectoriza todo con TF-IDF y
se mide similitud de coseno entre el perfil del usuario y cada materia.

Es intencionalmente simple para esta entrega temprana: no requiere
entrenamiento previo ni almacenamiento de modelos, y escala bien para el
tamaño de catálogo de una plataforma universitaria. La tabla
`recommendation_scores` del esquema SQL queda como posible optimización
futura (cachear los scores en vez de calcularlos en cada request).
"""
from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .models import Course


def _tags_document(tag_names) -> str:
    # repetir cada tag ayuda a que TF-IDF le dé peso incluso con pocos términos
    return " ".join(tag_names) or "general"


def match_percent_for_user(user, course) -> int:
    """Afinidad rápida (0-100) para mostrar en listados de materias."""
    if not user or not user.is_authenticated:
        return 50
    user_tags = {t.name.lower() for t in user.intereses.all()}
    if not user_tags:
        return 50
    course_tags = {t.name.lower() for t in course.tags.all()}
    if not course_tags:
        return 50
    overlap = len(user_tags & course_tags)
    return min(100, 50 + overlap * 20)


def recommend_for_user(user, limit: int = 12):
    """Devuelve una lista de (Course, score 0-100) ordenada por afinidad."""
    courses = list(Course.objects.filter(status=Course.Status.ACTIVA).prefetch_related("tags"))
    if not courses:
        return []

    user_tags = [t.name for t in user.intereses.all()] if user and user.is_authenticated else []

    # reforzar el perfil con tags de materias bien calificadas por el usuario
    if user and user.is_authenticated:
        liked_courses = Course.objects.filter(reviews__user=user, reviews__rating__gte=4).distinct()
        for c in liked_courses:
            user_tags += [t.name for t in c.tags.all()]

    if not user_tags:
        # usuario nuevo / sin intereses: orden por popularidad + rating
        ranked = sorted(courses, key=lambda c: (c.enrollment_count, float(c.rating_avg)), reverse=True)
        return [(c, 60) for c in ranked[:limit]]

    documents = [_tags_document([t.name for t in c.tags.all()]) for c in courses]
    user_profile = _tags_document(user_tags)

    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(documents + [user_profile])
    similarities = cosine_similarity(matrix[-1], matrix[:-1]).flatten()

    scored = list(zip(courses, similarities))
    scored.sort(key=lambda pair: pair[1], reverse=True)

    return [(course, round(float(score) * 100)) for course, score in scored[:limit]]
