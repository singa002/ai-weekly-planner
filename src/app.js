// Application state
let tasks = [];
let nextTaskId = 1;

// Storage key for localStorage
const STORAGE_KEY = 'weeklyPlannerTasks';

// DOM element references
const taskTitleInput = document.getElementById('task-title');
const taskDaySelect = document.getElementById('task-day');
const taskPrioritySelect = document.getElementById('task-priority');
const addTaskButton = document.getElementById('add-task');
const totalTasksSpan = document.getElementById('total-tasks');
const completedTasksSpan = document.getElementById('completed-tasks');


// Date management
let currentWeekStart = null;

/**
 * Gets the Monday of the current week
 */
function getMondayOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Gets array of 7 dates starting from Monday
 */
function getWeekDates(mondayDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        dates.push(date);
    }
    return dates;
}

/**
 * Formats date for display (Mon, Jul 28)
 */
function formatDateDisplay(date) {
    const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Formats date for storage (2025-07-28)
 */
function formatDateStorage(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Gets week range display (July 28 - August 3, 2025)
 */
function getWeekRangeDisplay(mondayDate) {
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6);
    
    const startMonth = mondayDate.toLocaleDateString('en-US', { month: 'long' });
    const endMonth = sunday.toLocaleDateString('en-US', { month: 'long' });
    const year = mondayDate.getFullYear();
    
    if (startMonth === endMonth) {
        return `${startMonth} ${mondayDate.getDate()}-${sunday.getDate()}, ${year}`;
    } else {
        return `${startMonth} ${mondayDate.getDate()} - ${endMonth} ${sunday.getDate()}, ${year}`;
    }
}

/**
 * Navigate to previous week
 */
function goToPreviousWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeek(newWeekStart);
}

/**
 * Navigate to next week
 */
function goToNextWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeek(newWeekStart);
}

/**
 * Navigate to current week (today)
 */
function goToCurrentWeek() {
    setCurrentWeek(getMondayOfWeek());
}

/**
 * Sets the current week and updates display
 */
function setCurrentWeek(mondayDate) {
    currentWeekStart = mondayDate;
    updateWeekDisplay();
    updateDayHeaders();
    filterTasksForCurrentWeek();
}

/**
 * Updates the week range display in header
 */
function updateWeekDisplay() {
    const weekRangeElement = document.getElementById('week-range');
    if (weekRangeElement) {
        weekRangeElement.textContent = getWeekRangeDisplay(currentWeekStart);
    }
}

/**
 * Updates day headers with actual dates
 */
function updateDayHeaders() {
    const weekDates = getWeekDates(currentWeekStart);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach((day, index) => {
        const dayColumn = document.querySelector(`[data-day="${day}"]`);
        if (dayColumn) {
            const dayHeader = dayColumn.querySelector('h3');
            if (dayHeader) {
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                const dateDisplay = formatDateDisplay(weekDates[index]);
                dayHeader.textContent = dateDisplay;
            }
        }
    });
}

/**
 * Creates a new task objectc
 */
function createTask(title, day, priority) {
    return {
        id: nextTaskId++,
        title: title.trim(),
        day: day,
        priority: priority,
        completed: false,
        createdAt: new Date().toISOString().split('T')[0]
    };
}

/**
 * Adds a new task to the planner
 */
function addTask() {
    const title = taskTitleInput.value;
    const day = taskDaySelect.value;
    const priority = taskPrioritySelect.value;
    
    // Validate required fields
    if (!title) {
        alert('Please enter a task title');
        taskTitleInput.focus();
        return;
    }
    
    if (!day) {
        alert('Please select a day');
        taskDaySelect.focus();
        return;
    }
    
    // Create and store the task
    const newTask = createTask(title, day, priority);
    tasks.push(newTask);
    
    // Update the display
    displayTask(newTask);
    updateStatistics();
    clearForm();

    // Auto save after adding a task
    saveTasksToStorage();

    console.log('Task added:', newTask);
}

/**
 * Displays a task in the appropriate day column
 */
function displayTask(task) {
    const dayColumn = document.getElementById(`${task.day}-tasks`);
    
    if (!dayColumn) {
        console.error(`Could not find day column for: ${task.day}`);
        return;
    }
    
    const taskElement = document.createElement('div');
    taskElement.className = `task-item priority-${task.priority}`;
    taskElement.setAttribute('data-task-id', task.id);
    
    if (task.completed) {
        taskElement.classList.add('completed');
    }
    
    taskElement.innerHTML = `
        <div class="task-content">
            <span class="task-title">${task.title}</span>
            <div class="task-actions">
                <button class="complete-btn" onclick="toggleTaskCompletion(${task.id})">
                    ${task.completed ? '✓' : '○'}
                </button>
                <button class="delete-btn" onclick="deleteTask(${task.id})">
                    ✕
                </button>
            </div>
        </div>
    `;
    
    dayColumn.appendChild(taskElement);
    updateDayTaskCount(task.day);
}

/**
 * Displays all tasks (used for refreshing the view)
 */
function displayAllTasks() {
    // Clear existing tasks
    const taskLists = document.querySelectorAll('.task-list');
    taskLists.forEach(list => {
        list.innerHTML = '';
    });
    
    // Display each task
    tasks.forEach(task => {
        displayTask(task);
    });
    
    updateStatistics();
    updateAllDayTaskCounts();
}

/**
 * Toggles task completion status
 */
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
        console.error('Task not found:', taskId);
        return;
    }
    
    task.completed = !task.completed;
    
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
        if (task.completed) {
            taskElement.classList.add('completed');
        } else {
            taskElement.classList.remove('completed');
        }
        
        const completeBtn = taskElement.querySelector('.complete-btn');
        completeBtn.textContent = task.completed ? '✓' : '○';
    }
    
    updateStatistics();

    // Auto save after toggling a task
    saveTasksToStorage();
}

/**
 * Deletes a task after confirmation
 */
function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
        console.error('Task not found for deletion:', taskId);
        return;
    }
    
    const taskDay = tasks[taskIndex].day;
    tasks.splice(taskIndex, 1);
    
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
        taskElement.remove();
    }
    
    updateStatistics();
    updateDayTaskCount(taskDay);

    // Auto save after deleting a task
    saveTasksToStorage();
}

/**
 * Updates total and completed task statistics
 */
function updateStatistics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    totalTasksSpan.textContent = `Total tasks: ${totalTasks}`;
    completedTasksSpan.textContent = `Completed: ${completedTasks}`;
}

/**
 * Updates task count for a specific day
 */
function updateDayTaskCount(day) {
    const dayTaskCount = tasks.filter(task => task.day === day).length;
    const dayColumn = document.querySelector(`[data-day="${day}"]`);
    
    if (dayColumn) {
        const taskCountSpan = dayColumn.querySelector('.task-count');
        if (taskCountSpan) {
            taskCountSpan.textContent = `${dayTaskCount} task${dayTaskCount !== 1 ? 's' : ''}`;
        }
    }
}

/**
 * Updates task counts for all days
 */
function updateAllDayTaskCounts() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
        updateDayTaskCount(day);
    });
}

/**
 * Clears the task input form
 */
function clearForm() {
    taskTitleInput.value = '';
    taskDaySelect.value = '';
    taskPrioritySelect.value = 'medium';
    taskTitleInput.focus();
}

/**
 * Validates form and enables/disables add button
 */
function validateForm() {
    const title = taskTitleInput.value.trim();
    const day = taskDaySelect.value;
    
    addTaskButton.disabled = !title || !day;
}

/**
 * Sets up event listeners
 */
function initializeEventListeners() {
    addTaskButton.addEventListener('click', addTask);
    
    taskTitleInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addTask();
        }
    });
    
    taskTitleInput.addEventListener('input', validateForm);
    taskDaySelect.addEventListener('change', validateForm);
    
    validateForm();
}

/**
 * Saves tasks to localStorage
 */
function saveTasksToStorage() {
    try {
        const tasksJSON = JSON.stringify(tasks);
        localStorage.setItem(STORAGE_KEY, tasksJSON);
        console.log('Tasks saved to localStorage');
    } catch (error) {
        console.error('Error saving tasks to localStorage:', error);
        alert('Could not save tasks.');
    }
}

/**
 * Loads tasks from localStorage
 */
function loadTasksFromStorage() {
    try {
        const tasksJSON = localStorage.getItem(STORAGE_KEY);

        if (tasksJSON) {
            const loadedTasks = JSON.parse(tasksJSON);
           
            // Validate the loaded data
            if (Array.isArray(loadedTasks)) {
                tasks = loadedTasks;

                // Update nextTaskId to avoid conflicts
                if (tasks.length > 0) {
                    const maxId = Math.max(...tasks.map(task => task.id));
                    nextTaskId = maxId + 1;
                }
                
                console.log(`Loaded ${loadedTasks.length} tasks from localStorage`);
                return true;
            }
        }
        
        console.log('No saved tasks found');
        return false;
        
    } catch (error) {
        console.error('Failed to load tasks:', error);
        localStorage.removeItem(STORAGE_KEY);
        alert('Saved data is corrupted. Resetting tasks.');
        return false;
    }
}

/**
 * Clears all saved tasks from localStorage
 */
function clearStoredTasks() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('All tasks cleared from localStorage');
    } catch (error) {
        console.error('Failed to clear storage:', error);
    }
}

/**
 * Initializes the application
 */
function initializeApp() {
    console.log('Weekly Planner initialized');

    // Load saved tasks before setting up the UI
    const hasStoredTasks = loadTasksFromStorage();
    
    initializeEventListeners();

    // Display loaded tasks or start fresh
    if (hasStoredTasks) {
        displayAllTasks();
    } else {
        updateStatistics();
        updateAllDayTaskCounts();
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Utility functions for development/testing
function showAllTasks() {
    console.table(tasks);
}

function addSampleTasks() {
    const sampleTasks = [
        { title: "Morning workout", day: "monday", priority: "high" },
        { title: "Team meeting", day: "tuesday", priority: "medium" },
        { title: "Grocery shopping", day: "wednesday", priority: "low" },
        { title: "Project deadline", day: "friday", priority: "high" }
    ];
    
    sampleTasks.forEach(taskData => {
        const task = createTask(taskData.title, taskData.day, taskData.priority);
        tasks.push(task);
        displayTask(task);
    });
    
    updateStatistics();
    updateAllDayTaskCounts();
    saveTasksToStorage();
}