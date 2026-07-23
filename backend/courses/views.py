from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, CourseRequest, Favorite, Review, ViewHistory
from .recommender import recommend_for_user
from .serializers import (
    CourseListSerializer,
    CourseRequestSerializer,
    CourseSerializer,
    RateCourseSerializer,
)


class CourseListView(generics.ListAPIView):
    """GET /api/courses?search=&faculty=&modality=&difficulty=&tag="""

    serializer_class = CourseListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Course.objects.select_related("faculty", "teacher").prefetch_related("tags")
        params = self.request.query_params

        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(code__icontains=search)
                | Q(teacher__name__icontains=search)
                | Q(tags__name__icontains=search)
            ).distinct()

        faculty = params.get("faculty")
        if faculty:
            qs = qs.filter(faculty__code__iexact=faculty)

        modality = params.get("modality")
        if modality:
            qs = qs.filter(modality=modality)

        difficulty = params.get("difficulty")
        if difficulty:
            qs = qs.filter(difficulty=difficulty)

        tag = params.get("tag")
        if tag:
            qs = qs.filter(tags__name__iexact=tag)

        return qs


class CourseDetailView(generics.RetrieveAPIView):
    """GET /api/courses/:id"""

    queryset = Course.objects.select_related("faculty", "teacher").prefetch_related("tags", "reviews__user")
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            ViewHistory.objects.create(user=request.user, course=instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class TopRatedView(generics.ListAPIView):
    """GET /api/courses/top-rated — todas las materias con al menos 1 reseña,
    ordenadas por rating promedio. Sin límite: el frontend decide cuántas
    mostrar en cada fila (Home) o en la página completa (Explore)."""

    serializer_class = CourseListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Course.objects.filter(review_count__gte=1)
            .select_related("faculty", "teacher")
            .prefetch_related("tags")
            .order_by("-rating_avg", "-review_count")
        )


class MostPopularView(generics.ListAPIView):
    """GET /api/courses/most-popular — todas las materias marcadas como
    populares, sin límite. El frontend decide el slice."""

    serializer_class = CourseListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Course.objects.filter(is_popular=True)
            .select_related("faculty", "teacher")
            .prefetch_related("tags")
            .order_by("-enrollment_count")
        )


class RecommendedView(APIView):
    """GET /api/recommendations — motor de recomendación (scikit-learn)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        pairs = recommend_for_user(request.user)
        data = []
        for course, score in pairs:
            serialized = CourseListSerializer(course, context={"request": request}).data
            serialized["matchPercent"] = score
            data.append(serialized)
        return Response(data)


class ViewedForRatingView(generics.ListAPIView):
    """GET /api/courses/viewed — materias vistas y aún sin calificar."""

    serializer_class = CourseListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        viewed_ids = ViewHistory.objects.filter(user=self.request.user).values_list(
            "course_id", flat=True
        )
        rated_ids = Review.objects.filter(user=self.request.user).values_list("course_id", flat=True)
        return (
            Course.objects.filter(id__in=viewed_ids)
            .exclude(id__in=rated_ids)
            .select_related("faculty", "teacher")
            .prefetch_related("tags")
        )


class RateCourseView(APIView):
    """POST /api/courses/:id/rate  { rating, comment?, is_anonymous? }
    ·  DELETE /api/courses/:id/rate"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        course = generics.get_object_or_404(Course, pk=pk)
        serializer = RateCourseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        Review.objects.update_or_create(
            user=request.user,
            course=course,
            defaults={
                "rating": serializer.validated_data["rating"],
                "comment": serializer.validated_data.get("comment", ""),
                "is_anonymous": serializer.validated_data.get("is_anonymous", False),
            },
        )
        course.refresh_from_db()
        return Response(CourseSerializer(course, context={"request": request}).data)

    def delete(self, request, pk):
        course = generics.get_object_or_404(Course, pk=pk)
        Review.objects.filter(user=request.user, course=course).delete()
        course.refresh_from_db()
        return Response(CourseSerializer(course, context={"request": request}).data)


class TogglePopularView(APIView):
    """POST /api/courses/:id/popular  { popular: true|false }

    Permite marcar/desmarcar una materia como "popular":
    - Admins (is_staff) pueden fijar `is_popular` directamente (pin permanente).
    - Usuarios normales hacen "upvote": incrementa `enrollment_count` en 1,
      y si la materia cruza el umbral de 5 upvotes, se marca is_popular=True
      automáticamente (popularidad orgánica).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        course = generics.get_object_or_404(Course, pk=pk)
        wants_popular = request.data.get("popular", True)
        is_admin = request.user.is_staff

        if is_admin:
            # Admin: toggle directo del flag.
            course.is_popular = bool(wants_popular)
            course.save(update_fields=["is_popular", "updated_at"])
            action = "marcada como popular (admin)" if course.is_popular else "desmarcada como popular (admin)"
        else:
            # Usuario normal: upvote. Para simplificar, cada click suma 1 a
            # enrollment_count. Si pasa de 5, se auto-marca is_popular.
            # (No prevenimos múltiples clicks del mismo usuario para mantener
            # el código simple — en producción se usaría una tabla de upvotes.)
            if wants_popular:
                course.enrollment_count = (course.enrollment_count or 0) + 1
                if course.enrollment_count >= 5 and not course.is_popular:
                    course.is_popular = True
                action = f"sumaste un voto (total: {course.enrollment_count})"
            else:
                # Quitar voto — solo permitido si el usuario fue quien lo dio.
                # Para simplicidad, decrementamos con floor en 0.
                course.enrollment_count = max(0, (course.enrollment_count or 0) - 1)
                action = f"quitaste un voto (total: {course.enrollment_count})"
            course.save(update_fields=["enrollment_count", "is_popular", "updated_at"])

        course.refresh_from_db()
        return Response({
            "id": str(course.id),
            "popular": course.is_popular,
            "enrollment_count": course.enrollment_count,
            "message": f"'{course.title}' {action}.",
        })


class MyViewHistoryView(APIView):
    """GET /api/users/me/view-history — ids de materias vistas por el usuario."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids = list(
            ViewHistory.objects.filter(user=request.user)
            .values_list("course_id", flat=True)
            .distinct()
        )
        return Response(ids)


class MyRatingsView(APIView):
    """GET /api/users/me/ratings — { courseId: rating } del usuario autenticado."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ratings = {
            str(course_id): rating
            for course_id, rating in Review.objects.filter(user=request.user).values_list(
                "course_id", "rating"
            )
        }
        return Response(ratings)


class FavoritesListView(generics.ListAPIView):
    """GET /api/users/me/favorites — ids de materias favoritas."""

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        ids = list(
            Favorite.objects.filter(user=request.user).values_list("course_id", flat=True)
        )
        return Response(ids)


class MyListCoursesView(generics.ListAPIView):
    """GET /api/courses/my-list — materias completas en 'Mi Lista'."""

    serializer_class = CourseListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        course_ids = Favorite.objects.filter(user=self.request.user).values_list("course_id", flat=True)
        return (
            Course.objects.filter(id__in=course_ids)
            .select_related("faculty", "teacher")
            .prefetch_related("tags")
        )


class FavoriteDetailView(APIView):
    """POST /api/users/me/favorites/:id  ·  DELETE /api/users/me/favorites/:id"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        course = generics.get_object_or_404(Course, pk=pk)
        Favorite.objects.get_or_create(user=request.user, course=course)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        Favorite.objects.filter(user=request.user, course_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseRequestCreateView(generics.CreateAPIView):
    """POST /api/courses/requests — crea una solicitud de nueva materia.

    Acepta visitantes anónimos (AllowAny) para que la solicitud funcione
    incluso si el usuario no ha iniciado sesión, pero si hay sesión
    activa se asocia al usuario para poder hacer seguimiento.
    """

    serializer_class = CourseRequestSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class MyCourseRequestsView(generics.ListAPIView):
    """GET /api/courses/requests/mine — lista las solicitudes del usuario actual."""

    serializer_class = CourseRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CourseRequest.objects.filter(user=self.request.user)
