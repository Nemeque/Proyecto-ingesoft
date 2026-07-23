from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from academics.models import Career, InterestTag

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Representa al usuario tal como lo espera el frontend (`mockUser.ts`)."""

    name = serializers.SerializerMethodField()
    carrera = serializers.SlugRelatedField(
        slug_field="name",
        source="career",
        queryset=Career.objects.all(),
        required=False,
        allow_null=True,
    )
    facultad = serializers.CharField(source="career.faculty.name", read_only=True, default=None)
    semestre = serializers.IntegerField(source="semester", allow_null=True, required=False)
    intereses = serializers.SlugRelatedField(
        slug_field="name", many=True, queryset=InterestTag.objects.all(), required=False
    )

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "carrera",
            "facultad",
            "semestre",
            "student_code",
            "bio",
            "avatar_url",
            "intereses",
            "is_staff",
        ]
        read_only_fields = ["id", "email", "is_staff"]

    def get_name(self, obj):
        return obj.full_name


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    name = serializers.CharField(write_only=True)
    carrera = serializers.CharField(write_only=True, required=False, allow_blank=True)
    facultad = serializers.CharField(write_only=True, required=False, allow_blank=True)
    semestre = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["email", "password", "name", "carrera", "facultad", "semestre"]

    def create(self, validated_data):
        full_name = validated_data.pop("name", "").strip()
        first_name, _, last_name = full_name.partition(" ")
        carrera_name = validated_data.pop("carrera", "")
        validated_data.pop("facultad", "")  # la facultad se infiere de la carrera
        semestre = validated_data.pop("semestre", None)
        email = validated_data.pop("email")

        career = None
        if carrera_name:
            career = Career.objects.filter(name__iexact=carrera_name).first()

        user = User(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
            career=career,
            semester=semestre,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class LibreChoiceTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login con email + password que además devuelve el perfil de usuario."""

    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
