
const API_URL = "/api/tasks/";

let tasks = [];
let calendarDate = new Date();
let selectedDate = getLocalDateString(new Date());

// ========================================
// HTML SAFETY
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// ========================================
// DATE HELPERS
// ========================================

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function validDate(date) {
    if (!date) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

    const parsed = new Date(date + "T00:00:00");

    return !Number.isNaN(parsed.getTime()) &&
        getLocalDateString(parsed) === date;
}

function formatDate(date) {
    if (!date) return "No deadline";

    const [year, month, day] = date.split("-");
    return `${day}-${month}-${year}`;
}

// ========================================
// STATUS
// ========================================

function normalizeStatus(status) {
    const value = String(status || "todo")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    if (["progress", "in_progress", "inprogress"].includes(value)) {
        return "progress";
    }

    if (["completed", "complete", "done"].includes(value)) {
        return "completed";
    }

    return "todo";
}

// ========================================
// DASHBOARD STATISTICS
// ========================================

function updateStatistics() {
    const total = tasks.length;

    const todo = tasks.filter(
        task => normalizeStatus(task.status) === "todo"
    ).length;

    const progress = tasks.filter(
        task => normalizeStatus(task.status) === "progress"
    ).length;

    const completed = tasks.filter(
        task => normalizeStatus(task.status) === "completed"
    ).length;

    const elements = {
        total: document.getElementById("total"),
        todo: document.getElementById("todo"),
        progress: document.getElementById("progress"),
        completed: document.getElementById("completed")
    };

    if (elements.total) elements.total.textContent = total;
    if (elements.todo) elements.todo.textContent = todo;
    if (elements.progress) elements.progress.textContent = progress;
    if (elements.completed) elements.completed.textContent = completed;
}

// ========================================
// LOAD TASKS
// ========================================

async function loadTasks() {
    try {
        const response = await fetch(API_URL);

        if (response.status === 401) {
            window.location.href = "/login";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load tasks");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid task data");
        }

        tasks = data;

        renderTasks();
        renderMyTasks();
        renderCalendar();

    } catch (error) {
        console.error("Load tasks error:", error);
        alert("Could not connect to TaskFlow database.");
    }
}

// ========================================
// CREATE TASK
// ========================================

async function addTask() {
    const title = prompt("Enter task title:");

    if (!title || !title.trim()) return;

    const description = prompt("Enter task description:") || "";

    const priority = prompt(
        "Priority: low, medium, or high",
        "medium"
    );

    if (priority === null) return;

    const cleanPriority = priority.trim().toLowerCase();

    if (!["low", "medium", "high"].includes(cleanPriority)) {
        alert("Enter low, medium, or high.");
        return;
    }

    const dueDate = prompt(
        "Enter due date (YYYY-MM-DD), or leave blank:"
    ) || "";

    if (!validDate(dueDate)) {
        alert("Invalid date. Use YYYY-MM-DD.");
        return;
    }

    const newTask = {
        title: title.trim(),
        description: description.trim(),
        status: "todo",
        priority: cleanPriority,
        due_date: dueDate || null
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newTask)
        });

        if (!response.ok) {
            throw new Error("Task creation failed");
        }

        await loadTasks();

    } catch (error) {
        console.error("Create task error:", error);
        alert("Could not create task.");
    }
}

// ========================================
// EDIT TASK
// ========================================

async function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    const title = prompt("Enter new task title:", task.title);

    if (title === null || !title.trim()) return;

    const description = prompt(
        "Enter new description:",
        task.description || ""
    );

    if (description === null) return;

    const priority = prompt(
        "Priority: low, medium, or high",
        task.priority || "medium"
    );

    if (priority === null) return;

    const cleanPriority = priority.trim().toLowerCase();

    if (!["low", "medium", "high"].includes(cleanPriority)) {
        alert("Enter low, medium, or high.");
        return;
    }

    const dueDate = prompt(
        "Enter due date (YYYY-MM-DD), or leave blank:",
        task.due_date || ""
    );

    if (dueDate === null) return;

    if (!validDate(dueDate)) {
        alert("Invalid date. Use YYYY-MM-DD.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title.trim(),
                description: description.trim(),
                priority: cleanPriority,
                due_date: dueDate || null
            })
        });

        if (!response.ok) {
            throw new Error("Task update failed");
        }

        await loadTasks();
        alert("Task updated successfully!");

    } catch (error) {
        console.error("Edit task error:", error);
        alert("Could not edit task.");
    }
}

// ========================================
// CHANGE TASK STATUS
// ========================================

async function changeStatus(id, status) {
    if (!["todo", "progress", "completed"].includes(status)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error("Status update failed");
        }

        await loadTasks();

    } catch (error) {
        console.error("Change status error:", error);
        alert("Could not update task.");
    }
}

// ========================================
// DELETE TASK
// ========================================

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        await loadTasks();

    } catch (error) {
        console.error("Delete task error:", error);
        alert("Could not delete task.");
    }
}

// ========================================
// SEARCH AND FILTERS
// ========================================

function getFilteredTasks() {
    const searchInput = document.getElementById("task-search");
    const priorityFilter = document.getElementById("priority-filter");
    const statusFilter = document.getElementById("status-filter");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const priorityValue = priorityFilter
        ? priorityFilter.value
        : "all";

    const statusValue = statusFilter
        ? statusFilter.value
        : "all";

    return tasks.filter(task => {
        const title = String(task.title || "").toLowerCase();
        const description = String(task.description || "").toLowerCase();
        const priority = String(task.priority || "medium").toLowerCase();
        const status = normalizeStatus(task.status);

        return (
            (title.includes(searchText) ||
                description.includes(searchText)) &&
            (priorityValue === "all" || priority === priorityValue) &&
            (statusValue === "all" || status === statusValue)
        );
    });
}

// ========================================
// RENDER DASHBOARD
// ========================================

function renderTasks() {
    const todoList = document.getElementById("todo-list");
    const progressList = document.getElementById("progress-list");
    const completedList = document.getElementById("completed-list");

    if (!todoList || !progressList || !completedList) return;

    todoList.innerHTML = "";
    progressList.innerHTML = "";
    completedList.innerHTML = "";

    const filteredTasks = getFilteredTasks();

    filteredTasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task";

        const status = normalizeStatus(task.status);

        card.innerHTML = `
            <h4>${escapeHTML(task.title)}</h4>
            <p>${escapeHTML(task.description || "")}</p>
            <p>Priority: <strong>${escapeHTML(task.priority || "medium")}</strong></p>
            <p>📅 Due: ${escapeHTML(formatDate(task.due_date))}</p>

            <select onchange="changeStatus(${Number(task.id)}, this.value)">
                <option value="todo" ${status === "todo" ? "selected" : ""}>To Do</option>
                <option value="progress" ${status === "progress" ? "selected" : ""}>In Progress</option>
                <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
            </select>

            <button onclick="editTask(${Number(task.id)})">Edit</button>
            <button class="delete-btn" onclick="deleteTask(${Number(task.id)})">Delete</button>
        `;

        if (status === "todo") {
            todoList.appendChild(card);
        } else if (status === "progress") {
            progressList.appendChild(card);
        } else {
            completedList.appendChild(card);
        }
    });

    if (todoList.children.length === 0) {
        todoList.innerHTML = '<p class="empty-message">No matching tasks</p>';
    }

    if (progressList.children.length === 0) {
        progressList.innerHTML = '<p class="empty-message">No matching tasks</p>';
    }

    if (completedList.children.length === 0) {
        completedList.innerHTML = '<p class="empty-message">No matching tasks</p>';
    }

    updateStatistics();

    const searchInput = document.getElementById("task-search");
    const priorityFilter = document.getElementById("priority-filter");
    const statusFilter = document.getElementById("status-filter");
    const clearButton = document.getElementById("clear-search");
    const searchInfo = document.getElementById("search-info");

    const searchText = searchInput ? searchInput.value.trim() : "";
    const priority = priorityFilter ? priorityFilter.value : "all";
    const status = statusFilter ? statusFilter.value : "all";

    const filtersActive =
        searchText !== "" || priority !== "all" || status !== "all";

    if (clearButton) {
        clearButton.style.display = searchText ? "block" : "none";
    }

    if (searchInfo) {
        searchInfo.textContent = filtersActive
            ? `${filteredTasks.length} matching task(s) found`
            : `Showing all ${tasks.length} task(s)`;
    }
}

// ========================================
// MY TASKS PAGE
// ========================================

function renderMyTasks() {
    const container = document.getElementById("all-tasks-list");

    if (!container) return;

    container.innerHTML = "";

    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        container.innerHTML =
            '<p class="empty-message">No tasks available. Create your first task!</p>';
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task";

        card.innerHTML = `
            <h3>${escapeHTML(task.title)}</h3>
            <p>${escapeHTML(task.description || "No description")}</p>
            <p>Priority: ${escapeHTML(task.priority || "medium")}</p>
            <p>Status: ${escapeHTML(normalizeStatus(task.status))}</p>
            <p>Due: ${escapeHTML(formatDate(task.due_date))}</p>

            <button onclick="editTask(${Number(task.id)})">Edit</button>
            <button class="delete-btn" onclick="deleteTask(${Number(task.id)})">Delete</button>
        `;

        container.appendChild(card);
    });
}

// ========================================
// CALENDAR NAVIGATION
// ========================================

function changeCalendarMonth(amount) {
    calendarDate = new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth() + amount,
        1
    );

    selectedDate = getLocalDateString(calendarDate);
    renderCalendar();
}

function goToToday() {
    const today = new Date();

    calendarDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    selectedDate = getLocalDateString(today);
    renderCalendar();
}

// ========================================
// RENDER CALENDAR
// ========================================

function renderCalendar() {
    const calendarGrid = document.getElementById("calendar-grid");

    if (!calendarGrid) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthName = calendarDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric"
    });

    const monthElement = document.getElementById("calendar-month");

    if (monthElement) {
        monthElement.textContent = monthName;
    }

    calendarGrid.innerHTML = `
        <div class="weekday">Sun</div>
        <div class="weekday">Mon</div>
        <div class="weekday">Tue</div>
        <div class="weekday">Wed</div>
        <div class="weekday">Thu</div>
        <div class="weekday">Fri</div>
        <div class="weekday">Sat</div>
    `;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    const visibleTasks = getFilteredTasks();
    const todayString = getLocalDateString(new Date());

    for (let index = 0; index < 42; index++) {
        let day;
        let cellDate;
        let outsideMonth = false;

        if (index < firstDay) {
            day = previousMonthDays - firstDay + index + 1;
            cellDate = new Date(year, month - 1, day);
            outsideMonth = true;
        } else if (index >= firstDay + daysInMonth) {
            day = index - firstDay - daysInMonth + 1;
            cellDate = new Date(year, month + 1, day);
            outsideMonth = true;
        } else {
            day = index - firstDay + 1;
            cellDate = new Date(year, month, day);
        }

        const dateString = getLocalDateString(cellDate);

        const dateTasks = visibleTasks.filter(
            task => task.due_date === dateString
        );

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";

        if (outsideMonth) cell.classList.add("outside-month");
        if (dateString === todayString) cell.classList.add("today");
        if (dateString === selectedDate) cell.classList.add("selected");

        const taskLabels = dateTasks.slice(0, 2).map(task => `
            <span class="calendar-task ${escapeHTML(task.priority || "medium")}">
                ${escapeHTML(task.title)}
            </span>
        `).join("");

        const extraTasks = dateTasks.length > 2
            ? `<span class="more-tasks">+${dateTasks.length - 2} more</span>`
            : "";

        cell.innerHTML = `
            <span class="day-number">${day}</span>
            ${taskLabels}
            ${extraTasks}
        `;

        cell.addEventListener("click", () => {
            selectedDate = dateString;

            calendarDate = new Date(
                cellDate.getFullYear(),
                cellDate.getMonth(),
                1
            );

            renderCalendar();
        });

        calendarGrid.appendChild(cell);
    }

    renderSelectedDateTasks();
}

// ========================================
// SELECTED DATE TASKS
// ========================================

function renderSelectedDateTasks() {
    const title = document.getElementById("selected-date-title");
    const container = document.getElementById("selected-date-tasks");

    if (!title || !container) return;

    const dateTasks = getFilteredTasks().filter(
        task => task.due_date === selectedDate
    );

    title.textContent = `Tasks for ${formatDate(selectedDate)}`;
    container.innerHTML = "";

    if (dateTasks.length === 0) {
        container.innerHTML =
            '<p class="empty-message">No tasks scheduled for this date.</p>';
        return;
    }

    dateTasks.forEach(task => {
        const event = document.createElement("div");
        event.className = "calendar-event";

        event.innerHTML = `
            <h4>${escapeHTML(task.title)}</h4>
            <p>${escapeHTML(task.description || "No description")}</p>
            <p>Priority: ${escapeHTML(task.priority || "medium")}</p>
            <p>Status: ${escapeHTML(normalizeStatus(task.status))}</p>

            <button onclick="editTask(${Number(task.id)})">Edit Task</button>
            <button class="delete-btn" onclick="deleteTask(${Number(task.id)})">Delete</button>
        `;

        container.appendChild(event);
    });
}

// ========================================
// SIDEBAR NAVIGATION
// ========================================

function openPage(targetId) {
    const navigationLinks = document.querySelectorAll(
        ".sidebar a[data-view]"
    );

    const workspaceViews = document.querySelectorAll(".workspace-view");

    const selectedPage = document.getElementById(targetId);

    const pageDetails = {
        "dashboard-view": [
            "Dashboard",
            "Manage your work and stay productive."
        ],
        "my-tasks-view": [
            "My Tasks",
            "View and manage all your personal tasks."
        ],
        "projects-view": [
            "Projects",
            "Create and manage your projects."
        ],
        "calendar-view": [
            "Calendar",
            "Plan your work and track upcoming deadlines."
        ],
        "settings-view": [
            "Settings",
            "Manage your account and preferences."
        ],
        "help-view": [
            "Help & Support",
            "Find answers and learn how to use TaskFlow."
        ]
    };

    const details = pageDetails[targetId];

    if (!selectedPage || !details) {
        console.error("Page not found:", targetId);
        return;
    }

    workspaceViews.forEach(view => {
        view.hidden = true;
    });

    selectedPage.hidden = false;

    navigationLinks.forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.view === targetId
        );
    });

    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");

    if (pageTitle) pageTitle.textContent = details[0];
    if (pageSubtitle) pageSubtitle.textContent = details[1];

    const searchSection = document.getElementById("search-section");

    if (searchSection) {
        searchSection.hidden = ![
            "dashboard-view",
            "calendar-view"
        ].includes(targetId);
    }

    const createButton = document.getElementById("create-task-button");

    if (createButton) {
        createButton.hidden = ![
            "dashboard-view",
            "my-tasks-view"
        ].includes(targetId);
    }

    if (targetId === "calendar-view") renderCalendar();
    if (targetId === "my-tasks-view") renderMyTasks();

    if (targetId === "projects-view" &&
        typeof loadProjects === "function") {
        loadProjects();
    }

    if (targetId === "settings-view" &&
        typeof loadSettings === "function") {
        loadSettings();
    }

    console.log("TaskFlow page opened:", targetId);
}

// ========================================
// INITIALIZE EVERYTHING
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("task-search");
    const priorityFilter = document.getElementById("priority-filter");
    const statusFilter = document.getElementById("status-filter");

    const clearSearch = document.getElementById("clear-search");
    const clearFilters = document.getElementById("clear-filters");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            renderTasks();
            renderMyTasks();
            renderCalendar();
        });
    }

    if (priorityFilter) {
        priorityFilter.addEventListener("change", () => {
            renderTasks();
            renderMyTasks();
            renderCalendar();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            renderTasks();
            renderMyTasks();
            renderCalendar();
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            renderTasks();
            renderMyTasks();
            renderCalendar();
        });
    }

    if (clearFilters) {
        clearFilters.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (priorityFilter) priorityFilter.value = "all";
            if (statusFilter) statusFilter.value = "all";

            renderTasks();
            renderMyTasks();
            renderCalendar();
        });
    }

    const previousMonth = document.getElementById("prev-month");
    const nextMonth = document.getElementById("next-month");
    const todayButton = document.getElementById("today-button");

    if (previousMonth) {
        previousMonth.addEventListener("click", () => {
            changeCalendarMonth(-1);
        });
    }

    if (nextMonth) {
        nextMonth.addEventListener("click", () => {
            changeCalendarMonth(1);
        });
    }

    if (todayButton) {
        todayButton.addEventListener("click", goToToday);
    }

    document.querySelectorAll(".sidebar a[data-view]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            openPage(link.dataset.view);
        });
    });

    // Load current user and task data
    openPage("dashboard-view");
    loadTasks();

});
