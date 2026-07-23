from django.urls import path

from .views import (
    CourseDetailView,
    CourseListView,
    CourseRequestCreateView,
    FavoriteDetailView,
    FavoritesListView,
    MostPopularView,
    MyCourseRequestsView,
    MyListCoursesView,
    MyRatingsView,
    MyViewHistoryView,
    RateCourseView,
    RecommendedView,
    TogglePopularView,
    TopRatedView,
    ViewedForRatingView,
)

urlpatterns = [
    path("courses", CourseListView.as_view(), name="course-list"),
    path("courses/top-rated", TopRatedView.as_view(), name="course-top-rated"),
    path("courses/most-popular", MostPopularView.as_view(), name="course-most-popular"),
    path("courses/viewed", ViewedForRatingView.as_view(), name="course-viewed"),
    path("courses/my-list", MyListCoursesView.as_view(), name="course-my-list"),
    path("courses/requests", CourseRequestCreateView.as_view(), name="course-request-create"),
    path("courses/requests/mine", MyCourseRequestsView.as_view(), name="course-request-mine"),
    path("courses/<int:pk>", CourseDetailView.as_view(), name="course-detail"),
    path("courses/<int:pk>/rate", RateCourseView.as_view(), name="course-rate"),
    path("courses/<int:pk>/popular", TogglePopularView.as_view(), name="course-toggle-popular"),
    path("recommendations", RecommendedView.as_view(), name="recommendations"),
    path("users/me/favorites", FavoritesListView.as_view(), name="favorites-list"),
    path("users/me/ratings", MyRatingsView.as_view(), name="my-ratings"),
    path("users/me/view-history", MyViewHistoryView.as_view(), name="my-view-history"),
    path("users/me/favorites/<int:pk>", FavoriteDetailView.as_view(), name="favorite-detail"),
]
