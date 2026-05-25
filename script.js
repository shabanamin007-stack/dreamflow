/* =============================================
   DREAMFLOW — SMART TO-DO LIST
   script.js
   
   Ye file app ka "brain" hai.
   Saari logic yahan hoti hai:
   - Tasks add/edit/delete
   - Local Storage mein save/load
   - Filter, search, sort
   - Stats update
   - Dark/light mode
   ============================================= */

/* =============================================
   1. MOTIVATIONAL QUOTES ARRAY
   Click karoge quote card pe to naya quote aayega
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

/* =============================================
   2. STATE (App ka data yahan store hota hai)
   
   state = ek object jisme hum sab kuch rakhte hain.
   Har baar kuch badlega, state update hogi.
   ============================================= */
let state = {
  tasks: [],          // sari tasks ki array
  filter: "all",      // current filter (all/pending/completed/high/medium/low)
  searchQuery: "",    // search bar ki value
  sortBy: "newest",   // sort option
  editingId: null,    // jo task edit ho rahi hai uska id
};

/* =============================================
   3. DOM REFERENCES
   
   DOM = HTML ke elements ko JS mein pakadna
   getElementById = id se element dhundho
   ============================================= */
const $ = (id) => document.getElementById(id); // shortcut function

const taskList      = $("taskList");
const emptyState    = $("emptyState");
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

/* =============================================
   4. LOCAL STORAGE HELPERS
   
   Local Storage = browser ka mini database
   Data save hota hai even after tab close hone par
   
   localStorage.setItem(key, value) — save karo
   localStorage.getItem(key)         — load karo
   JSON.stringify() — object ko string banao (storage ke liye)
   JSON.parse()     — string ko wapas object banao
   ============================================= */
function saveTasks() {
  localStorage.setItem("dreamflow_tasks", JSON.stringify(state.tasks));
}

function loadTasks() {
  const saved = localStorage.getItem("dreamflow_tasks");
  // agar kuch saved hai to use parse karo, nahi to empty array
  state.tasks = saved ? JSON.parse(saved) : [];
}

function saveTheme(theme) {
  localStorage.setItem("dreamflow_theme", theme);
}

function loadTheme() {
  return localStorage.getItem("dreamflow_theme") || "dark";
}

// Streak = kitne din se app use ho rahi hai
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

/* =============================================
   5. UNIQUE ID GENERATOR
   
   Har task ko ek alag ID chahiye.
   Date.now() = current timestamp (milliseconds)
   Math.random() = 0 to 1 ke beech random number
   toString(36) = number ko base-36 string banao
   ============================================= */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/* =============================================
   6. ADD TASK
   ============================================= */
function addTask() {
  const title = taskTitle.value.trim(); // .trim() = spaces remove karo
  
  // Validation: title zaroor hona chahiye
  if (!title) {
    showToast("Please enter a task title!", "error");
    taskTitle.focus(); // input pe focus karo
    return; // function rok do
  }
  
  // Naya task object banao
  const newTask = {
    id:        generateId(),            // unique ID
    title:     title,
    priority:  taskPriority.value,      // "high" | "medium" | "low"
    dueDate:   taskDueDate.value,       // "2025-12-31" format
    notes:     taskNotes.value.trim(),
    completed: false,                   // shuru mein incomplete
    createdAt: new Date().toISOString(), // exact time stamp
  };
  
  // Array ke shuru mein add karo (newest first)
  state.tasks.unshift(newTask);
  saveTasks();
  renderTasks();
  updateStats();
  
  // Form clear karo
  taskTitle.value    = "";
  taskDueDate.value  = "";
  taskNotes.value    = "";
  taskPriority.value = "medium";
  
  showToast("✅ Task added successfully!", "success");
  taskTitle.focus(); // agle task ke liye ready
}

/* =============================================
   7. DELETE TASK
   
   filter() = array se items hatane ke liye
   t.id !== id matlab "ye waala task nahi rakhna"
   ============================================= */
function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  updateStats();
  showToast("🗑️ Task deleted", "");
}

/* =============================================
   8. TOGGLE COMPLETE
   
   find() = array mein ek item dhundho
   ============================================= */
function toggleComplete(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed; // true <-> false switch
    saveTasks();
    renderTasks();
    updateStats();
    showToast(task.completed ? "✅ Task completed!" : "↩️ Marked incomplete", "success");
  }
}

/* =============================================
   9. OPEN EDIT MODAL
   ============================================= */
function openEdit(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  
  state.editingId = id; // yaad rakhna kaunsa edit ho raha hai
  
  // Modal fields mein task data bharo
  $("editTitle").value    = task.title;
  $("editPriority").value = task.priority;
  $("editDueDate").value  = task.dueDate || "";
  $("editNotes").value    = task.notes || "";
  
  // Modal show karo
  editModal.classList.add("active");
  $("editTitle").focus();
}

/* =============================================
   10. SAVE EDITED TASK
   ============================================= */
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

/* =============================================
   11. GET FILTERED + SORTED TASKS
   
   Ye function current filter, search aur sort
   apply karke tasks return karta hai
   ============================================= */
function getFilteredTasks() {
  let tasks = [...state.tasks]; // copy banao, original mat badlo
  
  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }
  
  // Status/priority filter
  switch (state.filter) {
    case "pending":   tasks = tasks.filter(t => !t.completed); break;
    case "completed": tasks = tasks.filter(t => t.completed);  break;
    case "high":      tasks = tasks.filter(t => t.priority === "high");   break;
    case "medium":    tasks = tasks.filter(t => t.priority === "medium"); break;
    case "low":       tasks = tasks.filter(t => t.priority === "low");    break;
  }
  
  // Sort karo
  tasks.sort((a, b) => {
    switch (state.sortBy) {
      case "oldest":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "priority":
        const pOrder = { high: 0, medium: 1, low: 2 };
        return pOrder[a.priority] - pOrder[b.priority];
      case "duedate":
        if (!a.dueDate) return 1;  // due date nahi hai to end mein
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      default: // newest
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  
  return tasks;
}

/* =============================================
   12. CHECK IF DATE IS OVERDUE
   ============================================= */
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0,0,0,0); // time part hatao
  return new Date(dateStr) < today;
}

/* =============================================
   13. FORMAT DATE FOR DISPLAY
   ============================================= */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00"); // local time
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* =============================================
   14. RENDER TASKS (HTML banao aur dikhao)
   
   innerHTML = HTML string set karna
   map() = har item ke liye kuch banao
   join("") = array ko ek string banao
   ============================================= */
function renderTasks() {
  const tasks = getFilteredTasks();
  
  $("taskCountBadge").textContent = tasks.length;
  
  // Agar koi task nahi to empty state dikhao
  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">✦</div>
        <h3>${state.searchQuery ? "No tasks found" : "No tasks yet!"}</h3>
        <p>${state.searchQuery ? "Try a different search." : "Add your first task above to get started."}</p>
      </div>`;
    return;
  }
  
  // Har task ke liye HTML card banao
  taskList.innerHTML = tasks.map(task => {
    const overdue = isOverdue(task.dueDate) && !task.completed;
    
    return `
    <div class="task-card ${task.completed ? "completed" : ""}" 
         data-priority="${task.priority}" 
         data-id="${task.id}">
      
      <!-- Checkbox circle -->
      <div class="task-check" onclick="toggleComplete('${task.id}')" title="Mark complete">
        <i data-lucide="check"></i>
      </div>
      
      <!-- Task content -->
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        
        <div class="task-meta">
          <!-- Priority badge -->
          <span class="task-priority priority-${task.priority}">
            ${task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢"} 
            ${task.priority}
          </span>
          
          <!-- Due date -->
          ${task.dueDate ? `
            <span class="task-due ${overdue ? "overdue" : ""}">
              <i data-lucide="calendar"></i>
              ${overdue ? "⚠️ " : ""}${formatDate(task.dueDate)}
            </span>` : ""}
        </div>
        
        <!-- Notes -->
        ${task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : ""}
      </div>
      
      <!-- Action buttons -->
      <div class="task-actions">
        <button class="task-btn" onclick="openEdit('${task.id}')" title="Edit">
          <i data-lucide="pencil"></i>
        </button>
        <button class="task-btn delete" onclick="deleteTask('${task.id}')" title="Delete">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>`;
  }).join(""); // array ko string banao
  
  // Lucide icons re-initialize karo (naye icons ke liye)
  lucide.createIcons();
}

/* =============================================
   15. UPDATE STATS (dashboard numbers update karo)
   ============================================= */
function updateStats() {
  const total   = state.tasks.length;
  const done    = state.tasks.filter(t => t.completed).length;
  const pending = total - done;
  const high    = state.tasks.filter(t => t.priority === "high" && !t.completed).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  
  $("totalTasks").textContent   = total;
  $("doneTasks").textContent    = done;
  $("pendingTasks").textContent = pending;
  $("highPriority").textContent = high;
  $("progressPercent").textContent = percent + "%";
  $("progressFill").style.width    = percent + "%";
}

/* =============================================
   16. XSS PROTECTION
   
   User ka input directly HTML mein mat daalo!
   Pehle special characters encode karo.
   ============================================= */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* =============================================
   17. TOAST NOTIFICATION
   ============================================= */
let toastTimer;
function showToast(message, type = "") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* =============================================
   18. THEME TOGGLE
   ============================================= */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  saveTheme(newTheme);
}

/* =============================================
   19. RANDOM QUOTE
   ============================================= */
function showRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  quoteText.textContent = quotes[randomIndex];
}

/* =============================================
   20. EXPORT / IMPORT
   ============================================= */
function exportData() {
  if (state.tasks.length === 0) {
    showToast("No tasks to export!", "error");
    return;
  }
  
  const dataStr = JSON.stringify({ 
    app: "DreamFlow To-Do",
    exportedAt: new Date().toISOString(),
    tasks: state.tasks 
  }, null, 2); // 2 = indented JSON (readable)
  
  // Browser mein download trigger karo
  const blob = new Blob([dataStr], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `dreamflow-tasks-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast("📁 Data exported!", "success");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      const imported = data.tasks || data; // support old/new format
      
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      
      if (confirm(`Import ${imported.length} tasks? Existing tasks will be kept.`)) {
        // Existing tasks ke saath merge karo
        state.tasks = [...imported, ...state.tasks];
        saveTasks();
        renderTasks();
        updateStats();
        showToast(`✅ Imported ${imported.length} tasks!`, "success");
      }
    } catch {
      showToast("❌ Invalid file format!", "error");
    }
  };
  reader.readAsText(file);
  e.target.value = ""; // reset input
}

/* =============================================
   21. EVENT LISTENERS
   
   Event Listener = "koi button click kare ya
   kuch type kare to ye function chalao"
   ============================================= */

// Add task button click
addTaskBtn.addEventListener("click", addTask);

// Enter key press on title input = add task
taskTitle.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

// Search input — real time filtering
searchInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value.trim();
  clearSearch.style.display = state.searchQuery ? "flex" : "none";
  renderTasks();
});

// Clear search button
clearSearch.addEventListener("click", () => {
  searchInput.value   = "";
  state.searchQuery   = "";
  clearSearch.style.display = "none";
  renderTasks();
  searchInput.focus();
});

// Sort change
sortSelect.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  renderTasks();
});

// Filter tabs
document.querySelectorAll(".filter-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    // Active class update karo
    document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    state.filter = btn.dataset.filter;
    renderTasks();
  });
});

// Theme toggle
themeToggle.addEventListener("click", toggleTheme);

// Modal close buttons
closeModal.addEventListener("click", closeEditModal);
cancelEdit.addEventListener("click",  closeEditModal);
saveEdit.addEventListener("click",    saveEditedTask);

// Modal: Enter key = save
$("editTitle").addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEditedTask();
});

// Click outside modal = close
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

// Export/Import
exportBtn.addEventListener("click", exportData);
importFile.addEventListener("change", importData);

// Clear all
clearAllBtn.addEventListener("click", () => {
  if (state.tasks.length === 0) { showToast("No tasks to clear!", "error"); return; }
  if (confirm(`Delete all ${state.tasks.length} tasks permanently?`)) {
    state.tasks = [];
    saveTasks();
    renderTasks();
    updateStats();
    showToast("🗑️ All tasks cleared", "");
  }
});

// Quote card click = new quote
quoteCard.addEventListener("click", showRandomQuote);

/* =============================================
   22. INITIALIZE APP
   
   Ye sab tab chalta hai jab page load hota hai
   ============================================= */
function init() {
  // Theme load karo
  document.documentElement.setAttribute("data-theme", loadTheme());
  
  // Tasks load karo Local Storage se
  loadTasks();
  
  // UI update karo
  renderTasks();
  updateStats();
  showRandomQuote();
  updateStreak();
  
  // Lucide icons initialize karo
  lucide.createIcons();
  
  // Default due date: aaj ki date set karo
  const today = new Date().toISOString().split("T")[0];
  taskDueDate.value = today;
  
  console.log("✦ DreamFlow To-Do initialized! Tasks loaded:", state.tasks.length);
}

// Page load hone par init() chalao
init();
