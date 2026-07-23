from django.contrib import admin

from .models import Career, Faculty, InterestTag, Teacher


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(Career)
class CareerAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "faculty")
    list_filter = ("faculty",)
    search_fields = ("name", "code")


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "faculty")
    list_filter = ("faculty",)
    search_fields = ("name", "email")


@admin.register(InterestTag)
class InterestTagAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
