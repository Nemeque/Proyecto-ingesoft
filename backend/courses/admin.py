from django.contrib import admin

from .models import Course, CourseRequest, Favorite, Review, ViewHistory


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "faculty", "credits", "difficulty", "rating_avg", "status")
    list_filter = ("faculty", "difficulty", "modality", "status")
    search_fields = ("code", "title")
    filter_horizontal = ("tags",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "rating", "created_at")
    list_filter = ("rating",)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "added_at")


@admin.register(ViewHistory)
class ViewHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "viewed_at")


@admin.register(CourseRequest)
class CourseRequestAdmin(admin.ModelAdmin):
    list_display = ("nombre", "codigo", "facultad", "nivel", "status", "user", "created_at")
    list_filter = ("status", "nivel", "modalidad", "facultad")
    search_fields = ("nombre", "codigo", "facultad", "justificacion")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Materia solicitada", {
            "fields": ("nombre", "codigo", "facultad", "creditos", "nivel", "modalidad"),
        }),
        ("Solicitante", {
            "fields": ("user",),
        }),
        ("Justificación", {
            "fields": ("justificacion",),
        }),
        ("Revisión administrativa", {
            "fields": ("status", "admin_notes"),
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
