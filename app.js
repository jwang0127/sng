const STORAGE_KEY = "poker-sng-tv-state-v1";
const TOTAL_SEATS = 9;

const defaultSchedule = [
  { type: "level", label: "级别 1", smallBlind: 100, bigBlind: 200, ante: 0, minutes: 15 },
  { type: "level", label: "级别 2", smallBlind: 200, bigBlind: 400, ante: 0, minutes: 15 },
  { type: "level", label: "级别 3", smallBlind: 400, bigBlind: 800, ante: 0, minutes: 15 },
  { type: "level", label: "级别 4", smallBlind: 800, bigBlind: 1600, ante: 0, minutes: 15 },
  { type: "break", label: "休息计划", smallBlind: 0, bigBlind: 0, ante: 0, minutes: 5 },
  { type: "level", label: "级别 5", smallBlind: 1600, bigBlind: 3200, ante: 0, minutes: 15 },
  { type: "level", label: "级别 6", smallBlind: 3000, bigBlind: 6000, ante: 0, minutes: 15 },
  { type: "level", label: "级别 7", smallBlind: 6000, bigBlind: 12000, ante: 0, minutes: 15 },
  { type: "level", label: "级别 8", smallBlind: 10000, bigBlind: 20000, ante: 0, minutes: 15 },
  { type: "break", label: "休息计划", smallBlind: 0, bigBlind: 0, ante: 0, minutes: 5 },
  { type: "level", label: "级别 9", smallBlind: 15000, bigBlind: 30000, ante: 0, minutes: 15 },
  { type: "level", label: "级别 10", smallBlind: 20000, bigBlind: 40000, ante: 0, minutes: 15 },
  { type: "level", label: "级别 11", smallBlind: 30000, bigBlind: 60000, ante: 0, minutes: 15 },
  { type: "level", label: "级别 12", smallBlind: 40000, bigBlind: 80000, ante: 0, minutes: 15 }
];

const seatPositions = [
  { top: "6%", left: "50%" },
  { top: "20%", left: "78%" },
  { top: "44%", left: "88%" },
  { top: "72%", left: "78%" },
  { top: "84%", left: "50%" },
  { top: "72%", left: "22%" },
  { top: "44%", left: "12%" },
  { top: "20%", left: "22%" },
  { top: "9%", left: "28%" }
];

const initialState = {
  schedule: structuredClone(defaultSchedule),
  currentIndex: 0,
  timeLeft: defaultSchedule[0].minutes * 60,
  isRunning: false,
  startingStack: 15000,
  seats: Array.from({ length: TOTAL_SEATS }, (_, index) => ({
    name: `座位 ${index + 1}`,
    active: true
  }))
};

let state = loadState();
let timerHandle = null;

const elements = {
  levelLabel: document.getElementById("levelLabel"),
  timerDisplay: document.getElementById("timerDisplay"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  resetTimerBtn: document.getElementById("resetTimerBtn"),
  smallBlindValue: document.getElementById("smallBlindValue"),
  bigBlindValue: document.getElementById("bigBlindValue"),
  anteValue: document.getElementById("anteValue"),
  breakBadge: document.getElementById("breakBadge"),
  playersLeftValue: document.getElementById("playersLeftValue"),
  nextLevelValue: document.getElementById("nextLevelValue"),
  avgStackValue: document.getElementById("avgStackValue"),
  seats: document.getElementById("seats"),
  tableCenterSummary: document.getElementById("tableCenterSummary"),
  prevLevelBtn: document.getElementById("prevLevelBtn"),
  nextLevelBtn: document.getElementById("nextLevelBtn"),
  addMinuteBtn: document.getElementById("addMinuteBtn"),
  subtractMinuteBtn: document.getElementById("subtractMinuteBtn"),
  resetPlayersBtn: document.getElementById("resetPlayersBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  startingStackInput: document.getElementById("startingStackInput"),
  scheduleSummary: document.getElementById("scheduleSummary"),
  toggleEditorBtn: document.getElementById("toggleEditorBtn"),
  editorPanel: document.getElementById("editorPanel"),
  scheduleTableBody: document.getElementById("scheduleTableBody"),
  addLevelBtn: document.getElementById("addLevelBtn"),
  addBreakBtn: document.getElementById("addBreakBtn"),
  restoreDefaultsBtn: document.getElementById("restoreDefaultsBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn")
};

bindEvents();
render();
ensureTimer();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.schedule) || !Array.isArray(saved.seats)) {
      return structuredClone(initialState);
    }
    return {
      ...structuredClone(initialState),
      ...saved
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.startPauseBtn.addEventListener("click", toggleTimer);
  elements.resetTimerBtn.addEventListener("click", () => {
    state.timeLeft = getCurrentItem().minutes * 60;
    state.isRunning = false;
    saveAndRender();
  });
  elements.prevLevelBtn.addEventListener("click", () => jumpLevel(-1));
  elements.nextLevelBtn.addEventListener("click", () => jumpLevel(1));
  elements.addMinuteBtn.addEventListener("click", () => adjustTime(60));
  elements.subtractMinuteBtn.addEventListener("click", () => adjustTime(-60));
  elements.resetPlayersBtn.addEventListener("click", () => {
    state.seats.forEach((seat) => { seat.active = true; });
    saveAndRender();
  });
  elements.resetAllBtn.addEventListener("click", () => {
    state = structuredClone(initialState);
    saveAndRender();
  });
  elements.startingStackInput.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value > 0) {
      state.startingStack = value;
      saveAndRender();
    }
  });
  elements.toggleEditorBtn.addEventListener("click", () => {
    document.querySelector(".rail-card:last-child").classList.toggle("editor-collapsed");
  });
  elements.addLevelBtn.addEventListener("click", () => {
    const nextLevelNumber = state.schedule.filter((item) => item.type === "level").length + 1;
    state.schedule.push({
      type: "level",
      label: `级别 ${nextLevelNumber}`,
      smallBlind: 50000,
      bigBlind: 100000,
      ante: 0,
      minutes: 15
    });
    saveAndRender();
  });
  elements.addBreakBtn.addEventListener("click", () => {
    state.schedule.push({
      type: "break",
      label: "休息计划",
      smallBlind: 0,
      bigBlind: 0,
      ante: 0,
      minutes: 5
    });
    saveAndRender();
  });
  elements.restoreDefaultsBtn.addEventListener("click", () => {
    state.schedule = structuredClone(defaultSchedule);
    state.currentIndex = 0;
    state.timeLeft = state.schedule[0].minutes * 60;
    state.isRunning = false;
    saveAndRender();
  });
  elements.fullscreenBtn.addEventListener("click", async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  });
}

function ensureTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (!state.isRunning) {
      return;
    }
    if (state.timeLeft > 0) {
      state.timeLeft -= 1;
      saveAndRender(false);
      return;
    }
    state.isRunning = false;
    jumpLevel(1, true);
  }, 1000);
}

function toggleTimer() {
  state.isRunning = !state.isRunning;
  saveAndRender();
}

function adjustTime(delta) {
  state.timeLeft = Math.max(0, state.timeLeft + delta);
  saveAndRender();
}

function jumpLevel(delta, autoAdvance = false) {
  const nextIndex = Math.min(state.schedule.length - 1, Math.max(0, state.currentIndex + delta));
  if (nextIndex === state.currentIndex && autoAdvance) {
    return;
  }
  state.currentIndex = nextIndex;
  state.timeLeft = getCurrentItem().minutes * 60;
  if (autoAdvance) {
    state.isRunning = true;
  }
  saveAndRender();
}

function getCurrentItem() {
  return state.schedule[state.currentIndex] || state.schedule[0];
}

function getNextLevel() {
  return state.schedule.slice(state.currentIndex + 1).find((item) => item.type === "level");
}

function getPlayersLeft() {
  return state.seats.filter((seat) => seat.active).length;
}

function render() {
  renderHero();
  renderSeats();
  renderSchedule();
  elements.startingStackInput.value = state.startingStack;
}

function renderHero() {
  const current = getCurrentItem();
  const next = getNextLevel();
  const playersLeft = getPlayersLeft();
  const totalChips = TOTAL_SEATS * state.startingStack;
  const avgStack = playersLeft > 0 ? Math.round(totalChips / playersLeft) : 0;

  elements.levelLabel.textContent = current.type === "break" ? current.label : current.label;
  elements.timerDisplay.textContent = formatTime(state.timeLeft);
  elements.startPauseBtn.textContent = state.isRunning ? "暂停" : "开始";
  elements.smallBlindValue.textContent = current.type === "break" ? "-" : formatNumber(current.smallBlind);
  elements.bigBlindValue.textContent = current.type === "break" ? "-" : formatNumber(current.bigBlind);
  elements.anteValue.textContent = current.type === "break" ? `休息 ${current.minutes} 分钟` : `Ante ${formatNumber(current.ante)}`;
  elements.breakBadge.classList.toggle("hidden", current.type !== "break");
  elements.playersLeftValue.textContent = `${playersLeft} / ${TOTAL_SEATS}`;
  elements.nextLevelValue.textContent = next ? `${formatNumber(next.smallBlind)} / ${formatNumber(next.bigBlind)}` : "已是最后一级";
  elements.avgStackValue.textContent = formatNumber(avgStack);
  elements.tableCenterSummary.textContent = `${playersLeft} 人在桌`;

  const levelCount = state.schedule.filter((item) => item.type === "level").length;
  const breakCount = state.schedule.filter((item) => item.type === "break").length;
  elements.scheduleSummary.textContent = `共 ${levelCount} 个级别，${breakCount} 次休息。单击座位可淘汰/恢复玩家。`;
}

function renderSeats() {
  elements.seats.innerHTML = "";
  const template = document.getElementById("seatTemplate");
  state.seats.forEach((seat, index) => {
    const seatNode = template.content.firstElementChild.cloneNode(true);
    seatNode.style.top = seatPositions[index].top;
    seatNode.style.left = seatPositions[index].left;
    seatNode.style.transform = "translate(-50%, -50%)";
    seatNode.classList.toggle("out", !seat.active);
    seatNode.querySelector(".seat-name").textContent = seat.name;
    seatNode.querySelector(".seat-status").textContent = seat.active ? "在场" : "已淘汰";
    seatNode.addEventListener("click", () => {
      state.seats[index].active = !state.seats[index].active;
      saveAndRender();
    });
    elements.seats.appendChild(seatNode);
  });
}

function renderSchedule() {
  elements.scheduleTableBody.innerHTML = "";
  state.schedule.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input data-field="smallBlind" data-index="${index}" type="number" min="0" value="${item.smallBlind}"></td>
      <td><input data-field="bigBlind" data-index="${index}" type="number" min="0" value="${item.bigBlind}"></td>
      <td><input data-field="ante" data-index="${index}" type="number" min="0" value="${item.ante}"></td>
      <td><input data-field="minutes" data-index="${index}" type="number" min="1" value="${item.minutes}"></td>
      <td>
        <select data-field="type" data-index="${index}">
          <option value="level" ${item.type === "level" ? "selected" : ""}>级别</option>
          <option value="break" ${item.type === "break" ? "selected" : ""}>休息</option>
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button class="ghost-btn small-btn" data-action="use" data-index="${index}">跳转</button>
          <button class="danger-btn small-btn" data-action="delete" data-index="${index}">删除</button>
        </div>
      </td>
    `;
    elements.scheduleTableBody.appendChild(row);
  });

  elements.scheduleTableBody.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("change", handleScheduleEdit);
  });
  elements.scheduleTableBody.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", handleScheduleAction);
  });
}

function handleScheduleEdit(event) {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  const item = state.schedule[index];
  if (!item) {
    return;
  }
  if (field === "type") {
    item.type = event.target.value;
    if (item.type === "break") {
      item.label = "休息计划";
      item.smallBlind = 0;
      item.bigBlind = 0;
      item.ante = 0;
    } else {
      item.label = `级别 ${getLevelNumberAt(index)}`;
    }
  } else {
    item[field] = Number(event.target.value);
  }
  refreshLabels();
  if (index === state.currentIndex) {
    state.timeLeft = Math.min(state.timeLeft, item.minutes * 60);
  }
  saveAndRender();
}

function handleScheduleAction(event) {
  const action = event.target.dataset.action;
  const index = Number(event.target.dataset.index);
  if (action === "use") {
    state.currentIndex = index;
    state.timeLeft = state.schedule[index].minutes * 60;
    state.isRunning = false;
  }
  if (action === "delete") {
    if (state.schedule.length === 1) {
      return;
    }
    state.schedule.splice(index, 1);
    state.currentIndex = Math.min(state.currentIndex, state.schedule.length - 1);
    state.timeLeft = state.schedule[state.currentIndex].minutes * 60;
  }
  refreshLabels();
  saveAndRender();
}

function refreshLabels() {
  let levelCounter = 0;
  state.schedule.forEach((item) => {
    if (item.type === "level") {
      levelCounter += 1;
      item.label = `级别 ${levelCounter}`;
    } else {
      item.label = "休息计划";
    }
  });
}

function getLevelNumberAt(index) {
  return state.schedule.slice(0, index + 1).filter((item) => item.type === "level").length;
}

function saveAndRender(shouldPersist = true) {
  if (shouldPersist) {
    saveState();
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  render();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}
