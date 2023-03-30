from . import views
from django.urls import path

urlpatterns = [
    path("",  views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("schedule_task", views.schedule_task, name="schedule_task"),
    path("delete_scheduled_task", views.delete_scheduled_task, name="delete_scheduled_task"),
    path("activities", views.activities, name="activities"),
    path("timebook", views.timebook, name="timebook"),
    path("timebook2", views.timebook2, name="timebook2"),
    path("new_schedule", views.new_schedule, name="new_schedule"),
    path("open_schedule/<int:schedule_id>", views.open_schedule, name="open_schedule"),
    path("delete_time_entry", views.delete_time_entry, name="delete_time_entry"),
    path("manage", views.manage, name="manage"),
    path("delete_activity", views.delete_activity, name="delete_activity"),

]
