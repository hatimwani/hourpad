document.addEventListener("DOMContentLoaded", function() {
    // keep track if user deletes task
    document.querySelectorAll('.deleteSchedule').forEach(button => {
        button.onclick = () => {
            const task = button.parentElement.parentElement;
            delete_schedule(task);
        };
    });
    document.querySelectorAll('.deleteActivity').forEach(button => {
        button.onclick = () => {
            const task = button.parentElement.parentElement;
            delete_activity(task);
        };
    });

});



function delete_schedule(task) {
    const task_id = task.children[2].innerHTML;
    console.log(task_id)
    task.style.opacity = 0;
    task.style.animationPlayState = 'running';
    task.addEventListener('animationend', () =>  {
        task.remove();
    });
    let csrftoken = getCookie('csrftoken');
    fetch('/manage', {
        method: 'POST',
        body: JSON.stringify({
            schedule_id: task_id,
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


function delete_activity(task) {
    const task_id = task.children[2].innerHTML;
    console.log(task_id)
    task.style.opacity = 0;
    task.style.animationPlayState = 'running';
    task.addEventListener('animationend', () =>  {
        task.remove();
    });
    let csrftoken = getCookie('csrftoken');
    fetch('/delete_activity', {
        method: 'POST',
        body: JSON.stringify({
            activity_id: task_id,
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


