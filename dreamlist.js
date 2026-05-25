/* =============================================
   DREAMFLOW — DREAM LIST & GOAL TRACKER
   dreamlist.js
   ============================================= */

/* ---- QUOTES ---- */
const quotes = [
  "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
  "All our dreams can come true, if we have the courage to pursue them. — Walt Disney",
  "Dream big, start small, act now. — Robin Sharma",
  "A dream written down with a date becomes a goal. A goal broken down becomes a plan.",
  "Don't just dream it — design it, plan it, build it.",
  "Your dreams are the blueprint. Your actions are the construction. — Shabana",
  "Tawakkul + Action = Unstoppable. توکل مع العمل",
  "Every big achievement started as a dream someone refused to abandon.",
  "The only limit to your impact is your imagination and your commitment.",
  "Write your goals in ink, not pencil. Commit. Begin.",
];

/* ---- CATEGORY CONFIG ---- */
const catConfig = {
  business:   { label: "Business",   emoji: "💼", color: "#a78bfa" },
  health:     { label: "Health",     emoji: "💪", color: "#34d399" },
  learning:   { label: "Learning",   emoji: "📚", color: "#60a5fa" },
  spiritual:  { label: "Spiritual",  emoji: "🤲", color: "#f5c542" },
  family:     { label: "Family",     emoji: "❤️", color: "#fb7185" },
  travel:     { label: "Travel",     emoji: "✈️", color: "#2dd4bf" },
  finance:    { label: "Finance",    emoji: "💰", color: "#86efac" },
  creativity: { label: "Creativity", emoji: "🎨", color: "#f97316" },
};

/* ---- STATE ---- */
let state = {
  dreams: [],
  filter: "all",
  search: "",
  sortBy: "newest",
  editingId: null,
};

/* ---- DOM SHORTCUTS ---- */
const $ = (id) => document.getElementById(id);

/* ---- LOCAL STORAGE ---- */
function saveDreams() {
  localStorage.setItem("dreamflow_dreams", JSON.stringify(state.dreams));
}
function loadDreams() {
  const saved = localStorage.getItem("dreamflow_dreams");
  state.dreams = saved ? JSON.parse(saved) : [];
}
function saveTheme(t) { localStorage.setItem("dreamflow_dream_theme", t); }
function loadTheme()   { return localStorage.getItem("dreamflow_dream_theme") || "dark"; }

/* ---- UNIQUE ID ---- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
}

/* ---- STAR FIELD (background decoration) ---- */
function buildStars() {
  const sf = $("starField");
  for (let i = 0; i < 80; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      top:${Math.random()*100}%; left:${Math.random()*100}%;
      --dur:${(Math.random()*4+2).toFixed(1)}s;
      --delay:${(Math.random()*5).toFixed(1)}s;
      --op:${(Math.random()*0.5+0.2).toFixed(2)};
    `;
    sf.appendChild(s);
  }
}

/* ---- RANGE SLIDER LIVE UPDATE ---- */
function initRangeSlider(rangeId, labelId) {
  const range = $(rangeId);
  const label = $(labelId);
  function update() {
    label.textContent = range.value + "%";
    range.style.setProperty("--val", range.value + "%");
  }
  range.addEventListener("input", update);
  update();
}

/* ---- ADD DREAM ---- */
function addDream() {
  const title = $("dreamTitle").value.trim();
  if (!title) {
    showToast("Please enter a dream title!", "error");
    $("dreamTitle").focus();
    return;
  }

  const dream = {
    id:        uid(),
    title:     title,
    category:  $("dreamCat").value,
    targetDate:$("dreamDate").value,
    note:      $("dreamNote").value.trim(),
    progress:  parseInt($("dreamProgress").value),
    achieved:  parseInt($("dreamProgress").value) === 100,
    createdAt: new Date().toISOString(),
  };

  state.dreams.unshift(dream);
  saveDreams();
  renderDreams();
  updateStats();

  // Reset form
  $("dreamTitle").value    = "";
  $("dreamNote").value     = "";
  $("dreamProgress").value = 0;
  $("dreamDate").value     = "";
  initRangeSlider("dreamProgress", "progressLabel");

  showToast("✦ Dream added to your list!", "gold");
  $("dreamTitle").focus();

  if (dream.achieved) triggerConfetti();
}

/* ---- DELETE DREAM ---- */
function deleteDream(id) {
  if (!confirm("Remove this dream from your list?")) return;
  state.dreams = state.dreams.filter(d => d.id !== id);
  saveDreams(); renderDreams(); updateStats();
  showToast("🗑️ Dream removed", "");
}

/* ---- TOGGLE ACHIEVED ---- */
function toggleAchieved(id) {
  const dream = state.dreams.find(d => d.id === id);
  if (!dream) return;
  dream.achieved = !dream.achieved;
  if (dream.achieved) { dream.progress = 100; triggerConfetti(); }
  saveDreams(); renderDreams(); updateStats();
  showToast(dream.achieved ? "🏆 Dream Achieved! Congratulations!" : "↩️ Marked as in progress", "gold");
}

/* ---- QUICK PROGRESS UPDATE ---- */
function quickProgress(id, value) {
  const dream = state.dreams.find(d => d.id === id);
  if (!dream) return;
  dream.progress = value;
  dream.achieved = (value === 100);
  saveDreams(); renderDreams(); updateStats();
  showToast(`Progress updated to ${value}%`, "gold");
  if (value === 100) triggerConfetti();
}

/* ---- OPEN EDIT MODAL ---- */
function openEdit(id) {
  const dream = state.dreams.find(d => d.id === id);
  if (!dream) return;
  state.editingId = id;

  $("eTitle").value    = dream.title;
  $("eCat").value      = dream.category;
  $("eDate").value     = dream.targetDate || "";
  $("eNote").value     = dream.note || "";
  $("eProgress").value = dream.progress;
  $("eProgressLabel").textContent = dream.progress + "%";
  $("eProgress").style.setProperty("--val", dream.progress + "%");

  // Live update for edit range
  $("eProgress").oninput = function() {
    $("eProgressLabel").textContent = this.value + "%";
    this.style.setProperty("--val", this.value + "%");
  };

  $("editModal").classList.add("active");
  $("eTitle").focus();
}

function closeEditModal() {
  $("editModal").classList.remove("active");
  state.editingId = null;
}

function saveEdit() {
  const title = $("eTitle").value.trim();
  if (!title) { showToast("Title cannot be empty!", "error"); return; }

  const dream = state.dreams.find(d => d.id === state.editingId);
  if (dream) {
    dream.title      = title;
    dream.category   = $("eCat").value;
    dream.targetDate = $("eDate").value;
    dream.note       = $("eNote").value.trim();
    dream.progress   = parseInt($("eProgress").value);
    dream.achieved   = dream.progress === 100;

    saveDreams(); renderDreams(); updateStats();
    closeEditModal();
    showToast("✦ Dream updated!", "gold");
    if (dream.achieved) triggerConfetti();
  }
}

/* ---- GET FILTERED DREAMS ---- */
function getFiltered() {
  let list = [...state.dreams];

  // Search
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.note && d.note.toLowerCase().includes(q))
    );
  }

  // Category / status filter
  if (state.filter === "achieved") {
    list = list.filter(d => d.achieved);
  } else if (state.filter !== "all") {
    list = list.filter(d => d.category === state.filter);
  }

  // Sort
  list.sort((a, b) => {
    switch (state.sortBy) {
      case "oldest":        return new Date(a.createdAt) - new Date(b.createdAt);
      case "progress-high": return b.progress - a.progress;
      case "progress-low":  return a.progress - b.progress;
      case "targetdate":
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate) - new Date(b.targetDate);
      default:              return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return list;
}

/* ---- FORMAT DATE ---- */
function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}
function isOverdue(str) {
  if (!str) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(str) < today;
}

/* ---- ESCAPE HTML ---- */
function esc(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/* ---- STATUS BADGE ---- */
function statusBadge(dream) {
  if (dream.achieved)       return `<span class="card-badge badge-achieved">🏆 Achieved</span>`;
  if (dream.progress > 0)   return `<span class="card-badge badge-progress">🚀 ${dream.progress}%</span>`;
  return `<span class="card-badge badge-notstarted">💭 Not Started</span>`;
}

/* ---- RENDER DREAM CARDS ---- */
function renderDreams() {
  const grid   = $("dreamGrid");
  const dreams = getFiltered();
  $("countBadge").textContent = dreams.length;
  $("dreamCountPill").textContent = state.dreams.length + " dreams";

  if (dreams.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-star">✦</span>
        <h3>${state.search ? "No dreams found" : "No dreams added yet!"}</h3>
        <p>${state.search ? "Try a different search." : "Add your first dream above and start your journey ✨"}</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = dreams.map((dream, i) => {
    const cat    = catConfig[dream.category] || catConfig.business;
    const over   = isOverdue(dream.targetDate) && !dream.achieved;
    const fillCls = dream.progress === 100 ? "cp-fill full" : "cp-fill";

    return `
    <div class="dream-card ${dream.achieved ? "achieved" : ""}"
         style="--cat-color:${cat.color}; animation-delay:${i * 0.05}s"
         data-id="${dream.id}">

      <!-- Header: category + badge -->
      <div class="card-hdr">
        <div class="card-cat">
          <div class="cat-dot" style="background:${cat.color};box-shadow:0 0 6px ${cat.color}"></div>
          ${cat.emoji} ${cat.label}
        </div>
        ${statusBadge(dream)}
      </div>

      <!-- Dream title -->
      <div class="card-title">${esc(dream.title)}</div>

      <!-- Progress bar -->
      <div class="card-progress-wrap">
        <div class="card-progress-row">
          <span class="cp-label">Progress</span>
          <span class="cp-pct">${dream.progress}%</span>
        </div>
        <div class="cp-track">
          <div class="${fillCls}" style="width:${dream.progress}%"></div>
        </div>
      </div>

      <!-- Quick progress buttons -->
      <div class="quick-progress">
        ${[25, 50, 75, 100].map(v =>
          `<button class="qp-btn" onclick="quickProgress('${dream.id}',${v})">${v}%</button>`
        ).join("")}
      </div>

      <!-- Note -->
      ${dream.note ? `<div class="card-note">"${esc(dream.note)}"</div>` : ""}

      <!-- Target date -->
      ${dream.targetDate ? `
        <div class="card-date ${over ? "overdue" : ""}">
          <i data-lucide="calendar-check"></i>
          ${over ? "⚠️ Overdue · " : "🎯 "}${fmtDate(dream.targetDate)}
        </div>` : ""}

      <!-- Action buttons -->
      <div class="card-actions">
        <button class="card-btn" onclick="openEdit('${dream.id}')">
          <i data-lucide="pencil"></i> Edit
        </button>
        <button class="card-btn achieve" onclick="toggleAchieved('${dream.id}')">
          <i data-lucide="${dream.achieved ? "rotate-ccw" : "trophy"}"></i>
          ${dream.achieved ? "Undo" : "Achieve"}
        </button>
        <button class="card-btn delete" onclick="deleteDream('${dream.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </div>

    </div>`;
  }).join("");

  lucide.createIcons();
}

/* ---- UPDATE STATS ---- */
function updateStats() {
  const total    = state.dreams.length;
  const achieved = state.dreams.filter(d => d.achieved).length;
  const inProg   = state.dreams.filter(d => d.progress > 0 && !d.achieved).length;
  const avg      = total > 0
    ? Math.round(state.dreams.reduce((s, d) => s + d.progress, 0) / total)
    : 0;

  $("totalDreams").textContent   = total;
  $("achievedDreams").textContent= achieved;
  $("inProgressDreams").textContent = inProg;
  $("avgProgress").textContent   = avg + "%";

  $("overallPct").textContent  = avg + "%";
  $("overallFill").style.width = avg + "%";

  if (total === 0) {
    $("overallSub").textContent = "Add your first dream to begin your journey ✨";
  } else {
    $("overallSub").textContent = `${achieved} of ${total} dreams achieved · Keep going! 🌟`;
  }
}

/* ---- QUOTE ---- */
function showQuote() {
  $("quoteText").textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

/* ---- TOAST ---- */
let toastT;
function showToast(msg, type = "") {
  clearTimeout(toastT);
  const t = $("toast");
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  toastT = setTimeout(() => t.classList.remove("show"), 3000);
}

/* ---- CONFETTI (simple CSS-canvas burst) ---- */
function triggerConfetti() {
  const canvas = $("confettiCanvas");
  const ctx    = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors  = ["#f5c542","#fb7185","#a78bfa","#2dd4bf","#60a5fa","#fff"];
  const pieces  = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10, size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 4 + 2,
    rot: Math.random() * 360, vr: (Math.random()-0.5)*8,
    alpha: 1,
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.alpha -= 0.014;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });
    if (alive) frame = requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); cancelAnimationFrame(frame); }
  }
  draw();
}

/* ---- EXPORT / IMPORT ---- */
function exportData() {
  if (state.dreams.length === 0) { showToast("No dreams to export!", "error"); return; }
  const blob = new Blob([JSON.stringify({ app:"DreamFlow Dreams", exportedAt: new Date().toISOString(), dreams: state.dreams }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dreamflow-dreams-${new Date().toISOString().split("T")[0]}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  showToast("📁 Dreams exported!", "gold");
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const imported = data.dreams || data;
      if (!Array.isArray(imported)) throw new Error();
      if (confirm(`Import ${imported.length} dreams? Existing dreams will be kept.`)) {
        state.dreams = [...imported, ...state.dreams];
        saveDreams(); renderDreams(); updateStats();
        showToast(`✦ Imported ${imported.length} dreams!`, "gold");
      }
    } catch { showToast("❌ Invalid file!", "error"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

/* ---- THEME ---- */
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  saveTheme(next);
}

/* ---- EVENT LISTENERS ---- */
$("addDreamBtn").addEventListener("click", addDream);
$("dreamTitle").addEventListener("keydown", e => { if (e.key === "Enter") addDream(); });

$("searchInput").addEventListener("input", e => {
  state.search = e.target.value.trim();
  $("clearSearch").style.display = state.search ? "flex" : "none";
  renderDreams();
});
$("clearSearch").addEventListener("click", () => {
  $("searchInput").value = ""; state.search = "";
  $("clearSearch").style.display = "none";
  renderDreams(); $("searchInput").focus();
});

$("sortSelect").addEventListener("change", e => { state.sortBy = e.target.value; renderDreams(); });

document.querySelectorAll(".cf-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.cat;
    renderDreams();
  });
});

$("themeToggle").addEventListener("click", toggleTheme);
$("closeModal").addEventListener("click",  closeEditModal);
$("cancelEdit").addEventListener("click",  closeEditModal);
$("saveEdit").addEventListener("click",    saveEdit);
$("editModal").addEventListener("click",   e => { if (e.target === $("editModal")) closeEditModal(); });
$("eTitle").addEventListener("keydown",    e => { if (e.key === "Enter") saveEdit(); });

$("exportBtn").addEventListener("click", exportData);
$("importFile").addEventListener("change", importData);

$("clearAllBtn").addEventListener("click", () => {
  if (state.dreams.length === 0) { showToast("No dreams to clear!", "error"); return; }
  if (confirm(`Delete all ${state.dreams.length} dreams permanently?`)) {
    state.dreams = []; saveDreams(); renderDreams(); updateStats();
    showToast("🗑️ All dreams cleared", "");
  }
});

$("quoteBanner").addEventListener("click", showQuote);

/* ---- INIT ---- */
function init() {
  document.documentElement.setAttribute("data-theme", loadTheme());
  loadDreams();
  renderDreams();
  updateStats();
  showQuote();
  buildStars();
  initRangeSlider("dreamProgress", "progressLabel");
  lucide.createIcons();
  console.log("✦ DreamFlow Dream List initialized! Dreams:", state.dreams.length);
}

init();
