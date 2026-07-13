from django.urls import path
from .views import probar_recomendacion

urlpatterns = [
    path('recomendar/', probar_recomendacion),
]