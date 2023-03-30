document.addEventListener("DOMContentLoaded", function() {
    fill_start_date();
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
    track_local_store();
    track_deleting_scheduled();
    track_play_buttons();
    toggle_activities();
    document.getElementById("addActivityButton").onclick = add_activity;
    document.getElementById("headPlayButton").onclick = start_task;
    document.getElementById("stopButton").onclick = add_time_entry;
    document.getElementById("startDate").valueAsDate = new Date();
    document.getElementById("addScheduledTaskButton").onclick = add_manual_entry;

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
    const end_time = new Date();
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
        if (result.status==201) {
            append_scheduled_task(task_title, activities, result.start_time, result.end_time, is_important, is_urgent, result.task_id, hours, minutes)
        }
    })
    .catch(error => {
        console.log(error);
    });
    return 1; 
}


// adds a new task to your history manaully
function add_manual_entry() { 
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
    let date = document.getElementById("startDate").value;
    date =date.split("-")
    const time_element = document.getElementById("startTime");
    let time = time_element.value;
    time = time.split(":")
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
    });


    // send data to server
    let csrftoken = getCookie('csrftoken');
    fetch('/timebook2', {
        method: 'POST',
        body: JSON.stringify({
          task: task,
          hours: hours,
          minutes: minutes,
          is_important: is_important,
          is_urgent: is_urgent,
          year: date[0],
          month: date[1],
          date: date[2],
          end_hour: time[0],
          end_minute: time[1],
          activities: activities,
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
      .then(response => response.json())
      .then(result => {
          console.log(result);
          if (result.status==201) {
              error_element.innerHTML = result.message;
              append_manual_task(task, activities, result.start_time, result.end_time, is_important, is_urgent, result.task_id, time, date, hours, minutes)
          }
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
    const task_title = task_name.value;
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
        if (result.status==201) {
            append_scheduled_task(task_title, activities, result.start_time, result.end_time, is_important, is_urgent, result.task_id, hours, minutes)
        }
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



// removes heading if no other no task is scheduled on that date
// used after deleting a task
function remove_date_heading(date){
    // change this var to false if we find a element which  belongs to the header date 
    let remove_header = true
    document.querySelectorAll(".task").forEach(task => {
        if (!remove_header){
            return 0;
        }
        const start_date = task.children[9].innerHTML
        if (start_date == date){
            remove_header = false;
            return 0;
        }
    });
    if (remove_header) {
        document.querySelectorAll(".startDate").forEach(node => {
            if (node.children[0].innerHTML == date){
                node.remove()
            }    
        });
    }
    
}


function delete_scheduled_task(task) {
    const task_id = task.children[5].innerHTML;
    date = task.children[9].innerHTML;
    console.log(task_id)
    // remove_date_heading removes by checking if some task has the same that as heading
    task.children[9].innerHTML = "";
    task.style.opacity = 0;
    task.style.animationPlayState = 'running';
    task.addEventListener('animationend', () =>  {
        task.remove();
        remove_date_heading(date);
    });

    let csrftoken = getCookie('csrftoken');
    fetch('/delete_time_entry', {
        method: 'POST',
        body: JSON.stringify({
          task_id: task_id,
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
function append_scheduled_task(task, activities, start_time, end_time, is_important, is_urgent, task_id, duration_hours, duration_minutes) {
    //create the element to be appended
    const start_time_object = new Date(localStorage.getItem('start'));
    let hours = start_time_object.getHours();
    let minutes = start_time_object.getMinutes();
    let month = start_time_object.getMonth() +1;
    let day = start_time_object.getDate();
    if (hours<10) hours=`0${hours}`;
    if (minutes<10) minutes=`0${minutes}`;
    if (month<10) month=`0${month}`;
    if (day<10) day=`0${day}`;
    const start_time_str = `${hours}:${minutes}`;
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
        clone.children[3].children[1].remove();
        clone.children[7].innerHTML = "False";
    }
    else {
        clone.children[7].innerHTML = "True";
    }
    
    if (!is_important){
        clone.children[3].children[0].remove();
        clone.children[6].innerHTML = "False";
    }
    else {
        clone.children[6].innerHTML = "True";
    }

    clone.children[5].innerHTML = `${task_id}`;
    clone.children[8].innerHTML = `${start_time_str}`;
    const date = `${start_time_object.getFullYear()}-${month}-${day}`;
    clone.children[9].innerHTML = date;
    clone.children[2].innerHTML = `${duration_hours}:${duration_minutes}:00`;
    const node2 = document.getElementById("startDateLayout");
    const clone2 = node2.cloneNode(true);
    clone2.removeAttribute("id");
    clone2.children[0].innerHTML = date;

    //set to true when task is appended so no duplicates are made
    let done = false;
    // used to know whether to add date heading
    // changed to false if a date heading required for task is already in DOM
    let add_date = true;
    const task_parent = document.getElementById("scheduleList");
    //find location to append clone
    document.querySelectorAll(".task").forEach(task => {
        if (done){
            return 0
        }
        
        let task_start_time = task.children[8].innerHTML;
        let task_date = task.children[9].innerHTML;
        console.log(task_date)
        console.log(date)
        if (task_date < date){
            const index = Array.from(task_parent.children).indexOf(task) -1;
            task_parent.insertBefore(clone, task_parent.children[index]);
            if (add_date) task_parent.insertBefore(clone2, task_parent.children[index]);
            done = true;
        }
        else if (task_date == date){
            add_date = false
            if (start_time_str >= task_start_time){
                task_parent.insertBefore(clone, task)
                done=true
            }
        }

    });
    if (!done) {
        if (add_date) task_parent.appendChild(clone2);       
        task_parent.appendChild(clone);
        done=true;
    }
    track_deleting_scheduled();
    track_play_buttons();
}

// append task to dom without reloading the page
function append_manual_task(task, activities, start_time, end_time, is_important, is_urgent, task_id, start_time_list, start_date_list, duration_hours, duration_minutes) {
    //create the element to be appended
    const start_time_str = `${start_time_list[0]}:${start_date_list}`;
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
        clone.children[3].children[1].remove();
        clone.children[7].innerHTML = "False";
    }
    else {
        clone.children[7].innerHTML = "True";
    }
    
    if (!is_important){
        clone.children[3].children[0].remove();
        clone.children[6].innerHTML = "False";
    }
    else {
        clone.children[6].innerHTML = "True";
    }

    clone.children[5].innerHTML = `${task_id}`;
    clone.children[8].innerHTML = `${start_time_str}`;
    const date = `${start_date_list[0]}-${start_date_list[1]}-${start_date_list[2]}`;
    clone.children[9].innerHTML = date;
    clone.children[2].innerHTML = `${duration_hours}:${duration_minutes}:00`;
    const node2 = document.getElementById("startDateLayout");
    const clone2 = node2.cloneNode(true);
    clone2.removeAttribute("id");
    clone2.children[0].innerHTML = date;

    //set to true when task is appended so no duplicates are made
    let done = false;
    // used to know whether to add date heading
    // changed to false if a date heading required for task is already in DOM
    let add_date = true;
    const task_parent = document.getElementById("scheduleList");
    //find location to append clone
    document.querySelectorAll(".task").forEach(task => {
        if (done){
            return 0
        }
        
        let task_start_time = task.children[8].innerHTML;
        let task_date = task.children[9].innerHTML;
        if (task_date < date){
            const index = Array.from(task_parent.children).indexOf(task) -1;
            task_parent.insertBefore(clone, task_parent.children[index]);
            if (add_date) task_parent.insertBefore(clone2, task_parent.children[index]);
            done = true;
        }
        else if (task_date == date){
            add_date = false
            if (start_time_str >= task_start_time){
                task_parent.insertBefore(clone, task)
                done=true
            }
        }

    });
    if (!done) {
        if (add_date) task_parent.appendChild(clone2);       
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
            if (task.children[6].innerHTML == "True"){
                header.children[1].children[1].children[0].children[0].checked = true;
            }
            else{
                header.children[1].children[1].children[0].children[0].checked = false;
            }
            if (task.children[7].innerHTML == "True"){
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


// wasn't able to do this with jinja because i couldn't change the value of varible in jinja  
// removes duplicates of date and keeps a single startdate for all tasks of same day
// called after loading the dom
function fill_start_date(){
    let start_date = ""
    document.querySelectorAll(".startDate").forEach(table_row => {
        if (start_date != table_row.children[0].innerHTML){
            start_date= table_row.children[0].innerHTML;
        }
        else {
            table_row.remove();
        }
    });
    document.getElementById("main").style.display = "block"
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


//close menu for outside click
document.addEventListener("click", function(event) {
    const activities_box = document.getElementById("activities");
    if (event.target.closest("#activities")) return
    if(event.target.closest("#menu-button")) return
    activities_box.hidden = true;
});