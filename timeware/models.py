from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # how much does user charge for one hour of work.
    last_login = models.DateTimeField(auto_now=True)



class Schedule(models.Model):
    name = models.CharField(max_length=31)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="schedules")

class CurrentSchedule(models.Model):
    schedule =models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name="current_schedule")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="current_schedule")

class Activity(models.Model):
    name = models.CharField(max_length=31)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")

    def __str__(self):
        return self.name

# each plane is divided in four quadrants containing different types of tasks.
class Square(models.Model):
    is_important = models.BooleanField()
    is_urgent= models.BooleanField()

class ScheduledTask(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name="scheduled_tasks")
    name = models.CharField(max_length=127)
    square = models.ForeignKey(Square, on_delete=models.PROTECT, related_name="scheduled_tasks")
    activities = models.ManyToManyField(Activity, related_name="scheduled_tasks")
    # used datetime field because you may want to schedule a task at midnight
    start_time = models.TimeField()
    duration = models.DurationField()
    end_time = models.TimeField()
    # for consistency of date format across backend and front end
    start_time_str = models.CharField(max_length=15)
    
class Timebook(models.Model):
    name = models.CharField(max_length=127)
    square = models.ForeignKey(Square, on_delete=models.PROTECT, related_name="timebook")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="timebook")
    activities = models.ManyToManyField(Activity, related_name="timebook",)
    start_time = models.DateTimeField()
    duration = models.DurationField()
    end_time = models.DateTimeField()
    # for consistency of date format across backend and front end
    start_date_str = models.CharField(max_length=15)
    start_time_str = models.CharField(max_length=15)







