from django.db import models


class Building(models.Model):
    """A campus building. Owned by a department, or shared (department=None)."""
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=30, blank=True, default='')
    department = models.ForeignKey(
        'enrollment.Department',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='buildings',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Room(models.Model):
    """A room inside a building (e.g. 'Room 101', 'CL-2'). Used to pick
    the room when scheduling a class."""
    ROOM_TYPES = [
        ('lecture', 'Lecture room'),
        ('laboratory', 'Laboratory'),
    ]

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='rooms',
    )
    name = models.CharField(max_length=60)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default='lecture')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        unique_together = ('building', 'name')

    def __str__(self):
        return f"{self.name} ({self.building.name})"


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
    # Blank room = not assigned yet. Faculty declare the day/time of a class and
    # the registrar assigns the room afterwards.
    room = models.CharField(max_length=50, blank=True, default='')
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
