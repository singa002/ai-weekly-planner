// === APPLICATION STATE ===
let tasks = [];
let nextTaskId = 1;
let currentWeekStart = null;
const STORAGE_KEY = 'weeklyPlannerTasks';

// === DOM REFERENCES ===
let taskTitleInput;
let taskDaySelect;
let taskPrioritySelect;
let addTaskButton;
let prevWeekButton;
let nextWeekButton;
let currentWeekButton;
let weekRangeDisplay;

// === DATE UTILITIES ===
function getMondayOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setHours(0, 0, 0, 0);
    d.setDate(diff);
    return d;
}

function getWeekDates(mondayDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateStorage(date) {
    return date.toISOString().split('T')[0];
}

function formatWeekRange(mondayDate) {
    const weekDates = getWeekDates(mondayDate);
    const startDate = formatDateDisplay(weekDates[0]);
    const endDate = formatDateDisplay(weekDates[6]);
    const year = mondayDate.getFullYear();
    return `${startDate} - ${endDate}, ${year}`;
}

// === WEEK NAVIGATION ===
function setCurrentWeek(mondayDate) {
    currentWeekStart = new Date(mondayDate);
    updateWeekDisplay();
    updateDayHeaders();
    displayAllTasks();
}

function goToPreviousWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeek(newWeekStart);
}

function goToNextWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeek(newWeekStart);
}

function goToCurrentWeek() {
    const today = new Date();
    const mondayOfThisWeek = getMondayOfWeek(today);
    setCurrentWeek(mondayOfThisWeek);
}

// === TASK FACTORY (Factory Pattern) ===
class TaskFactory {
    static createTask(title, day, priority) {
        const weekDates = getWeekDates(currentWeekStart);
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayIndex = days.indexOf(day);
        const taskDate = weekDates[dayIndex];
        
        return {
            id: nextTaskId++,
            title: title.trim(),
            day: day,
            date: formatDateStorage(taskDate),
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString().split('T')[0]
        };
    }
}

// === TASK VALIDATION (Single Responsibility Principle) ===
class TaskValidator {
    static validateTitle(title) {
        if (!title || title.trim().length === 0) {
            return { valid: false, error: 'Task title cannot be empty' };
        }
        
        if (title.trim().length > 100) {
            return { valid: false, error: 'Task title cannot exceed 100 characters' };
        }
        
        return { valid: true };
    }
    
    static validateDay(day) {
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!validDays.includes(day)) {
            return { valid: false, error: 'Please select a valid day' };
        }
        
        return { valid: true };
    }
    
    static validatePriority(priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
            return { valid: false, error: 'Please select a valid priority' };
        }
        
        return { valid: true };
    }
}

// === TASK FILTERING (Single Responsibility Principle) ===
class TaskFilter {
    static getTasksForCurrentWeek() {
        const currentWeekStartString = formatDateStorage(currentWeekStart);
        const weekDates = getWeekDates(currentWeekStart);
        const weekDateStrings = weekDates.map(date => formatDateStorage(date));
        
        return tasks.filter(task => weekDateStrings.includes(task.date));
    }
    
    static getTasksForDay(day) {
        const currentWeekTasks = this.getTasksForCurrentWeek();
        return currentWeekTasks.filter(task => task.day === day);
    }
    
    static getCompletedTasks() {
        const currentWeekTasks = this.getTasksForCurrentWeek();
        return currentWeekTasks.filter(task => task.completed);
    }
}

// === TASK MANAGEMENT ===
function addTask() {
    const title = taskTitleInput.value;
    const day = taskDaySelect.value;
    const priority = taskPrioritySelect.value;
    
    // Validate all inputs using validator
    const titleValidation = TaskValidator.validateTitle(title);
    if (!titleValidation.valid) {
        alert(titleValidation.error);
        taskTitleInput.focus();
        return;
    }
    
    const dayValidation = TaskValidator.validateDay(day);
    if (!dayValidation.valid) {
        alert(dayValidation.error);
        taskDaySelect.focus();
        return;
    }
    
    const priorityValidation = TaskValidator.validatePriority(priority);
    if (!priorityValidation.valid) {
        alert(priorityValidation.error);
        return;
    }
    
    // Create task using factory
    const task = TaskFactory.createTask(title, day, priority);
    tasks.push(task);
    
    // Save and update display
    StorageManager.saveTasks();
    displayAllTasks();
    clearForm();
    
    console.log('Task added:', task);
}

function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        StorageManager.saveTasks();
        displayAllTasks();
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== taskId);
        StorageManager.saveTasks();
        displayAllTasks();
    }
}

// === TASK EDITING ===
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    
    if (!task || !taskElement) return;
    
    if (taskElement.classList.contains('editing')) {
        return;
    }
    
    const titleElement = taskElement.querySelector('.task-title');
    if (!titleElement) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.title;
    input.maxLength = 100;
    
    taskElement.classList.add('editing');
    titleElement.parentNode.replaceChild(input, titleElement);
    
    input.focus();
    input.select();
    
    setupEditEventListeners(taskId, input, task.title);
}

function setupEditEventListeners(taskId, input, originalTitle) {
    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTaskEdit(taskId, input.value.trim());
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelTaskEdit(taskId, originalTitle);
        }
    };
    
    const handleBlur = () => {
        setTimeout(() => {
            saveTaskEdit(taskId, input.value.trim());
        }, 100);
    };
    
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('blur', handleBlur);
    
    input._editListeners = { handleKeydown, handleBlur };
}

function saveTaskEdit(taskId, newTitle) {
    const validation = TaskValidator.validateTitle(newTitle);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const oldTitle = task.title;
        task.title = newTitle;
        
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('saving');
        }
        
        try {
            StorageManager.saveTasks();
            
            if (taskElement) {
                taskElement.classList.remove('saving');
                taskElement.classList.add('updated');
                setTimeout(() => {
                    taskElement.classList.remove('updated');
                }, 600);
            }
        } catch (error) {
            task.title = oldTitle;
            alert('Failed to save changes. Please try again.');
        }
    }
    
    exitEditMode(taskId);
    displayAllTasks();
}

function cancelTaskEdit(taskId, originalTitle) {
    exitEditMode(taskId);
    displayAllTasks();
}

function exitEditMode(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
        taskElement.classList.remove('editing', 'saving');
        
        const input = taskElement.querySelector('.task-edit-input');
        if (input && input._editListeners) {
            input.removeEventListener('keydown', input._editListeners.handleKeydown);
            input.removeEventListener('blur', input._editListeners.handleBlur);
        }
    }
}

// === DISPLAY UTILITIES ===
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    taskElement.setAttribute('data-task-id', task.id);
    
    taskElement.innerHTML = `
        <div class="task-content">
            <span class="task-title" ondblclick="editTask(${task.id})">${task.title}</span>
            <div class="task-actions">
                <button class="complete-btn" onclick="toggleTaskCompletion(${task.id})" title="Toggle completion">
                    ${task.completed ? '✓' : '○'}
                </button>
                <button class="delete-btn" onclick="deleteTask(${task.id})" title="Delete task">
                    ×
                </button>
            </div>
        </div>
    `;
    
    return taskElement;
}

function displayTask(task) {
    const taskElement = createTaskElement(task);
    const dayColumn = document.getElementById(`${task.day}-tasks`);
    if (dayColumn) {
        dayColumn.appendChild(taskElement);
    }
}

function clearAllTaskDisplays() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
        const dayColumn = document.getElementById(`${day}-tasks`);
        if (dayColumn) {
            dayColumn.innerHTML = '';
        }
    });
}

function displayAllTasks() {
    clearAllTaskDisplays();
    
    const currentWeekTasks = TaskFilter.getTasksForCurrentWeek();
    currentWeekTasks.forEach(task => {
        displayTask(task);
    });
    
    updateTaskCounts();
    updateStatistics();
}

// === UI UPDATES ===
function updateWeekDisplay() {
    if (weekRangeDisplay && currentWeekStart) {
        weekRangeDisplay.textContent = formatWeekRange(currentWeekStart);
    }
}

function updateDayHeaders() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekDates = getWeekDates(currentWeekStart);
    
    days.forEach((day, index) => {
        const dayColumn = document.querySelector(`[data-day="${day}"]`);
        if (dayColumn) {
            const header = dayColumn.querySelector('h3');
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            const dateStr = formatDateDisplay(weekDates[index]);
            
            if (header) {
                header.textContent = `${dayName}`;
                header.title = dateStr;
            }
        }
    });
}

function updateTaskCounts() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        const dayTasks = TaskFilter.getTasksForDay(day);
        const taskCountElement = document.querySelector(`[data-day="${day}"] .task-count`);
        
        if (taskCountElement) {
            const count = dayTasks.length;
            taskCountElement.textContent = count === 1 ? '1 task' : `${count} tasks`;
        }
    });
}

function updateStatistics() {
    const currentWeekTasks = TaskFilter.getTasksForCurrentWeek();
    const completedTasks = TaskFilter.getCompletedTasks();
    
    const totalTasksElement = document.getElementById('total-tasks');
    const completedTasksElement = document.getElementById('completed-tasks');
    
    if (totalTasksElement) {
        totalTasksElement.textContent = `Total tasks: ${currentWeekTasks.length}`;
    }
    
    if (completedTasksElement) {
        completedTasksElement.textContent = `Completed: ${completedTasks.length}`;
    }
}

function clearForm() {
    taskTitleInput.value = '';
    taskDaySelect.value = '';
    taskPrioritySelect.value = 'medium';
    taskTitleInput.focus();
}

// === STORAGE MANAGER (Single Responsibility Principle) ===
class StorageManager {
    static saveTasks() {
        try {
            const tasksJSON = JSON.stringify(tasks);
            localStorage.setItem(STORAGE_KEY, tasksJSON);
            console.log('Tasks saved to localStorage');
        } catch (error) {
            console.error('Error saving tasks to localStorage:', error);
            throw new Error('Could not save tasks');
        }
    }
    
    static loadTasks() {
        try {
            const tasksJSON = localStorage.getItem(STORAGE_KEY);
            if (tasksJSON) {
                const loadedTasks = JSON.parse(tasksJSON);
                
                if (Array.isArray(loadedTasks)) {
                    tasks = loadedTasks;
                    
                    if (tasks.length > 0) {
                        nextTaskId = Math.max(...tasks.map(task => task.id)) + 1;
                    }
                    
                    console.log(`Loaded ${tasks.length} tasks from localStorage`);
                    return true;
                }
            }
        } catch (error) {
            console.error('Error loading tasks from localStorage:', error);
            alert('Could not load saved tasks. Starting fresh.');
        }
        
        return false;
    }
    
    static clearTasks() {
        if (confirm('Are you sure you want to clear all tasks? This cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEY);
            tasks = [];
            nextTaskId = 1;
            displayAllTasks();
            console.log('All tasks cleared');
        }
    }
}

// === EVENT HANDLERS ===
function initializeEventListeners() {
    addTaskButton.addEventListener('click', addTask);
    
    taskTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    prevWeekButton.addEventListener('click', goToPreviousWeek);
    nextWeekButton.addEventListener('click', goToNextWeek);
    currentWeekButton.addEventListener('click', goToCurrentWeek);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            taskTitleInput.focus();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
            goToPreviousWeek();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
            goToNextWeek();
        }
    });
}

function cacheDOMElements() {
    taskTitleInput = document.getElementById('task-title');
    taskDaySelect = document.getElementById('task-day');
    taskPrioritySelect = document.getElementById('task-priority');
    addTaskButton = document.getElementById('add-task');
    prevWeekButton = document.getElementById('prev-week-btn');
    nextWeekButton = document.getElementById('next-week-btn');
    currentWeekButton = document.getElementById('current-week-btn');
    weekRangeDisplay = document.getElementById('week-range');
}

// === APPLICATION LIFECYCLE ===
function initializeApp() {
    console.log('Initializing Weekly Planner...');
    
    cacheDOMElements();
    StorageManager.loadTasks();
    
    const today = new Date();
    const mondayOfThisWeek = getMondayOfWeek(today);
    setCurrentWeek(mondayOfThisWeek);
    
    initializeEventListeners();
    
    if (taskTitleInput) {
        taskTitleInput.focus();
    }
    
    console.log('Weekly Planner initialized successfully');
}

// === DEVELOPMENT UTILITIES ===
function showAllTasks() {
    console.log('All tasks:', tasks);
    console.table(tasks);
}

function addSampleTasks() {
    if (tasks.length === 0) {
        const sampleTasks = [
            { title: 'Team meeting', day: 'monday', priority: 'high' },
            { title: 'Code review', day: 'tuesday', priority: 'medium' },
            { title: 'Weekly planning', day: 'friday', priority: 'medium' }
        ];
        
        sampleTasks.forEach(taskData => {
            const task = TaskFactory.createTask(taskData.title, taskData.day, taskData.priority);
            tasks.push(task);
        });
        
        StorageManager.saveTasks();
        displayAllTasks();
        console.log('Sample tasks added');
    } else {
        console.log('Tasks already exist. Clear them first to add samples.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);