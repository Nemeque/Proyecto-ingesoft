from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Review


def _recalculate(course):
    aggregate = course.reviews.aggregate(avg=Avg("rating"), total=Count("id"))
    course.rating_avg = round(aggregate["avg"] or 0, 2)
    course.review_count = aggregate["total"] or 0
    course.save(update_fields=["rating_avg", "review_count", "updated_at"])


@receiver(post_save, sender=Review)
def update_rating_on_save(sender, instance, **kwargs):
    """Equivalente al trigger `trg_update_rating` del esquema SQL."""
    _recalculate(instance.course)


@receiver(post_delete, sender=Review)
def update_rating_on_delete(sender, instance, **kwargs):
    _recalculate(instance.course)
