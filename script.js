const STORAGE_KEY = "smart-tasks";
const PREF_KEY = "smart-preferences";

const taskForm = document.getElementById("task-form");
const saveButton = document.getElementById("save-task");
const resetButton = document.getElementById("reset-form");
const taskList = document.getElementById("task-list");
const themeToggle = document.getElementById("theme-toggle");
const clearCompletedButton = document.getElementById("clear-completed");
const seedDemoButton = document.getElementById("seed-demo");
const accentPicker = document.getElementById("accent");
const densitySelect = document.getElementById("density");

const searchInput = document.getElementById("search");
const rangeSelect = document.getElementById("range");
const statusSelect = document.getElementById("status");
const sortSelect = document.getElementById("sort");

const statTotal = document.getElementById("stat-total");
const statUpcoming = document.getElementById("stat-upcoming");
const statCompleted = document.getElementById("stat-completed");
const statOverdue = document.getElementById("stat-overdue");

let tasks = [];
let editingId = null;
let preferences = {
  theme: "light",
  accent: "#6c5ce7",
  density: "comfortable",
};

const formatDateTime = (date, time) => {
  if (!date) return "No date";
  const iso = time ? `${date}T${time}` : `${date}T00:00`;
  const parsed = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: time ? "short" : undefined,
  }).format(parsed);
};

const isSameDay = (target, compare) => {
  return (
    target.getFullYear() === compare.getFullYear() &&
    target.getMonth() === compare.getMonth() &&
    target.getDate() === compare.getDate()
  );
};

const getWeekRange = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getYearRange = (date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const parseTaskDate = (task) => {
  if (!task.date) return null;
  return new Date(`${task.date}T${task.time || "00:00"}`);
};

const loadState = () => {
  const storedTasks = localStorage.getItem(STORAGE_KEY);
  const storedPrefs = localStorage.getItem(PREF_KEY);
  tasks = storedTasks ? JSON.parse(storedTasks) : [];
  preferences = storedPrefs ? { ...preferences, ...JSON.parse(storedPrefs) } : preferences;
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
};

const applyPreferences = () => {
  document.documentElement.dataset.theme = preferences.theme === "dark" ? "dark" : "";
  document.documentElement.style.setProperty("--primary", preferences.accent);
  accentPicker.value = preferences.accent;
  densitySelect.value = preferences.density;
  document.body.classList.toggle("compact", preferences.density === "compact");
};

const resetForm = () => {
  taskForm.reset();
  document.getElementById("color").value = preferences.accent;
  editingId = null;
  saveButton.textContent = "Add task";
};

const buildTask = (formData) => {
  const now = new Date().toISOString();
  return {
    id: editingId || crypto.randomUUID(),
    title: formData.get("title").trim(),
    description: formData.get("description").trim(),
    date: formData.get("date"),
    time: formData.get("time"),
    duration: formData.get("duration"),
    repeat: formData.get("repeat"),
    priority: formData.get("priority"),
    category: formData.get("category").trim() || "General",
    tags: formData.get("tags").split(" ").filter(Boolean),
    color: formData.get("color"),
    reminder: formData.get("reminder") === "on",
    status: editingId ? tasks.find((task) => task.id === editingId)?.status || "open" : "open",
    createdAt: editingId ? tasks.find((task) => task.id === editingId)?.createdAt || now : now,
    updatedAt: now,
    pinned: false,
  };
};

const formatTags = (tags) => {
  if (!tags || !tags.length) return "No tags";
  return tags.join(" ");
};

const isOverdue = (task) => {
  if (!task.date || task.status === "done") return false;
  const taskDate = parseTaskDate(task);
  return taskDate && taskDate < new Date();
};

const matchesRange = (task, range) => {
  if (range === "all") return true;
  const taskDate = parseTaskDate(task);
  if (!taskDate) return range === "overdue" ? false : true;
  const today = new Date();
  if (range === "today") return isSameDay(taskDate, today);
  if (range === "week") {
    const { start, end } = getWeekRange(today);
    return taskDate >= start && taskDate <= end;
  }
  if (range === "month") {
    const { start, end } = getMonthRange(today);
    return taskDate >= start && taskDate <= end;
  }
  if (range === "year") {
    const { start, end } = getYearRange(today);
    return taskDate >= start && taskDate <= end;
  }
  if (range === "overdue") return taskDate < today && task.status !== "done";
  return true;
};

const sortTasks = (list, sortValue) => {
  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  return [...list].sort((a, b) => {
    if (sortValue === "priority") {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    if (sortValue === "created") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    const dateA = parseTaskDate(a) || new Date(8640000000000000);
    const dateB = parseTaskDate(b) || new Date(8640000000000000);
    if (sortValue === "date-desc") return dateB - dateA;
    return dateA - dateB;
  });
};

const updateStats = () => {
  const now = new Date();
  const { start, end } = getWeekRange(now);
  const upcoming = tasks.filter((task) => {
    const taskDate = parseTaskDate(task);
    return taskDate && taskDate >= start && taskDate <= end && task.status !== "done";
  }).length;
  statTotal.textContent = tasks.length;
  statUpcoming.textContent = upcoming;
  statCompleted.textContent = tasks.filter((task) => task.status === "done").length;
  statOverdue.textContent = tasks.filter((task) => isOverdue(task)).length;
};

const buildCalendarUrl = (task) => {
  const title = encodeURIComponent(task.title);
  const details = encodeURIComponent(`${task.description}\nTags: ${formatTags(task.tags)}`);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (task.date) {
    const start = task.time ? `${task.date.replace(/-/g, "")}T${task.time.replace(":", "")}00` : `${task.date.replace(/-/g, "")}T000000`;
    const endDate = new Date(`${task.date}T${task.time || "00:00"}`);
    if (task.time) {
      endDate.setMinutes(endDate.getMinutes() + 60);
    } else {
      endDate.setDate(endDate.getDate() + 1);
    }
    const end = `${endDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}&ctz=${timezone}`;
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&ctz=${timezone}`;
};

const renderTasks = () => {
  const searchTerm = searchInput.value.toLowerCase();
  const range = rangeSelect.value;
  const status = statusSelect.value;
  const sorted = sortTasks(
    tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        formatTags(task.tags).toLowerCase().includes(searchTerm);
      const matchesStatus = status === "all" || (status === "done" ? task.status === "done" : task.status !== "done");
      return matchesSearch && matchesStatus && matchesRange(task, range);
    }),
    sortSelect.value
  );

  taskList.innerHTML = "";
  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No tasks match your filters yet. Add something new or adjust your range.";
    taskList.appendChild(empty);
    updateStats();
    return;
  }

  sorted.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";
    if (task.status === "done") card.classList.add("completed");
    if (isOverdue(task)) card.classList.add("overdue");
    card.style.borderLeft = `6px solid ${task.color || preferences.accent}`;

    const header = document.createElement("div");
    header.className = "task-header";

    const title = document.createElement("div");
    title.className = "task-title";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.status === "done";
    checkbox.addEventListener("change", () => {
      task.status = checkbox.checked ? "done" : "open";
      task.updatedAt = new Date().toISOString();
      saveState();
      renderTasks();
    });

    const titleText = document.createElement("span");
    titleText.textContent = task.title;

    title.appendChild(checkbox);
    title.appendChild(titleText);

    const badges = document.createElement("div");
    badges.className = "task-badges";
    [task.priority, task.category, task.repeat].forEach((badge) => {
      if (!badge) return;
      const badgeEl = document.createElement("span");
      badgeEl.className = "badge";
      badgeEl.textContent = badge;
      badges.appendChild(badgeEl);
    });

    header.appendChild(title);
    header.appendChild(badges);

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.innerHTML = `
      <span><strong>When:</strong> ${formatDateTime(task.date, task.time)} • ${task.duration || "Flexible"}</span>
      <span><strong>Notes:</strong> ${task.description || "No details yet"}</span>
      <span><strong>Tags:</strong> ${formatTags(task.tags)}</span>
      <span><strong>Reminder:</strong> ${task.reminder ? "On" : "Off"}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      editingId = task.id;
      document.getElementById("title").value = task.title;
      document.getElementById("description").value = task.description;
      document.getElementById("date").value = task.date;
      document.getElementById("time").value = task.time;
      document.getElementById("duration").value = task.duration;
      document.getElementById("repeat").value = task.repeat;
      document.getElementById("priority").value = task.priority;
      document.getElementById("category").value = task.category;
      document.getElementById("tags").value = formatTags(task.tags);
      document.getElementById("color").value = task.color;
      document.getElementById("reminder").checked = task.reminder;
      saveButton.textContent = "Save changes";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const calendarButton = document.createElement("button");
    calendarButton.textContent = "Add to Google Calendar";
    calendarButton.addEventListener("click", () => {
      window.open(buildCalendarUrl(task), "_blank");
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveState();
      renderTasks();
    });

    actions.appendChild(editButton);
    actions.appendChild(calendarButton);
    actions.appendChild(deleteButton);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);

    taskList.appendChild(card);
  });

  updateStats();
};

const seedDemoTasks = () => {
  const today = new Date();
  const format = (date) => date.toISOString().split("T")[0];
  tasks = [
    {
      id: crypto.randomUUID(),
      title: "Plan weekly priorities",
      description: "Block focus time for top three outcomes.",
      date: format(today),
      time: "09:30",
      duration: "1 hr",
      repeat: "Weekly",
      priority: "High",
      category: "Work",
      tags: ["#planning", "#leadership"],
      color: "#6c5ce7",
      reminder: true,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Evening workout",
      description: "Strength training + stretch.",
      date: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)),
      time: "18:00",
      duration: "1 hr",
      repeat: "Daily",
      priority: "Medium",
      category: "Health",
      tags: ["#fitness"],
      color: "#2ecc71",
      reminder: true,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Birthday gift plan",
      description: "Order gift and schedule delivery.",
      date: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)),
      time: "",
      duration: "Flexible",
      repeat: "Yearly",
      priority: "Low",
      category: "Personal",
      tags: ["#family"],
      color: "#ffb347",
      reminder: false,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
    },
  ];
  saveState();
  renderTasks();
};

const handleSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const task = buildTask(formData);
  if (!task.title) return;
  if (editingId) {
    tasks = tasks.map((item) => (item.id === editingId ? task : item));
  } else {
    tasks.unshift(task);
  }
  saveState();
  renderTasks();
  resetForm();
};

const handlePreferenceChange = () => {
  preferences.accent = accentPicker.value;
  preferences.density = densitySelect.value;
  saveState();
  applyPreferences();
  renderTasks();
};

const init = () => {
  loadState();
  applyPreferences();
  renderTasks();

  taskForm.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", resetForm);
  searchInput.addEventListener("input", renderTasks);
  rangeSelect.addEventListener("change", renderTasks);
  statusSelect.addEventListener("change", renderTasks);
  sortSelect.addEventListener("change", renderTasks);
  clearCompletedButton.addEventListener("click", () => {
    tasks = tasks.filter((task) => task.status !== "done");
    saveState();
    renderTasks();
  });
  seedDemoButton.addEventListener("click", seedDemoTasks);
  themeToggle.addEventListener("click", () => {
    preferences.theme = preferences.theme === "dark" ? "light" : "dark";
    saveState();
    applyPreferences();
  });
  accentPicker.addEventListener("input", handlePreferenceChange);
  densitySelect.addEventListener("change", handlePreferenceChange);
};

init();
