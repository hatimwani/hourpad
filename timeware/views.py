import json
from django.db import IntegrityError
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from .models import *
from django.contrib.auth.decorators import login_required
from datetime import timedelta, datetime
from django.core.paginator import Paginator


def index(request):
    if not request.user.is_authenticated:
        return render(request, "auth/home.html")
    activities = Activity.objects.filter(user=request.user)
    schedules = Schedule.objects.filter(user=request.user)
    current_schedule = CurrentSchedule.objects.filter(user=request.user)
    schedule=False
    tasks=[]
    if current_schedule:
        current_schedule = current_schedule.first()
        schedule = current_schedule.schedule
        tasks = ScheduledTask.objects.filter(schedule=schedule).order_by("start_time")
    return render(request, "schedule.html", {
        "activities": activities,
        "schedules": schedules,
        "current_schedule": current_schedule,
        "schedule": schedule,
        "tasks":tasks
    })


@login_required(login_url="/login")
def open_schedule(request, schedule_id):
    # only accept GET requests
    if request.method != 'GET':
        return JsonResponse({
            "message": "Only POST request supported.",
            "status": 400,
        }, status=400)
    schedule = get_object_or_404(Schedule, pk=schedule_id)
    current_schedule = CurrentSchedule.objects.filter(user =request.user)
    if current_schedule:
        current_schedule = current_schedule.first()
        current_schedule.schedule = schedule
        current_schedule.save()
    else:
        current_schedule = CurrentSchedule.objects.create(user=request.user, schedule=schedule)
    return HttpResponseRedirect(reverse("index"))
    

@login_required(login_url="/login")
def new_schedule(request):
    # only accept post requests
    if request.method != 'POST':
        return JsonResponse({
            "message": "Only POST request supported.",
            "status": 400,
        }, status=400)

    #post request
    try:
        data = json.loads(request.body)
        name = str(data.get("name"))
        schedule = Schedule.objects.create(user=request.user, name=name)
        schedule.save()
        return JsonResponse({
            "message": "New Schedule Created successfully",
            "status": 201,
            "schedule_id":schedule.id,
        }, status=201)
    except Exception as e:
        return JsonResponse({
            "message": f"Error: Couldn't add new schedule.",
            "status": 502
        }, status=502)

@login_required(login_url="/login")
def activities(request):
    if request.method != "POST":
        activities = Activity.objects.filter(user=request.user)
        return render(request, 'activities.html', {
            "activities": activities,
        })
    #post request
    try:
        data = json.loads(request.body)
        name = str(data.get("activity"))
        activity = Activity.objects.create(user=request.user, name=name)
        activity.save()
        return JsonResponse({
            "message": "Activity added successfully",
            "status": 201,
        }, status=201)
    except Exception as e:
        return JsonResponse({
            "message": f"Error: Couldn't add new activity.",
            "status": 502
        }, status=502)


#takes end date
@login_required(login_url="/login")
def timebook(request):
    # only accept put requests
    if request.method == 'GET':
        p = Paginator(Timebook.objects.filter(user=request.user).order_by("-start_time"), 300)
        page = request.GET.get('page')
        tasks = p.get_page(page)
        activities = Activity.objects.filter(user=request.user)
        return render(request, "timebook.html", {
            "tasks":tasks,
            "activities": activities,
        })

    if request.method != "POST":
        return JsonResponse({
            "message": "Error: Only Post request supported.",
            "status": 400,
        }, status=400)

    
    try:
        data = json.loads(request.body)
        task_title = str(data.get("task"))
        if len(task_title) > 80:
            return JsonResponse({
                "message": "Only POST request supported.",
                "status": 400,
            }, status=400)
        hours = data.get("hours")
        if hours:
            hours = int(hours)
        else:
            hours = 0
        minutes = data.get("minutes")
        if minutes:
            minutes = int(minutes)
        else:
            minutes = 0
        end_year = str(data.get("year"))
        end_month = str(data.get("month"))
        end_date = str(data.get("date"))
        end_hour = str(data.get("end_hour"))
        end_minute = str(data.get("end_minute"))

        is_important = bool(data.get("is_important"))
        is_urgent = bool(data.get("is_urgent"))
        activities = set(data.get("activities"))
        
        end_time = datetime.strptime(f"{end_year}{end_month}{end_date}{end_hour}{end_minute}", '%Y%m%d%H%M')
        duration = timedelta(hours=hours, minutes=minutes)
        start_time = end_time  - duration

        #Get the square to which task belongs
        square = Square.objects.filter(is_important=is_important, is_urgent=is_urgent).first()
        
        start_time_str = start_time.strftime("%H:%M")
        start_date_str = start_time.strftime("%Y-%m-%d")
        entry = Timebook.objects.create(name=task_title, square=square, user=request.user, start_time=start_time, duration=duration, end_time=end_time, start_date_str = start_date_str, start_time_str=start_time_str)
        entry.save()
        activity_objects = Activity.objects.filter(user=request.user)
        for activity in activity_objects:
            if activity.name in activities:
                entry.activities.add(activity)
        end_time_str = end_time.strftime("%I:%M %p")
        start_time_str = start_time.strftime("%I:%M %p")

        return JsonResponse({
            "message": "Time entry successful.",
            "status": 201,
            "task_id": entry.id,
            "end_time": end_time_str,
            "start_time": start_time_str,
        }, status=201)

    # hadle if anything goes wrong
    except Exception as e:
        print(e)
        return JsonResponse({
            "message": f"Couldn't add time entry",
            "status": 502
        }, status=502)


#adds  tasks having start date while timebook(1) adds tasks having enddate
@login_required(login_url="/login")
def timebook2(request):
    # only accept post requests
    if request.method != "POST":
        return JsonResponse({
            "message": "Error: Only Post request supported.",
            "status": 400,
        }, status=400)

    
    try:
        data = json.loads(request.body)
        task_title = str(data.get("task"))
        if len(task_title) > 80:
            return JsonResponse({
                "message": "Only POST request supported.",
                "status": 400,
            }, status=400)
        hours = data.get("hours")
        if hours:
            hours = int(hours)
        else:
            hours = 0
        minutes = data.get("minutes")
        if minutes:
            minutes = int(minutes)
        else:
            minutes = 0
        end_year = str(data.get("year"))
        end_month = str(data.get("month"))
        end_date = str(data.get("date"))
        end_hour = str(data.get("end_hour"))
        end_minute = str(data.get("end_minute"))

        is_important = bool(data.get("is_important"))
        is_urgent = bool(data.get("is_urgent"))
        activities = set(data.get("activities"))
        
        start_time = datetime.strptime(f"{end_year}{end_month}{end_date}{end_hour}{end_minute}", '%Y%m%d%H%M')
        duration = timedelta(hours=hours, minutes=minutes)
        end_time = start_time  + duration

        #Get the square to which task belongs
        square = Square.objects.filter(is_important=is_important, is_urgent=is_urgent).first()
        
        start_time_str = start_time.strftime("%H:%M")
        start_date_str = start_time.strftime("%Y-%m-%d")
        entry = Timebook.objects.create(name=task_title, square=square, user=request.user, start_time=start_time, duration=duration, end_time=end_time, start_date_str = start_date_str, start_time_str=start_time_str)
        entry.save()
        activity_objects = Activity.objects.filter(user=request.user)
        for activity in activity_objects:
            if activity.name in activities:
                entry.activities.add(activity)
        end_time_str = end_time.strftime("%I:%M %p")
        start_time_str = start_time.strftime("%I:%M %p")

        return JsonResponse({
            "message": "Time entry successful.",
            "status": 201,
            "task_id": entry.id,
            "end_time": end_time_str,
            "start_time": start_time_str,
        }, status=201)

    # hadle if anything goes wrong
    except Exception as e:
        print(e)
        return JsonResponse({
            "message": f"Couldn't add time entry",
            "status": 502
        }, status=502)


@login_required(login_url="/login")
def delete_scheduled_task(request):
    #only accept delete requests
    if request.method != "POST":
        return JsonResponse({
            "message": "Error: Only Post request supported.",
            "status": 400,
        }, status=400)

    try:
        data = json.loads(request.body)
        task_id = int(data.get("task_id"))
        task = get_object_or_404(ScheduledTask, pk=task_id)

        # check if it is valid request
        if request.user != task.schedule.user:
            return JsonResponse({
                "message": "You are not authorized to delete this task!"
            }, status=401)
        
        task.delete()
        return JsonResponse({
            "message": "Task deleted successfully.",
            "status": 201,
        }, status=201)
    except Exception as e:
        return JsonResponse({
            "message": f"Error: Couldn't delete task.",
            "status": 502
        }, status=502)


@login_required(login_url="/login")
def delete_time_entry(request):
    #only accept delete requests
    if request.method != "POST":
        return JsonResponse({
            "message": "Error: Only Post request supported.",
            "status": 400,
        }, status=400)

    try:
        data = json.loads(request.body)
        task_id = int(data.get("task_id"))
        task = get_object_or_404(Timebook, pk=task_id)

        # check if it is valid request
        if request.user != task.user:
            return JsonResponse({
                "message": "You are not authorized to delete this task!"
            }, status=401)
        
        task.delete()
        return JsonResponse({
            "message": "Timelog deleted successfully.",
            "status": 201,
        }, status=201)
    except Exception as e:
        return JsonResponse({
            "message": f"Error: Couldn't delete timelog.",
            "status": 502
        }, status=502)


@login_required(login_url="/login")
def schedule_task(request):
    # only accept put requests
    if request.method != 'POST':
        return JsonResponse({
            "message": "Only POST request supported.",
            "status": 400,
        }, status=400)

    
    try:
        data = json.loads(request.body)
        task_title = str(data.get("task"))
        hours = data.get("hours")
        if hours:
            hours = int(hours)
        else:
            hours = 0
        minutes = data.get("minutes")
        if minutes:
            minutes = int(minutes)
        else:
            minutes = 0
        is_important = bool(data.get("is_important"))
        is_urgent = bool(data.get("is_urgent"))
        start_time_str = str(data.get("time"))
        activities = set(data.get("activities"))
        #2022-7-3 is a random date// i just need time and also use timedelta
        start_time = datetime.strptime(f"2022-07-03 {start_time_str}", '%Y-%m-%d %H:%M')
        # check if data is valid
        if task_title is None:
            return JsonResponse({
            "message": "No task porvided.",
            "status": 400,
        }, status=400)

        
        end_time = start_time + timedelta(hours=hours, minutes=minutes)
        duration = timedelta(hours=hours, minutes=minutes)
        #Get the square to which task belongs
        square = Square.objects.filter(is_important=is_important, is_urgent=is_urgent).first()
        schedule = CurrentSchedule.objects.filter(user=request.user)
        if not schedule:
            return JsonResponse({
                "message": "Only POST request supported.",
                "status": 400,
            }, status=400)
        schedule = schedule.first().schedule
        start_time_time = start_time.time()
        end_time_time = end_time.time()
        task = ScheduledTask.objects.create(name=task_title, duration=duration, square=square, schedule=schedule, start_time=start_time_time, end_time=end_time_time,  start_time_str=start_time_str)
        task.save()
        activity_objects = Activity.objects.filter(user=request.user)
        for activity in activity_objects:
            if activity.name in activities:
                task.activities.add(activity)
            
        end_time_str = end_time.strftime("%I:%M %p")
        start_time_str = start_time.strftime("%I:%M %p")
        return JsonResponse({
            "message": "Task schedulled successfully.",
            "status": 201,
            "task_id": task.id,
            "end_time": end_time_str,
            "start_time": start_time_str,
        }, status=201)

    # hadle if anything goes wrong
    except Exception as e:
        print(e)
        return JsonResponse({
            "message": f"Couldn't schedule Task",
            "status": 502
        }, status=502)

#takes end date
@login_required(login_url="/login")
def manage(request):
    # only accept put requests
    if request.method == 'GET':
        schedules = Schedule.objects.filter(user=request.user)
        activities = Activity.objects.filter(user=request.user)
        return render(request, "manage.html", {
            "schedules":schedules,
            "activities": activities,
        })

    if request.method != "POST":
        return JsonResponse({
            "message": "Error: Only Post request supported.",
            "status": 400,
        }, status=400)

    
    try:
        data = json.loads(request.body)
        schedule_id = int(data.get("schedule_id"))
        schedule = get_object_or_404(Schedule, pk=schedule_id)

        # check if it is valid request
        if request.user != schedule.user:
            return JsonResponse({
                "message": "You are not authorized to delete this schedule!"
            }, status=401)
        
        schedule.delete()
        return JsonResponse({
            "message": "Schedule deleted successfully.",
            "status": 201,
        }, status=201)

    # hadle if anything goes wrong
    except Exception as e:
        print(e)
        return JsonResponse({
            "message": f"Couldn't Delete schedule",
            "status": 502
        }, status=502)

#takes end date
@login_required(login_url="/login")
def delete_activity(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Error: Only Post request supported.",
            "status": 400,
        }, status=400)

    
    try:
        data = json.loads(request.body)
        activity_id = int(data.get("activity_id"))
        activity = get_object_or_404(Activity, pk=activity_id)

        # check if it is valid request
        if request.user != activity.user:
            return JsonResponse({
                "message": "You are not authorized to delete this activity!"
            }, status=401)
        
        activity.delete()
        return JsonResponse({
            "message": "Activity deleted successfully.",
            "status": 201,
        }, status=201)

    # hadle if anything goes wrong
    except Exception as e:
        return JsonResponse({
            "message": f"Couldn't Delete activity",
            "status": 502
        }, status=502)


def login_view(request):
    if request.method != "POST":
        return HttpResponseRedirect(reverse("index"))
    
    # Attempt to sign user in

    # try to get user data
    try:
        email = str(request.POST["email"])
        password = str(request.POST["password"])
    except:
        return render(request, "auth/login.html", {
            "message": "Invalid Credential."
        })
    user = authenticate(request, username=email, password=password)

    # Check if user is authentication was successful
    if user is not None:
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    
    return render(request, "auth/login.html", {
        "message": "Invalid username and/or password."
    })


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))    

def register(request):
    # return register page for get requests
    if request.method != "POST":
        return HttpResponseRedirect(reverse("index"))
        
    # deal with Post requests
    # get user data
    try:
        first = str(request.POST["first"])
        last = str(request.POST["last"])
        email = str(request.POST["email"])
        password = str(request.POST["password"])
        confirmation = str(request.POST["confirmation"])
    except:
        return render(request, "auth/register.html", {
            "message": "Invalid Data. Try again."
        })
    
    # checking if user data is valid
    error = ""
    if password != confirmation:
        error = "Password must match"
    
    if not 5<len(password)<25:
        error = "Enter a valid lenght password."

    if  not 11<len(email)<64:
        error = "Enter a valid email."

    if not 1<len(last)<11:
        error = "Enter a valid name."

    if not 1<len(first)<11:
        error = "Enter a valid name."
    
    if error:
        return render(request, "auth/register.html", {
            "message": error
        })

    
    # Attempt to create new user
    try:
        username = email
        user = User.objects.create_user(username, email, password)
        user.first_name = first
        user.last_name = last
        user.save()
    except IntegrityError:
        return render(request, "auth/register.html", {
            "message": "Account with this email already exists."
        })
    login(request, user)
    return HttpResponseRedirect(reverse("index"))

