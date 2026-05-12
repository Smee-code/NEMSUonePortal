from django.db import models


class ClassSchedule(models.Model):
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
    ]

    teaching_assignment = models.ForeignKey(
        'grades.TeachingAssignment',
        on_delete=models.CASCADE,
        related_name='class_schedules',
    )
    room = models.CharField(max_length=50)
    building = models.CharField(max_length=100, blank=True, default='')
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return (
            f"{self.teaching_assignment.subject.code} — "
            f"{self.get_day_of_week_display()} {self.start_time}–{self.end_time} ({self.room})"
        )
