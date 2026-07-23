from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("email", "username", "career", "semester", "is_staff")
    list_filter = ("is_staff", "career")
    search_fields = ("email", "username", "student_code")
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Perfil académico LibreChoice",
            {
                "fields": (
                    "student_code",
                    "career",
                    "semester",
                    "bio",
                    "avatar_url",
                    "intereses",
                    "email_verified",
                )
            },
        ),
    )
