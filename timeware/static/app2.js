document.addEventListener("DOMContentLoaded", function() {

    // used to track task even if site is closed
    if (localStorage.getItem("is_running_task")){
        play_stop_watch();
        fill_runnig_task();
    }else{
        localStorage.setItem("is_running_task", "")
        localStorage.setItem("task", "")
        localStorage.setItem("start", new Date())
        localStorage.setItem("activities", JSON.stringify([""]))
        localStorage.setItem("is_important", "")
        localStorage.setItem("is_urgent", "")
    }
    // enables toggle on activities menu on right corner
    toggle_activities();
    track_local_store();
    toggle_schedules();
    track_deleting_scheduled();
    track_play_buttons();
    document.getElementById("addActivityButton").onclick = add_activity;
    document.getElementById("addScheduleButton").onclick = add_schedule;
    document.getElementById("headPlayButton").onclick = start_task;
    document.getElementById("stopButton").onclick = add_time_entry;
    document.getElementById("addScheduledTaskButton").onclick = add_scheduled_task;

});


// looks for any change in top header(input) and updates the local storage
function track_local_store(){
    // get all input elements in the header
    const task = document.getElementById("header");
    const input = task.children[0].children[1]
    const is_important_element = task.children[1].children[1].children[0].children[0];
    const is_urgent_element = task.children[1].children[1].children[1].children[0];

    // update local storage every time any input element changes
    input.addEventListener("input", ()=>{
        localStorage.setItem("task", input.value);
    });
    is_important_element.addEventListener("input", ()=>{
        if (is_important_element.checked){
            localStorage.setItem("is_important", true);
        }else {
            localStorage.setItem("is_important", "");
        }
    });
    is_urgent_element.addEventListener("input", ()=>{
        if (is_urgent_element.checked){
            localStorage.setItem("is_urgent", true);
        }else {
            localStorage.setItem("is_urgent", "");
        }
    });
    document.querySelectorAll(".activityItem").forEach(item => {
        item.children[0].addEventListener("input", function(){
            if (item.children[0].checked){
                let activities = JSON.parse(localStorage.getItem("activities"));
                const index = activities.indexOf(item.children[1].innerHTML);
                if (index >= 0) return
                activities.push(item.children[1].innerHTML);
                localStorage.activities = JSON.stringify(activities);
            }else{
                let activities = JSON.parse(localStorage.getItem("activities"));
                const index = activities.indexOf(item.children[1].innerHTML);
                if (index > 0){
                    activities.splice(index, 1);
                    localStorage.activities = JSON.stringify(activities);
                }
            }
        });
    });
}

// uses local storages to fill input fieds with running task
function fill_runnig_task(){
    const task = document.getElementById("header");
    task.children[0].children[1].value = localStorage.getItem("task")
    task.children[1].children[1].children[0].children[0].checked = localStorage.getItem("is_important");
    task.children[1].children[1].children[1].children[0].checked = localStorage.getItem("is_urgent");
    let activities = JSON.parse(localStorage.getItem("activities"));
    document.querySelectorAll(".activityItem").forEach(item => {
        const index = activities.indexOf(item.children[1].innerHTML);
        if (index >= 0){
            item.children[0].checked = true;
        }
    });
    task.children[1].children[3].children[0].style.display="none";
    task.children[1].children[3].children[1].style.display="block";
    stop_watch_interval_id =setInterval(play_stop_watch, 30000);
}

// add new entry to history
function add_time_entry(){
    const task = document.getElementById("header");
    const task_name = task.children[0].children[1];
    const task_title = task_name.value;
    if (task_name.value=="") return 1
    if (!localStorage.getItem("is_running_task")) return 1
    const is_important_element = task.children[1].children[1].children[0].children[0];
    const is_urgent_element = task.children[1].children[1].children[1].children[0];
    const is_important = task.children[1].children[1].children[0].children[0].checked;
    const is_urgent= task.children[1].children[1].children[1].children[0].checked;
    let activities = [];
    document.querySelectorAll(".activityItem").forEach(item => {
        if (item.children[0].checked){
            const activity_name = item.children[1].innerHTML;
            activities.push(activity_name);
        }
    });
    const duration_element = task.children[1].children[0];
    const duration = duration_element.innerHTML.split(":");
    const hours = duration[0];
    const minutes = duration[1];
    const end_time = new Date()

    // clear the header

    task_name.value = "";
    duration_element.innerHTML = "0:00";
    document.querySelectorAll(".activityItem").forEach(item => {
        item.children[0].checked = false;
    });
    is_important_element.checked = false;
    is_urgent_element.checked = false;
    end_task();

    // send data to server
    let csrftoken = getCookie('csrftoken');
    fetch('/timebook', {
        method: 'POST',
        body: JSON.stringify({
          task: task_title,
          hours: hours,
          minutes: minutes,
          is_important: is_important,
          is_urgent: is_urgent,
          year: end_time.getFullYear(),
          month: end_time.getMonth()+1,
          date: end_time.getDate(),
          end_hour: end_time.getHours(),
          end_minute: end_time.getMinutes(),
          activities: activities,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
    .then(response => response.json())
    .then(result => {
        console.log(result);
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 
}

// add new entry to history when play is 
function add_previous_entry(){
    const task = document.getElementById("header");
    const task_name = task.children[0].children[1];
    if (task_name.value=="") return 1
    if (!localStorage.getItem("is_running_task")) return 1
    const is_important_element = task.children[1].children[1].children[0].children[0];
    const is_urgent_element = task.children[1].children[1].children[1].children[0];
    const is_important = task.children[1].children[1].children[0].children[0].checked;
    const is_urgent= task.children[1].children[1].children[1].children[0].checked;
    let activities = [];
    document.querySelectorAll(".activityItem").forEach(item => {
        if (item.children[0].checked){
            const activity_name = item.children[1].innerHTML;
            activities.push(activity_name);
        }
    });
    const duration_element = task.children[1].children[0];
    const duration = duration_element.innerHTML.split(":");
    const hours = duration[0];
    const minutes = duration[1];
    const end_time = new Date()
    let csrftoken = getCookie('csrftoken');
    fetch('/timebook', {
        method: 'POST',
        body: JSON.stringify({
          task: task_name.value,
          hours: hours,
          minutes: minutes,
          is_important: is_important,
          is_urgent: is_urgent,
          year: end_time.getFullYear(),
          month: end_time.getMonth()+1,
          date: end_time.getDate(),
          end_hour: end_time.getHours(),
          end_minute: end_time.getMinutes(),
          activities: activities,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
    .then(response => response.json())
    .then(result => {
        console.log(result);
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 
}


// used after stop button is clicked 
// cleares the input on header
function end_task(){
    const task = document.getElementById("header");
    task.children[1].children[3].children[0].style.display="block";
    task.children[1].children[3].children[1].style.display="none";
    localStorage.setItem("is_running_task", "")
    clearInterval(stop_watch_interval_id);

}


// used to start a task when play button at top is clicked
function start_task(){
    const task = document.getElementById("header");
    const activity_name = task.children[0].children[1].value;
    if (activity_name==""){
        return
    }
    task.children[1].children[3].children[0].style.display="none";
    task.children[1].children[3].children[1].style.display="block";
    localStorage.setItem("start", new Date);
    localStorage.setItem("task", activity_name);
    localStorage.setItem("is_running_task", "true");
    stop_watch_interval_id = setInterval(play_stop_watch, 30000);
}

// add new activity
function add_activity() {
    const activity_field = document.getElementById("newActivity");
    const activity_name = activity_field.value
    if (activity_name == "") {
        return 0
    }
    // break if activity already exists
    let already_exists = false
    document.querySelectorAll(".activityName").forEach(name => {
        if (!already_exists && name.innerHTML == activity_name){
            already_exists = true;
        }
    })
    if (already_exists){
        return 0
    }

    const template = document.getElementById("activityTemplate");
    const form_activities = document.getElementById("formActivities")
    const clone = template.content.cloneNode(true);
    const template2 = document.getElementById("formActivityTemplate")
    const clone2 = template2.content.cloneNode(true);
    clone.children[0].children[0].children[1].innerHTML = activity_name;
    clone2.children[0].children[0].children[1].innerHTML = activity_name;
    activity_field.value =""
    const activities  = document.getElementById("activities");
    activities.insertBefore(clone, activities.children[1]);
    form_activities.append(clone2)
    
    // send data to server
    let csrftoken = getCookie('csrftoken');
    fetch('/activities', {
        method: 'POST',
        body: JSON.stringify({
          activity: activity_name,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
    .then(response => response.json())
    .then(result => {
        console.log(result)
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 
}

// add new schedule
function add_schedule() {
    const schedule_field = document.getElementById("newSchedule");
    const schedule_name = schedule_field.value
    if (schedule_name == "") {
        return 0
    }
    // break if activity already exists
    let already_exists = false
    document.querySelectorAll(".scheduleName").forEach(name => {
        if (!already_exists && name.innerHTML == schedule_name){
            already_exists = true;
        }
    })
    if (already_exists){
        return 0
    }

    // clear form
    const template = document.getElementById("scheduleLinkTemplate");
    const clone = template.content.cloneNode(true);
    clone.children[0].children[0].innerHTML = schedule_name;
    schedule_field.value="";

    // send data to server
    let csrftoken = getCookie('csrftoken');
    fetch('/new_schedule', {
        method: 'POST',
        body: JSON.stringify({
          name: schedule_name,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
    .then(response => response.json())
    .then(result => {
        const schedules  = document.getElementById("schedules");
        clone.children[0].children[0].href = `open_schedule/${result.schedule_id}`
        schedules.append(clone);
        console.log(result)
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 
}


//used to toggle activites list from click of a button
function toggle_activities(){
    document.getElementById("menu-button").onclick=()=>{
        const activities = document.getElementById("activities");
        if (activities.hidden){
            activities.hidden = false;
        }
        else {
            activities.hidden=true;
        }
    }
}

//used to toggle schedules list from click of a button
function toggle_schedules(){
    document.getElementById("schedule-menu-button").onclick=()=>{
        const activities = document.getElementById("schedules");
        if (activities.hidden){
            activities.hidden = false;
        }
        else {
            activities.hidden=true;
        }
    }
}

//shows duration(current time - start time) of running task
function play_stop_watch(){
    const timer_element = document.getElementById("stopWatch");
    const now = new Date();
    let start = localStorage.getItem("start");
    start = new Date(start);
    const time_diff = (now - start)/1000;
    let hours = Math.floor(time_diff/3600);
    let minutes = Math.floor(time_diff/60)%60;
    if (minutes < 10){
        minutes = `0${minutes}`
    }
    timer_element.innerHTML=`${hours}:${minutes}`;
}

// adds a new task to your schedule
function add_scheduled_task() {
    // shows error for incomplete data 
    const error_element = document.getElementById("newUnscheduledTaskError");
    error_element.innerHTML = "";

    // get task related data
    const task_element = document.getElementById("unscheduledTaskTitle");
    const task = task_element.value;
    const hours_element = document.getElementById("hours");
    let hours = hours_element.value;
    const minutes_element = document.getElementById("minutes");
    let minutes = minutes_element.value;
    const is_important_element = document.getElementById("isImportant");
    const is_important = is_important_element.checked;

    const is_urgent_element = document.getElementById("isUrgent");
    const is_urgent = is_urgent_element.checked;
    const date = new Date()
    const time_element = document.getElementById("startTime");
    const time = time_element.value;
    let activities = []
    document.querySelectorAll(".formActivityItem").forEach(item => {
        if (item.children[0].checked){
            const activity_name = item.children[1].innerHTML;
            activities.push(activity_name);
        }
    })

    // convert hours and min to 0 if not entered
    if (minutes==0){
        minutes=0
    }
    else if (hours==0){
        hours=0
    }
    // check data
    if (task=="")
    {
        error_element.innerHTML ="Please enter a task."
        return 0;
    }
    else if ( hours==0 &&  minutes==0)
    {
        error_element.innerHTML ="Add a duration."
        return 0;
    }
    else if ( !(0<=hours<=12)){
        error_element.innerHTML ="Duration hours must be between 0-12"
        return 0;
    }
    else if ( !(0<=minutes<=59)){
        error_element.innerHTML ="Duration minutes must be between 0-59"
        return 0;
    }

    if (!date){
        error_element.innerHTML="Add start date."
        return 0;
    }
    if (!time) {
        error_element.innerHTML="Add start time."
        return 0;
    }
    // clear form
    task_element.value = "";
    hours_element.value = "";
    minutes_element.value = "";
    is_important_element.checked = false;
    is_urgent_element.checked = false;
    document.querySelectorAll(".formActivityItem").forEach(item => {
        item.children[0].checked = false
    })

    // send data to server
    let csrftoken = getCookie('csrftoken');
    fetch('/schedule_task', {
        method: 'POST',
        body: JSON.stringify({
          task: task,
          hours: hours,
          minutes: minutes,
          is_important: is_important,
          is_urgent: is_urgent,
          date: date,
          time: time,
          activities: activities,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
    .then(response => response.json())
    .then(result => {
        console.log(result);
        error_element.innerHTML = result.message;
        if (result.status==201) {
            append_scheduled_task(task, activities, result.start_time, result.end_time, is_important, is_urgent, result.task_id, time)
        }
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 
}

function delete_scheduled_task(task) {
    const task_id = task.children[4].innerHTML;
    task.style.opacity = 0;
    task.style.animationPlayState = 'running';
    task.addEventListener('animationend', () =>  {
        task.remove();
    });
    let csrftoken = getCookie('csrftoken');
    fetch('/delete_scheduled_task', {
        method: 'POST',
        body: JSON.stringify({
          task_id: task_id,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
    .then(response => response.json())
    .then(result => {
        console.log(result);
        console.log(result.status)
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 

}

// The following function is copied from 
// https://docs.djangoproject.com/en/dev/ref/csrf/#ajax
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


// tracks delete buttons to delete tasks
// called on adding new task and loading dom
function track_deleting_scheduled() {
    // keep track if user deletes task
    document.querySelectorAll('.deleteScheduledTask').forEach(button => {
        button.onclick = () => {
            const task = button.parentElement.parentElement.parentElement;
            delete_scheduled_task(task);
        };
    });
}




// append task to dom without reloading the page
function append_scheduled_task(task, activities, start_time, end_time, is_important, is_urgent, task_id, start_time_str) {
    //create the element to be appended
    const node = document.getElementById("scheduledTaskLayout");
    const clone = node.cloneNode(true);
    clone.classList.add("task");
    clone.removeAttribute("id");
    clone.children[0].children[0].children[1].children[0].innerHTML = task;
    const activities_element = clone.children[0].children[0].children[1].children[1]
    activities.forEach(activity => {
        let x = activities_element.innerHTML;
        activities_element.innerHTML = `${x}${activity} `
    });
    clone.children[1].innerHTML = `${start_time}-${end_time}`;
    
    if (!is_urgent){
        clone.children[2].children[1].remove();
        clone.children[6].innerHTML = "False";
    }
    else {
        clone.children[6].innerHTML = "True";
    }
    
    if (!is_important){
        clone.children[2].children[0].remove();
        clone.children[5].innerHTML = "False";
    }
    else {
        clone.children[5].innerHTML = "True";
    }

    clone.children[4].innerHTML = `${task_id}`;
    clone.children[7].innerHTML = `${start_time_str}`;

    //set to true when task is appended so no duplicates are made
    let done = false;
    const task_parent = document.getElementById("scheduleList");
    //find location to append clone
    document.querySelectorAll(".task").forEach(task => {
        if (done){
            return 0
        }
        
        let task_start_time = task.children[7].innerHTML;
        if (start_time_str <= task_start_time){
            task_parent.insertBefore(clone, task)
            done=true
        }

    });
    if (!done) {
        task_parent.appendChild(clone);
        done=true;
    }
    track_deleting_scheduled();
    track_play_buttons();
}

// tracks play buttons to start a task.
function track_play_buttons() {
    document.querySelectorAll(".playButton").forEach(button => {
        button.onclick = () => {
            // stops and adds task that is currently running 
            add_previous_entry();
            const task = button.parentElement.parentElement.parentElement;
            const header = document.getElementById("header");
            header.children[0].children[1].value = task.children[0].children[0].children[1].children[0].innerHTML;
            if (task.children[5].innerHTML == "True"){
                header.children[1].children[1].children[0].children[0].checked = true;
            }
            else{
                header.children[1].children[1].children[0].children[0].checked = false;
            }
            if (task.children[6].innerHTML == "True"){
                header.children[1].children[1].children[1].children[0].checked = true;
            }
            else{
                header.children[1].children[1].children[1].children[0].checked = false;
            }
            activities = task.children[0].children[0].children[1].children[1].innerHTML.split(" ");
            // since the total no of activites will always be small so O(n^2) is not a problem
            document.querySelectorAll(".activityItem").forEach(item => {
                item.children[0].checked=false;
                activities.forEach(activity => {
                    if (item.children[1].innerHTML==activity){
                        item.children[0].checked=true
                    }
                })
            });
            start_task();
        }
    });
}







// tracks stop button when a task is in running state 
function track_stop_button(){
    document.getElementById("stopButton").onclick = () => {
        disable_play_buttons(false);
        const tracker= document.getElementById("scheduleList").children[0]
        const task = tracker.children[0].children[0].children[1].children[0].innerHTML;
        const is_urgent = tracker.children[7].innerHTML;
        const is_important = tracker.children[6].innerHTML;
        const date = tracker.children[8].innerHTML;
        const time = tracker.children[9].innerHTML;
        const present = new Date()
        const end_time = present.toLocaleTimeString('en-US', { hour: 'numeric', minute:'numeric', hour12:false });
        const end_date = present.toISOString().split("T")[0];
        console.log(date, time)
        console.log(end_date, end_time)

        // send request to add new item to history
        let csrftoken = getCookie('csrftoken');
        fetch('/history', {
            method: 'POST',
            body: JSON.stringify({
            task: task,
            is_important: is_important,
            is_urgent: is_urgent,
            date: date,
            time: time,
            end_time: end_time,
            end_date: end_date,
            }),
            headers: { "X-CSRFToken": csrftoken },
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            if (result.status==201) {
                document.getElementById("scheduleList").children[0].remove();
            }
        })
        .catch(error => {
            console.log(error);
        });
    }
}


//close menu for outside click
document.addEventListener("click", function(event) {
    const activities_box = document.getElementById("activities");
    const schedule_box = document.getElementById("schedules");
    if (event.target.closest("#activities")) return
    if(event.target.closest("#menu-button")) {
        schedule_box.hidden = true;
        return;
    }
    if (event.target.closest("#schedules")) return
    if(event.target.closest("#schedule-menu-button")) {
        activities_box.hidden = true;
        return 
    }
    schedule_box.hidden = true;
    activities_box.hidden = true;
});