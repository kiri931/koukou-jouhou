/**
 * Time Scheduler App
 * タイムスケジューラアプリケーション
 */

// ========================================
// State Management
// ========================================
const state = {
  totalTime: 60, // 分
  tasks: [
    { id: Date.now(), name: 'タスク1', duration: 20, color: '#FFB3BA' },
    { id: Date.now() + 1, name: 'タスク2', duration: 15, color: '#BAFFC9' },
    { id: Date.now() + 2, name: 'タスク3', duration: 10, color: '#BAE1FF' }
  ],
  taskColorOptions: ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#00acc1', '#6d4c41'],
  showTaskTime: true,
  showRemainingTime: true,
  showCurrentTime: true,
  startMode: 'now', // 'now' or 'scheduled'
  scheduledTime: null,
  timer: null,
  isPaused: false,
  startTime: null,
  pausedTime: 0,
  currentTaskIndex: 0
};

// ========================================
// DOM Elements
// ========================================
const elements = {
  // Display
  currentTask: document.getElementById('currentTask'),
  taskDuration: document.getElementById('taskDuration'),
  remainingTime: document.getElementById('remainingTime'),
  currentTime: document.getElementById('currentTime'),
  taskTimeBox: document.getElementById('taskTimeBox'),
  remainingTimeBox: document.getElementById('remainingTimeBox'),
  currentTimeBox: document.getElementById('currentTimeBox'),
  totalEndTime: document.getElementById('totalEndTime'),
  totalWarning: document.getElementById('totalWarning'),
  chart: document.getElementById('chart'),
  chartContainer: document.getElementById('chartContainer'),

  // Controls
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resetBtn: document.getElementById('resetBtn'),
  settingsBtn: document.getElementById('settingsBtn'),

  // Bottom Sheet
  bottomSheet: document.getElementById('bottomSheet'),
  overlay: document.getElementById('overlay'),
  closeSheetBtn: document.getElementById('closeSheetBtn'),

  // Settings
  totalTimeSlider: document.getElementById('totalTimeSlider'),
  totalTimeInput: document.getElementById('totalTimeInput'),
  taskList: document.getElementById('taskList'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  toggleTaskTime: document.getElementById('toggleTaskTime'),
  toggleRemainingTime: document.getElementById('toggleRemainingTime'),
  toggleCurrentTime: document.getElementById('toggleCurrentTime'),
  scheduledTimeContainer: document.getElementById('scheduledTimeContainer'),
  scheduledTime: document.getElementById('scheduledTime'),

  // Presets
  savePresetBtn: document.getElementById('savePresetBtn'),
  loadPresetBtn: document.getElementById('loadPresetBtn'),
  clearPresetBtn: document.getElementById('clearPresetBtn')
};

// ========================================
// Initialization
// ========================================
function init() {
  setupEventListeners();
  renderTaskList();
  renderChart();
  applyDisplayToggles();
  updateTotalEndTime();
  updateTotalWarning();
  updateCurrentTimeDisplay();
  setInterval(updateCurrentTimeDisplay, 1000);
  loadFromLocalStorage();
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
  // Total Time
  elements.totalTimeSlider.addEventListener('input', (e) => {
    state.totalTime = parseInt(e.target.value);
    elements.totalTimeInput.value = state.totalTime;
    updateTotalEndTime();
    updateTotalWarning();
    renderChart();
  });

  elements.totalTimeInput.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (value < 1) value = 1;
    if (value > 480) value = 480;
    state.totalTime = value;
    elements.totalTimeSlider.value = value;
    updateTotalEndTime();
    updateTotalWarning();
    renderChart();
  });

  // Add Task
  elements.addTaskBtn.addEventListener('click', addTask);

  // Display Toggles
  elements.toggleTaskTime.addEventListener('change', (e) => {
    state.showTaskTime = e.target.checked;
    applyDisplayToggles();
  });

  elements.toggleRemainingTime.addEventListener('change', (e) => {
    state.showRemainingTime = e.target.checked;
    applyDisplayToggles();
  });

  elements.toggleCurrentTime.addEventListener('change', (e) => {
    state.showCurrentTime = e.target.checked;
    applyDisplayToggles();
    renderChart();
  });

  // Start Mode
  document.querySelectorAll('input[name="startMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.startMode = e.target.value;
      elements.scheduledTimeContainer.style.display = 
        state.startMode === 'scheduled' ? 'block' : 'none';
      updateTotalEndTime();
    });
  });

  elements.scheduledTime.addEventListener('change', (e) => {
    state.scheduledTime = e.target.value;
    updateTotalEndTime();
  });

  // Bottom Sheet
  elements.settingsBtn.addEventListener('click', openBottomSheet);
  elements.closeSheetBtn.addEventListener('click', closeBottomSheet);
  elements.overlay.addEventListener('click', closeBottomSheet);

  // Controls
  elements.startBtn.addEventListener('click', startTimer);
  elements.pauseBtn.addEventListener('click', pauseTimer);
  elements.resetBtn.addEventListener('click', resetTimer);

  // Presets
  elements.savePresetBtn.addEventListener('click', savePreset);
  elements.loadPresetBtn.addEventListener('click', loadPreset);
  elements.clearPresetBtn.addEventListener('click', clearPreset);
}

// ========================================
// Chart Rendering
// ========================================
function renderChart() {
  const svg = elements.chart;
  svg.innerHTML = '';
  elements.chartContainer.querySelectorAll('.ts-chart-label').forEach(el => el.remove());
  elements.chartContainer.querySelectorAll('.ts-clock-marks').forEach(el => el.remove());
  elements.chartContainer.querySelectorAll('.ts-clock-center').forEach(el => el.remove());

  // 時計の目盛りを描画
  drawClockMarks();

  const totalDuration = state.tasks.reduce((sum, task) => sum + task.duration, 0);
  updateTotalWarning();
  const radius = 80;
  const centerX = 100;
  const centerY = 100;
  const strokeWidth = 40;

  let currentAngle = 0;
  let cumulativeMinutes = 0;
  const baseTime = state.showCurrentTime ? getPlannedBaseTime() : null;

  // タスクを描画
  state.tasks.forEach((task, index) => {
    const taskAngle = (task.duration / state.totalTime) * 360;
    const color = task.color || state.taskColorOptions[index % state.taskColorOptions.length];

    // タスクのパスを描画
    const startAngle = currentAngle;
    const endAngle = currentAngle + taskAngle;

    const path = createArc(centerX, centerY, radius, startAngle, endAngle, strokeWidth, color, index);
    svg.appendChild(path);

    // ラベルを配置
    const labelAngle = startAngle + taskAngle / 2;
    const labelRadius = radius + 10;
    const labelX = centerX + labelRadius * Math.cos((labelAngle - 90) * Math.PI / 180);
    const labelY = centerY + labelRadius * Math.sin((labelAngle - 90) * Math.PI / 180);

    const label = document.createElement('div');
    label.className = 'ts-chart-label';
    label.textContent = buildTaskLabel(task, cumulativeMinutes, baseTime);
    label.style.left = `${(labelX / 200) * 100}%`;
    label.style.top = `${(labelY / 200) * 100}%`;
    label.style.color = adjustColorBrightness(color, -40);
    elements.chartContainer.appendChild(label);

    currentAngle = endAngle;
    cumulativeMinutes += task.duration;
  });

  // 未定時間を描画
  if (totalDuration < state.totalTime) {
    const undefinedDuration = state.totalTime - totalDuration;
    const undefinedAngle = (undefinedDuration / state.totalTime) * 360;
    const path = createArc(centerX, centerY, radius, currentAngle, currentAngle + undefinedAngle, 
      strokeWidth, '#e0e0e0', -1);
    svg.appendChild(path);

    // 未定ラベル
    const labelAngle = currentAngle + undefinedAngle / 2;
    const labelRadius = radius + 10;
    const labelX = centerX + labelRadius * Math.cos((labelAngle - 90) * Math.PI / 180);
    const labelY = centerY + labelRadius * Math.sin((labelAngle - 90) * Math.PI / 180);

    const label = document.createElement('div');
    label.className = 'ts-chart-label';
    label.textContent = '未定';
    label.style.left = `${(labelX / 200) * 100}%`;
    label.style.top = `${(labelY / 200) * 100}%`;
    label.style.color = '#999';
    elements.chartContainer.appendChild(label);
  }

  // 中心点を描画
  const centerDot = document.createElement('div');
  centerDot.className = 'ts-clock-center';
  elements.chartContainer.appendChild(centerDot);

  // 進行状況の円（タイマー動作中に更新）
  if (state.timer) {
    updateProgress();
  }

}

function buildTaskLabel(task, startOffsetMinutes, baseTime) {
  const name = task.name || 'タスク';
  if (!state.showCurrentTime || !baseTime) {
    return name;
  }
  const start = new Date(baseTime.getTime() + startOffsetMinutes * 60000);
  const end = new Date(start.getTime() + task.duration * 60000);
  return `${name} ${formatClock(start)}-${formatClock(end)}`;
}

function getPlannedBaseTime() {
  const now = new Date();
  if (state.startMode === 'scheduled' && state.scheduledTime) {
    const [hours, minutes] = state.scheduledTime.split(':').map(Number);
    const planned = new Date(now);
    planned.setHours(hours, minutes, 0, 0);
    return planned;
  }
  if (state.startMode === 'scheduled') {
    return null;
  }
  return now;
}

function drawClockMarks() {
  const marksContainer = document.createElement('div');
  marksContainer.className = 'ts-clock-marks';
  
  for (let i = 0; i < 60; i++) {
    const mark = document.createElement('div');
    const angle = (i * 6) - 90; // 6度ずつ、-90度からスタート（12時の位置）
    const isMajor = i % 5 === 0; // 5分ごとに大きな目盛り
    
    mark.className = isMajor ? 'ts-clock-mark major' : 'ts-clock-mark minor';
    
    const radius = isMajor ? 47 : 48; // 大きな目盛りは少し長め
    const x = 50 + radius * Math.cos(angle * Math.PI / 180);
    const y = 50 + radius * Math.sin(angle * Math.PI / 180);
    
    mark.style.left = `${x}%`;
    mark.style.top = `${y}%`;
    mark.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;
    
    marksContainer.appendChild(mark);
  }
  
  elements.chartContainer.appendChild(marksContainer);
}

function createArc(cx, cy, r, startAngle, endAngle, strokeWidth, color, index) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  const d = [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', strokeWidth);
  path.setAttribute('stroke-linecap', 'butt');
  path.setAttribute('stroke-linejoin', 'miter');
  
  if (index >= 0) {
    path.setAttribute('data-task-index', index);
  }

  return path;
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function updateProgress() {
  // 既存の進行状況円と長針を削除
  const existingProgress = elements.chart.querySelector('.ts-progress');
  if (existingProgress) {
    existingProgress.remove();
  }
  const existingHand = elements.chartContainer.querySelector('.ts-clock-hand');
  if (existingHand) {
    existingHand.remove();
  }

  const elapsedMinutes = getElapsedMinutes();
  const progressAngle = (elapsedMinutes / state.totalTime) * 360;

  if (progressAngle > 0 && progressAngle <= 360) {
    // 進んだ部分を灰色のオーバーレイで表示
    const progressPath = createArc(100, 100, 90, 0, progressAngle, 35, 'rgba(160, 160, 160, 0.6)', -1);
    progressPath.classList.add('ts-progress');
    elements.chart.appendChild(progressPath);
    
    // 長針を作成（時計の針のように）
    const hand = document.createElement('div');
    hand.className = 'ts-clock-hand';
    
    // 針の長さ（半径の約85%）
    const containerSize = elements.chartContainer.offsetWidth;
    const handLength = containerSize * 0.42; // 半径の約85%
    
    hand.style.height = `${handLength}px`;
    hand.style.transform = `translate(-50%, -100%) rotate(${progressAngle}deg)`;
    
    elements.chartContainer.appendChild(hand);
  }
}

function adjustColorBrightness(color, amount) {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ========================================
// Task Management
// ========================================
function renderTaskList() {
  elements.taskList.innerHTML = '';
  state.tasks.forEach((task, index) => {
    const item = createTaskElement(task, index);
    elements.taskList.appendChild(item);
  });
  setupDragAndDrop();
}

function createTaskElement(task, index) {
  const div = document.createElement('div');
  div.className = 'ts-task-item';
  div.draggable = false;
  div.dataset.index = index;

  const taskColor = task.color || state.taskColorOptions[index % state.taskColorOptions.length];
  const paletteButtons = state.taskColorOptions.map((color) => {
    const isActive = color.toLowerCase() === taskColor.toLowerCase();
    return `
      <button
        type="button"
        class="ts-color-btn${isActive ? ' active' : ''}"
        data-color="${color}"
        style="background: ${color};"
        title="${color}"
      ></button>
    `;
  }).join('');

  div.innerHTML = `
    <div class="ts-task-header">
      <span class="ts-drag-handle" draggable="true" title="ドラッグで並び替え">☰</span>
      <input type="text" class="dg-input" value="${task.name}" data-field="name">
      <button class="dg-btn dg-btn--danger" data-action="delete">✕</button>
    </div>
    <div class="ts-task-duration-row">
      <span class="dg-label">時間:</span>
      <input type="range" class="ts-slider" value="${task.duration}" min="1" max="120" data-field="duration-slider">
      <input type="number" class="dg-input ts-slider-input" value="${task.duration}" min="1" data-field="duration">
      <span>分</span>
    </div>
    <div class="ts-task-colors">
      <span class="dg-label">色:</span>
      ${paletteButtons}
    </div>
  `;

  // イベント
  div.querySelector('[data-field="name"]').addEventListener('input', (e) => {
    state.tasks[index].name = e.target.value;
    renderChart();
  });

  div.querySelectorAll('.ts-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tasks[index].color = btn.dataset.color;
      renderTaskList();
      renderChart();
    });
  });

  const durationSlider = div.querySelector('[data-field="duration-slider"]');
  const durationInput = div.querySelector('[data-field="duration"]');

  durationSlider.addEventListener('input', (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    state.tasks[index].duration = value;
    durationInput.value = value;
    renderChart();
  });

  durationInput.addEventListener('input', (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    state.tasks[index].duration = value;
    durationSlider.value = value;
    e.target.value = value;
    renderChart();
  });

  div.querySelector('[data-action="delete"]').addEventListener('click', () => {
    deleteTask(index);
  });

  return div;
}

function addTask() {
  // タスクに自動で色を割り当て（灰色系を除外）
  const newColor = state.taskColorOptions[state.tasks.length % state.taskColorOptions.length];
  
  state.tasks.push({
    id: Date.now(),
    name: `タスク${state.tasks.length + 1}`,
    duration: 10,
    color: newColor
  });
  renderTaskList();
  renderChart();
}

function deleteTask(index) {
  if (state.tasks.length === 1) {
    alert('最低1つのタスクが必要です');
    return;
  }
  state.tasks.splice(index, 1);
  renderTaskList();
  renderChart();
}

// ========================================
// Drag and Drop
// ========================================
function setupDragAndDrop() {
  const items = elements.taskList.querySelectorAll('.ts-task-item');
  
  items.forEach(item => {
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    const handle = item.querySelector('.ts-drag-handle');
    if (handle) {
      handle.addEventListener('dragstart', handleDragStart);
      handle.addEventListener('dragend', handleDragEnd);
    }
  });
}

let draggedIndex = null;

function handleDragStart(e) {
  const item = e.currentTarget.closest('.ts-task-item');
  if (!item) return;
  draggedIndex = parseInt(item.dataset.index, 10);
  item.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const dropIndex = parseInt(e.currentTarget.dataset.index);
  
  if (draggedIndex !== null && draggedIndex !== dropIndex) {
    const draggedTask = state.tasks[draggedIndex];
    state.tasks.splice(draggedIndex, 1);
    state.tasks.splice(dropIndex, 0, draggedTask);
    renderTaskList();
    renderChart();
  }
}

function handleDragEnd(e) {
  const item = e.currentTarget.closest('.ts-task-item');
  if (item) {
    item.classList.remove('dragging');
  }
  draggedIndex = null;
}

// ========================================
// Timer Logic
// ========================================
function startTimer() {
  if (state.timer) return;

  // 開始時刻を計算
  if (state.startMode === 'scheduled' && state.scheduledTime) {
    const [hours, minutes] = state.scheduledTime.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    state.startTime = scheduledDate.getTime() - state.pausedTime;
  } else {
    state.startTime = Date.now() - state.pausedTime;
  }

  state.isPaused = false;
  elements.startBtn.style.display = 'none';
  elements.pauseBtn.style.display = 'inline-flex';

  state.timer = setInterval(updateTimer, 100);
  closeBottomSheet();
}

function pauseTimer() {
  if (!state.timer) return;

  clearInterval(state.timer);
  state.timer = null;
  state.isPaused = true;
  state.pausedTime = Date.now() - state.startTime;

  elements.startBtn.style.display = 'inline-flex';
  elements.pauseBtn.style.display = 'none';
  elements.startBtn.textContent = '▶️ 再開';
}

function resetTimer() {
  if (state.timer) {
    clearInterval(state.timer);
  }

  state.timer = null;
  state.isPaused = false;
  state.startTime = null;
  state.pausedTime = 0;
  state.currentTaskIndex = 0;

  elements.startBtn.style.display = 'inline-flex';
  elements.pauseBtn.style.display = 'none';
  elements.startBtn.textContent = '▶️ スタート';
  elements.currentTask.textContent = '準備完了';
  elements.taskDuration.textContent = '--:--';
  elements.remainingTime.textContent = '--:--';

  renderChart();
}

function updateTimer() {
  const elapsedMinutes = getElapsedMinutes();
  const elapsedSeconds = Math.floor(elapsedMinutes * 60);

  // 現在のタスクを特定
  let cumulativeTime = 0;
  let currentTask = null;
  let taskStartTime = 0;

  for (let i = 0; i < state.tasks.length; i++) {
    if (elapsedMinutes < cumulativeTime + state.tasks[i].duration) {
      currentTask = state.tasks[i];
      state.currentTaskIndex = i;
      taskStartTime = cumulativeTime;
      break;
    }
    cumulativeTime += state.tasks[i].duration;
  }

  // 全タスク完了チェック
  if (elapsedMinutes >= state.totalTime || !currentTask) {
    clearInterval(state.timer);
    state.timer = null;
    elements.currentTask.textContent = '完了！';
    elements.taskDuration.textContent = formatTime(0);
    elements.remainingTime.textContent = formatTime(0);
    elements.startBtn.style.display = 'inline-flex';
    elements.pauseBtn.style.display = 'none';
    return;
  }

  // 表示更新
  elements.currentTask.textContent = currentTask.name;
  elements.taskDuration.textContent = formatTime(currentTask.duration * 60);
  
  const taskElapsed = (elapsedMinutes - taskStartTime) * 60;
  const taskRemaining = currentTask.duration * 60 - taskElapsed;
  elements.remainingTime.textContent = formatTime(Math.max(0, taskRemaining));

  updateProgress();
}

function getElapsedMinutes() {
  if (!state.startTime) return 0;
  return (Date.now() - state.startTime) / 60000;
}

function updateCurrentTimeDisplay() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  elements.currentTime.textContent = `${hours}:${minutes}:${seconds}`;
  updateTotalEndTime();
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function updateTotalEndTime() {
  if (!elements.totalEndTime) return;
  const base = getPlannedBaseTime();
  if (!base) {
    elements.totalEndTime.textContent = '終了 --:--';
    return;
  }
  const end = new Date(base.getTime() + state.totalTime * 60000);
  elements.totalEndTime.textContent = `終了 ${formatClock(end)}`;
}

function updateTotalWarning() {
  if (!elements.totalWarning) return;
  const totalTasks = state.tasks.reduce((sum, task) => sum + task.duration, 0);
  const shouldWarn = totalTasks > state.totalTime;
  elements.totalWarning.style.display = shouldWarn ? 'inline' : 'none';
}

function applyDisplayToggles() {
  elements.taskTimeBox.style.display = state.showTaskTime ? '' : 'none';
  elements.remainingTimeBox.style.display = state.showRemainingTime ? '' : 'none';
  elements.currentTimeBox.style.display = state.showCurrentTime ? '' : 'none';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ========================================
// Bottom Sheet
// ========================================
function openBottomSheet() {
  elements.bottomSheet.classList.add('ts-open');
  elements.overlay.classList.add('ts-show');
}

function closeBottomSheet() {
  elements.bottomSheet.classList.remove('ts-open');
  elements.overlay.classList.remove('ts-show');
}

// ========================================
// LocalStorage
// ========================================
function savePreset() {
  const preset = {
    totalTime: state.totalTime,
    tasks: state.tasks,
    showTaskTime: state.showTaskTime,
    showRemainingTime: state.showRemainingTime,
    showCurrentTime: state.showCurrentTime,
    startMode: state.startMode,
    scheduledTime: state.scheduledTime
  };

  localStorage.setItem('timeSchedulerPreset', JSON.stringify(preset));
  alert('設定を保存しました！');
}

function loadPreset() {
  const saved = localStorage.getItem('timeSchedulerPreset');
  if (!saved) {
    alert('保存されたデータがありません');
    return;
  }

  const preset = JSON.parse(saved);
  state.totalTime = preset.totalTime;
  state.tasks = preset.tasks;
  state.showTaskTime = preset.showTaskTime !== false;
  state.showRemainingTime = preset.showRemainingTime !== false;
  state.showCurrentTime = preset.showCurrentTime !== false;
  state.startMode = preset.startMode || 'now';
  state.scheduledTime = preset.scheduledTime;

  // UI更新
  elements.totalTimeSlider.value = state.totalTime;
  elements.totalTimeInput.value = state.totalTime;
  elements.toggleTaskTime.checked = state.showTaskTime;
  elements.toggleRemainingTime.checked = state.showRemainingTime;
  elements.toggleCurrentTime.checked = state.showCurrentTime;
  
  if (state.scheduledTime) {
    elements.scheduledTime.value = state.scheduledTime;
  }

  document.querySelector(`input[name="startMode"][value="${state.startMode}"]`).checked = true;
  elements.scheduledTimeContainer.style.display = 
    state.startMode === 'scheduled' ? 'block' : 'none';

  renderTaskList();
  applyDisplayToggles();
  updateTotalEndTime();
  renderChart();

  alert('設定を読み込みました！');
}

function clearPreset() {
  if (confirm('保存されたデータを削除しますか？')) {
    localStorage.removeItem('timeSchedulerPreset');
    alert('データを削除しました');
  }
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('timeSchedulerPreset');
  if (saved) {
    try {
      const preset = JSON.parse(saved);
      state.totalTime = preset.totalTime;
      state.tasks = preset.tasks;
      state.showTaskTime = preset.showTaskTime !== false;
      state.showRemainingTime = preset.showRemainingTime !== false;
      state.showCurrentTime = preset.showCurrentTime !== false;
      state.startMode = preset.startMode || 'now';
      state.scheduledTime = preset.scheduledTime;

      // UI更新
      elements.totalTimeSlider.value = state.totalTime;
      elements.totalTimeInput.value = state.totalTime;
      elements.toggleTaskTime.checked = state.showTaskTime;
      elements.toggleRemainingTime.checked = state.showRemainingTime;
      elements.toggleCurrentTime.checked = state.showCurrentTime;
      
      if (state.scheduledTime) {
        elements.scheduledTime.value = state.scheduledTime;
      }

      document.querySelector(`input[name="startMode"][value="${state.startMode}"]`).checked = true;
      elements.scheduledTimeContainer.style.display = 
        state.startMode === 'scheduled' ? 'block' : 'none';

      renderTaskList();
      applyDisplayToggles();
      updateTotalEndTime();
      renderChart();
    } catch (e) {
      console.error('Failed to load preset:', e);
    }
  }
}

// ========================================
// Start App
// ========================================
init();
