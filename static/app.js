function renderDashboard() {
  const grid = document.querySelector(".sticky-grid");
  grid.innerHTML = ""; // clear old notes

  fetchTasks().then(notes => {
    const activeTasks = notes.filter(note => !note.completed);

    activeTasks.forEach(note => {
      // Create sticky-note wrapper
      const sticky = document.createElement("div");
      sticky.className = "sticky-note";

      // Parse tasks if it's a string
      const taskList = typeof note.tasks === 'string' ? JSON.parse(note.tasks) : note.tasks;

      // Build sticky note HTML
      sticky.innerHTML = `
    <img src="/static/images/stickynotes.png" alt="Sticky note" />

    <div class="sticky-content">
      <h3>${note.title}</h3>

      ${taskList.map((task, index) => `
        <div class="task-row">
          <label>
            <input type="checkbox"
              ${task.done ? "checked" : ""}
              onchange="toggleTask(${note.id}, ${index})" />
            ${task.text}
          </label>

          <button
            type="button"
            class="remove-task-btn"
            onclick="removeTaskFromNote(${note.id}, ${index})"
            aria-label="Remove task">✕</button>
        </div>
      `).join("")}


      <!-- Edit section -->
      <div class="edit-section">
        <input
          type="text"
          placeholder="Add new task"
          class="edit-input"
          style="display:none"
        />
        <button type="button" class="edit-btn" onclick="toggleEdit(this)">Edit</button>
        <button type="button" class="save-btn" onclick="addTaskToNote(${note.id}, this)" style="display:none">
          Save
        </button>
      </div>

      <button type="button" class="complete-btn" onclick="completeNote(${note.id})">
        Complete
      </button>
    </div>
  `;

      // Add sticky note to the grid
      grid.appendChild(sticky);

      // Show complete button only if all tasks are done
      if (taskList.every(t => t.done)) {
        sticky.querySelector(".complete-btn").style.display = "block";
      }
    });
  });
}

//Remove tasks from the sticky note
async function removeTaskFromNote(noteId, taskIndex) {
  const tasks = await fetchTasks();
  const note = tasks.find(n => n.id == noteId);

  if (!note) return;

  const taskList =
    typeof note.tasks === "string"
      ? JSON.parse(note.tasks)
      : note.tasks;

  // Remove the selected task
  taskList.splice(taskIndex, 1);

  note.tasks = JSON.stringify(taskList);

  await saveTasks(tasks);
  renderDashboard();
}


// Fetch tasks from Flask API
async function fetchTasks() {
  try {
    const response = await fetch('/api/tasks');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

const totalTasks = activeTasks.length + completedTasks.length;
const completedCount = completedTasks.length;
const percent = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

document.getElementById("progress-percent").textContent = percent + "%";
document.getElementById("completed-count").textContent =
  `${completedCount} / ${totalTasks}`;

// Save tasks to Flask API
async function saveTasks(tasks) {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks)
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

function addTaskInput() {
  const div = document.createElement("div");
  div.className = "task-item";

  div.innerHTML = `
    <input
      type="text"
      placeholder="Task"
      class="create-input task-input"
    />
    <button type="button" class="remove-task-btn" onclick="this.parentElement.remove()">✕</button>
  `;

  document.getElementById("taskList").appendChild(div);
}

async function saveTask() {
  const title = document.getElementById("title").value.trim();
  const inputs = document.querySelectorAll(".task-input");

  if (!title) {
    alert('Please enter a title');
    return;
  }

  const tasks = Array.from(inputs)
    .map(i => i.value.trim())
    .filter(Boolean)
    .map(text => ({ text, done: false }));

  if (tasks.length === 0) {
    alert('Please add at least one task');
    return;
  }

  const allTasks = await fetchTasks();
  allTasks.push({
    id: Date.now(),
    title,
    tasks: JSON.stringify(tasks),
    completed: false
  });

  await saveTasks(allTasks);
  window.location.href = "/dashboard";
}

async function toggleTask(noteId, taskIndex) {
  const tasks = await fetchTasks();
  const note = tasks.find(t => t.id == noteId);

  if (note) {
    const taskList = typeof note.tasks === 'string' ? JSON.parse(note.tasks) : note.tasks;
    taskList[taskIndex].done = !taskList[taskIndex].done;
    note.tasks = JSON.stringify(taskList);

    await saveTasks(tasks);
    renderDashboard();
  }
}

//Complete button appears when tasks are completed
async function completeNote(noteId) {
  const tasks = await fetchTasks();
  const note = tasks.find(n => n.id == noteId);

  if (note) {
    note.completed = true;
    note.completedAt = new Date().toISOString();

    await saveTasks(tasks);
    renderDashboard();
  }
}

//Edit button
function toggleEdit(button) {
  const editSection = button.parentElement;
  const input = editSection.querySelector(".edit-input");
  const saveBtn = editSection.querySelector(".save-btn");

  input.style.display = "block";
  saveBtn.style.display = "inline-block";
  button.style.display = "none";

  input.focus();
}

//Saves the tasks to existing sticky note
async function addTaskToNote(noteId, button) {
  const editSection = button.parentElement;
  const input = editSection.querySelector(".edit-input");
  const text = input.value.trim();

  if (!text) {
    alert('Please enter a task');
    return;
  }

  const tasks = await fetchTasks();
  const note = tasks.find(n => n.id == noteId);

  if (note) {
    const taskList = typeof note.tasks === 'string' ? JSON.parse(note.tasks) : note.tasks;
    taskList.push({
      text,
      done: false
    });
    note.tasks = JSON.stringify(taskList);

    await saveTasks(tasks);
    renderDashboard();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("taskList")) {
    addTaskInput();
  }
});

async function renderHistory() {
  const grid = document.getElementById("history-grid");
  grid.innerHTML = "";

  const allTasks = await fetchTasks();
  const notes = allTasks.filter(note => note.completed);

  // 📊 Stats
  document.getElementById("completion-count").textContent = notes.length;

  if (notes.length === 0) {
    grid.innerHTML = `<p class="empty-history">No completed tasks yet 🌱</p>`;
    return;
  }

  notes.forEach(note => {
    const sticky = document.createElement("div");
    sticky.className = "sticky-note completed-note fade-in";

    const completedDate = new Date(note.completedAt).toLocaleDateString();
    const taskList = typeof note.tasks === 'string' ? JSON.parse(note.tasks) : note.tasks;

    sticky.innerHTML = `
    <img src="/static/images/stickynotes.png" alt="Sticky note" />

    <div class="sticky-content">
      <h3>${note.title}</h3>

      <!-- Date directly under title -->
      <p class="completed-date">
        Completed on ${completedDate}
      </p>

      ${taskList.map(task => `
        <p class="completed-task">✔ ${task.text}</p>
      `).join("")}

      <!-- Actions aligned right -->
      <div class="history-actions">
        <button type="button" onclick="restoreNote(${note.id})">Restore</button>
        <button type="button" onclick="deleteNote(${note.id})">Delete</button>
      </div>
    </div>
  `;

    grid.appendChild(sticky);
  });
}

async function restoreNote(noteId) {
  const tasks = await fetchTasks();
  const note = tasks.find(n => n.id == noteId);

  if (note) {
    note.completed = false;
    delete note.completedAt;

    await saveTasks(tasks);
    renderHistory();
  }
}

async function deleteNote(noteId) {
  const tasks = await fetchTasks();
  const filtered = tasks.filter(n => n.id != noteId);
  await saveTasks(filtered);
  renderHistory();
}

// Theme toggle
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  const btn = document.querySelector(".theme-toggle");
  if (btn) {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);
});


//DROPDOWN MENU
function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.toggle("show");
}

document.addEventListener("click", function(event) {
  const menu = document.getElementById("dropdownMenu");
  const button = document.querySelector(".hamburger-btn");

  if (!button.contains(event.target) && !menu.contains(event.target)) {
    menu.classList.remove("show");
  }
});