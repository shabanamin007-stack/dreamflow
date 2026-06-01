/* =============================================
   DREAMFLOW — SMART TO-DO LIST
   script.js — FIXED VERSION
   Bug fix: Complete circle tap working on mobile
   ============================================= */

const quotes = [
  "Start where you are. Use what you have. Do what you can. — Arthur Ashe",
  "A goal without a plan is just a wish. — Antoine de Saint-Exupéry",
  "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
  "Dream big. Start small. Act now. — Robin Sharma",
  "Small steps every day lead to big changes over time.",
  "Your future self will thank you for the work you do today.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every task completed is a step closer to your dream.",
  "Focus on progress, not perfection.",
  "Bismillah — begin with purpose, end with gratitude.",
];

let state = {
  tasks: [],
  filter: "all",
  searchQuery: "",
  sortBy: "newest",
  editingId: null,
};

const $ = (id) => document.getElementById(id);

const taskList      = $("taskList");
const addTaskBtn    = $("addTaskBtn");
const taskTitle     = $("taskTitle");
const taskPriority  = $("taskPriority");
const taskDueDate   = $("taskDueDate");
const taskNotes     = $("taskNotes");
const searchInput   = $("searchInput");
const clearSearch   = $("clearSearch");
const sortSelect    = $("sortSelect");
const themeToggle   = $("themeToggle");
const editModal     = $("editModal");
const closeModal    = $("closeModal");
const cancelEdit    = $("cancelEdit");
const saveEdit      = $("saveEdit");
const exportBtn     = $("exportBtn");
const importFile    = $("importFile");
const clearAllBtn   = $("clearAllBtn");
const quoteCard     = $("quoteCard");
const quoteText     = $("quoteText");
const toast         = $("toast");

/* ---- LOCAL STORAGE ---- */
function saveTasks() {
  localStorage.setItem("dreamflow_tasks", JSON.stringify(state.tasks));
}
function loadTasks() {
  const saved = localStorage.getItem("dreamflow_tasks");
  state.tasks = saved ? JSON.parse(saved) : [];
}
function saveTheme(t) { localStorage.setItem("dreamflow_theme", t); }
function loadTheme()  { return localStorage.getItem("dreamflow_theme") || "dark"; }

function updateStreak() {
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem("dreamflow_last_visit");
  let streak = parseInt(localStorage.getItem("dreamflow_streak") || "0");
  if (lastVisit !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    streak = (lastVisit === yesterday) ? streak + 1 : 1;
    localStorage.setItem("dreamflow_streak", streak);
    localStorage.setItem("dreamflow_last_visit", today);
  }
  $("streakCount").textContent = streak;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/* ---- ADD TASK ---- */
function addTask() {
  const title = taskTitle.value.trim();
  if (!title) {
    showToast("Please enter a task title!", "error");
    taskTitle.focus();
    return;
  }
  const newTask = {
    id:        generateId(),
    title:     title,
    priority:  taskPriority.value,
    dueDate:   taskDueDate.value,
    notes:     taskNotes.value.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  state.tasks.unshift(newTask);
  saveTasks();
  renderTasks();
  updateStats();
  taskTitle.value    = "";
  taskDueDate.value  = "";
  taskNotes.value    = "";
  taskPriority.value = "medium";
  showToast("✅ Task added successfully!", "success");
  taskTitle.focus();
}

/* ---- DELETE TASK ---- */
function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  updateStats();
  showToast("🗑️ Task deleted", "");
}

/* ---- TOGGLE COMPLETE — FIXED for mobile ---- */
function toggleComplete(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    updateStats();
    showToast(task.completed ? "✅ Task completed!" : "↩️ Marked incomplete", "success");
  }
}

/* ---- OPEN EDIT MODAL ---- */
function openEdit(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.editingId = id;
  $("editTitle").value    = task.title;
  $("editPriority").value = task.priority;
  $("editDueDate").value  = task.dueDate || "";
  $("editNotes").value    = task.notes || "";
  editModal.classList.add("active");
  $("editTitle").focus();
}

function saveEditedTask() {
  const title = $("editTitle").value.trim();
  if (!title) { showToast("Title cannot be empty!", "error"); return; }
  const task = state.tasks.find(t => t.id === state.editingId);
  if (task) {
    task.title    = title;
    task.priority = $("editPriority").value;
    task.dueDate  = $("editDueDate").value;
    task.notes    = $("editNotes").value.trim();
    saveTasks();
    renderTasks();
    updateStats();
    closeEditModal();
    showToast("✏️ Task updated!", "success");
  }
}

function closeEditModal() {
  editModal.classList.remove("active");
  state.editingId = null;
}

/* ---- FILTER + SORT ---- */
function getFilteredTasks() {
  let tasks = [...state.tasks];
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }
  switch (state.filter) {
    case "pending":   tasks = tasks.filter(t => !t.completed); break;
    case "completed": tasks = tasks.filter(t => t.completed);  break;
    case "high":      tasks = tasks.filter(t => t.priority === "high");   break;
    case "medium":    tasks = tasks.filter(t => t.priority === "medium"); break;
    case "low":       tasks = tasks.filter(t => t.priority === "low");    break;
  }
  tasks.sort((a, b) => {
    switch (state.sortBy) {
      case "oldest":   return new Date(a.createdAt) - new Date(b.createdAt);
      case "priority":
        const p = { high: 0, medium: 1, low: 2 };
        return p[a.priority] - p[b.priority];
      case "duedate":
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      default: return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  return tasks;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(dateStr) < today;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ---- RENDER TASKS — FIXED touch events ---- */
function renderTasks() {
  const tasks = getFilteredTasks();
  $("taskCountBadge").textContent = tasks.length;

  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">✦</div>
        <h3>${state.searchQuery ? "No tasks found" : "No tasks yet!"}</h3>
        <p>${state.searchQuery ? "Try a different search." : "Add your first task above to get started."}</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  taskList.innerHTML = tasks.map(task => {
    const overdue = isOverdue(task.dueDate) && !task.completed;
    return `
    <div class="task-card ${task.completed ? "completed" : ""}"
         data-priority="${task.priority}"
         data-id="${task.id}">

      <!-- FIXED: using button instead of div for better mobile tap -->
      <button class="task-check"
        onclick="toggleComplete('${task.id}')"
        ontouchend="event.preventDefault(); toggleComplete('${task.id}')"
        title="Mark complete"
        style="cursor:pointer; -webkit-tap-highlight-color: transparent;">
        <i data-lucide="check"></i>
      </button>

      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="task-priority priority-${task.priority}">
            ${task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢"}
            ${task.priority}
          </span>
          ${task.dueDate ? `
            <span class="task-due ${overdue ? "overdue" : ""}">
              <i data-lucide="calendar"></i>
              ${overdue ? "⚠️ " : ""}${formatDate(task.dueDate)}
            </span>` : ""}
        </div>
        ${task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : ""}
      </div>

      <div class="task-actions">
        <button class="task-btn"
          onclick="openEdit('${task.id}')"
          ontouchend="event.preventDefault(); openEdit('${task.id}')"
          title="Edit">
          <i data-lucide="pencil"></i>
        </button>
        <button class="task-btn delete"
          onclick="deleteTask('${task.id}')"
          ontouchend="event.preventDefault(); deleteTask('${task.id}')"
          title="Delete">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>`;
  }).join("");

  lucide.createIcons();
}

/* ---- UPDATE STATS ---- */
function updateStats() {
  const total   = state.tasks.length;
  const done    = state.tasks.filter(t => t.completed).length;
  const pending = total - done;
  const high    = state.tasks.filter(t => t.priority === "high" && !t.completed).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  $("totalTasks").textContent      = total;
  $("doneTasks").textContent       = done;
  $("pendingTasks").textContent    = pending;
  $("highPriority").textContent    = high;
  $("progressPercent").textContent = percent + "%";
  $("progressFill").style.width    = percent + "%";
}

/* ---- TOAST ---- */
let toastTimer;
function showToast(message, type = "") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* ---- THEME ---- */
function toggleTheme() {
  const current  = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  saveTheme(newTheme);
}

/* ---- QUOTE ---- */
function showRandomQuote() {
  quoteText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

/* ---- EXPORT / IMPORT ---- */
function exportData() {
  if (state.tasks.length === 0) { showToast("No tasks to export!", "error"); return; }
  const blob = new Blob([JSON.stringify({ app:"DreamFlow To-Do", exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dreamflow-tasks-${new Date().toISOString().split("T")[0]}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  showToast("📁 Data exported!", "success");
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      const imported = data.tasks || data;
      if (!Array.isArray(imported)) throw new Error();
      if (confirm(`Import ${imported.length} tasks?`)) {
        state.tasks = [...imported, ...state.tasks];
        saveTasks(); renderTasks(); updateStats();
        showToast(`✅ Imported ${imported.length} tasks!`, "success");
      }
    } catch { showToast("❌ Invalid file format!", "error"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

/* ---- EVENT LISTENERS ---- */
addTaskBtn.addEventListener("click", addTask);
taskTitle.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });

searchInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value.trim();
  clearSearch.style.display = state.searchQuery ? "flex" : "none";
  renderTasks();
});
clearSearch.addEventListener("click", () => {
  searchInput.value = ""; state.searchQuery = "";
  clearSearch.style.display = "none";
  renderTasks(); searchInput.focus();
});

sortSelect.addEventListener("change", (e) => { state.sortBy = e.target.value; renderTasks(); });

document.querySelectorAll(".filter-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.filter;
    renderTasks();
  });
});

themeToggle.addEventListener("click", toggleTheme);
closeModal.addEventListener("click",  closeEditModal);
cancelEdit.addEventListener("click",  closeEditModal);
saveEdit.addEventListener("click",    saveEditedTask);
$("editTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") saveEditedTask(); });
editModal.addEventListener("click", (e) => { if (e.target === editModal) closeEditModal(); });
exportBtn.addEventListener("click", exportData);
importFile.addEventListener("change", importData);

clearAllBtn.addEventListener("click", () => {
  if (state.tasks.length === 0) { showToast("No tasks to clear!", "error"); return; }
  if (confirm(`Delete all ${state.tasks.length} tasks?`)) {
    state.tasks = []; saveTasks(); renderTasks(); updateStats();
    showToast("🗑️ All tasks cleared", "");
  }
});

quoteCard.addEventListener("click", showRandomQuote);

/* ---- INIT ---- */
function init() {
  document.documentElement.setAttribute("data-theme", loadTheme());
  loadTasks();
  renderTasks();
  updateStats();
  showRandomQuote();
  updateStreak();
  lucide.createIcons();
  const today = new Date().toISOString().split("T")[0];
  taskDueDate.value = today;
}

init();
