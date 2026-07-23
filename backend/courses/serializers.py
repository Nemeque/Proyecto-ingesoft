from django.db.models import Count
from rest_framework import serializers

from .models import Course, Review
from .recommender import match_percent_for_user


class ReviewSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    author = serializers.SerializerMethodField()
    semester = serializers.SerializerMethodField()
    date = serializers.DateTimeField(source="created_at", format="%Y-%m-%d", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "author", "semester", "rating", "comment", "date"]

    def get_author(self, obj):
        if obj.is_anonymous:
            return "Estudiante anónimo"
        return obj.user.full_name

    def get_semester(self, obj):
        return f"{obj.created_at.year}-{'I' if obj.created_at.month <= 6 else 'II'}"


class CourseSerializer(serializers.ModelSerializer):
    """Serializa un Course exactamente con la forma que espera el frontend
    (ver `src/app/data/courses.ts` -> interface Course)."""

    faculty = serializers.CharField(source="faculty.name", read_only=True)
    id = serializers.CharField(read_only=True)
    teacher = serializers.CharField(source="teacher.name", read_only=True, default="Por asignar")
    tags = serializers.SlugRelatedField(slug_field="name", many=True, read_only=True)
    image = serializers.URLField(source="image_url")
    seatsAvailable = serializers.IntegerField(source="seats_available")
    reviewCount = serializers.IntegerField(source="review_count", read_only=True)
    # FloatField (en vez de DecimalField) para que el JSON envie un numero
    # (ej. 4.5) y no una cadena (ej. "4.50"). El frontend usa `rating.toFixed(1)`,
    # lo cual falla con cadenas -> TypeError: rating.toFixed is not a function.
    rating = serializers.FloatField(source="rating_avg", read_only=True)
    matchPercent = serializers.SerializerMethodField()
    isNew = serializers.BooleanField(source="is_new")
    popular = serializers.BooleanField(source="is_popular")
    reviews = ReviewSerializer(many=True, read_only=True)
    ratingBreakdown = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "code",
            "credits",
            "faculty",
            "description",
            "image",
            "tags",
            "matchPercent",
            "isNew",
            "popular",
            "teacher",
            "schedule",
            "modality",
            "seatsAvailable",
            "difficulty",
            "rating",
            "reviewCount",
            "ratingBreakdown",
            "prerequisites",
            "reviews",
        ]

    def get_matchPercent(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        return match_percent_for_user(user, obj)

    def get_ratingBreakdown(self, obj):
        """Distribución 1-5 estrellas — cuántas reseñas dieron cada puntaje."""
        counts = {str(i): 0 for i in range(1, 6)}
        for row in obj.reviews.values("rating").annotate(count=Count("id")):
            counts[str(row["rating"])] = row["count"]
        return counts


class CourseListSerializer(CourseSerializer):
    """Versión liviana (sin reseñas completas ni desglose) para listados grandes."""

    class Meta(CourseSerializer.Meta):
        fields = [f for f in CourseSerializer.Meta.fields if f not in ("reviews", "ratingBreakdown")]


class RateCourseSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    is_anonymous = serializers.BooleanField(required=False, default=False)


class CourseRequestSerializer(serializers.ModelSerializer):
    """Serializa una CourseRequest — el frontend envía estos campos al
    POST /api/courses/requests y recibe la misma estructura al listar sus
    propias solicitudes (GET /api/courses/requests/mine)."""

    id = serializers.CharField(read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        from .models import CourseRequest
        model = CourseRequest
        fields = [
            "id",
            "user",
            "nombre",
            "codigo",
            "facultad",
            "creditos",
            "nivel",
            "modalidad",
            "justificacion",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "user", "status", "created_at"]
