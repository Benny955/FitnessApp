/**
 * FitTracker - Application Logic
 * iOS-inspired, premium performance training logger and statistics suite
 */

// --- APPLICATION STATE ---
const state = {
  plans: [],
  history: [],
  weightHistory: [],
  settings: {
    soundEnabled: true
  },
  activeWorkout: null,
  timer: {
    intervalId: null,
    totalSeconds: 90,
    secondsLeft: 90,
    isRunning: false,
    exerciseName: '',
    setInfo: ''
  }
};

// --- MOCK DATA FOR USER TESTING ---
const MOCK_PLANS = [
  {
    id: "plan-push",
    name: "Push (Brust, Trizeps, Schultern)",
    split: "5er Split",
    exercises: [
      { name: "Bankdrücken (Langhantel)", sets: 4, reps: 8, rest: 120 },
      { name: "Schrägbankdrücken (Kurzhantel)", sets: 3, reps: 10, rest: 90 },
      { name: "Schulterdrücken (Kurzhantel)", sets: 3, reps: 10, rest: 90 },
      { name: "Trizepsdrücken (Kabel)", sets: 3, reps: 12, rest: 60 }
    ]
  },
  {
    id: "plan-pull",
    name: "Pull (Rücken, Bizeps)",
    split: "5er Split",
    exercises: [
      { name: "Kreuzheben", sets: 3, reps: 5, rest: 180 },
      { name: "Klimmzüge", sets: 4, reps: 8, rest: 90 },
      { name: "Langhantelrudern", sets: 3, reps: 10, rest: 90 },
      { name: "Hammer Curls", sets: 3, reps: 12, rest: 60 }
    ]
  },
  {
    id: "plan-legs",
    name: "Beine & Bauch",
    split: "5er Split",
    exercises: [
      { name: "Kniebeugen", sets: 4, reps: 8, rest: 120 },
      { name: "Beinstrecker", sets: 3, reps: 12, rest: 60 },
      { name: "Wadenheben", sets: 4, reps: 15, rest: 60 }
    ]
  }
];

function generateMockHistory() {
  const history = [];
  const now = new Date();
  
  // Weights progression for Bankdrücken (60kg -> 67.5kg)
  const benchWeights = [60, 62.5, 62.5, 65, 65, 67.5];
  // Weights progression for Kreuzheben (90kg -> 102.5kg)
  const deadliftWeights = [90, 95, 95, 100, 100, 102.5];
  
  // Workouts in the last 30 days (6 sessions total, 3 push, 3 pull)
  for (let i = 0; i < 6; i++) {
    const workoutDate = new Date();
    workoutDate.setDate(now.getDate() - (25 - i * 4)); // spaced apart
    
    const isPush = i % 2 === 0;
    const plan = isPush ? MOCK_PLANS[0] : MOCK_PLANS[1];
    const indexFactor = Math.floor(i / 2);
    
    const workoutExercises = plan.exercises.map((ex, exIdx) => {
      let weight = 0;
      if (ex.name.includes("Bankdrücken")) {
        weight = benchWeights[i];
      } else if (ex.name.includes("Schrägbankdrücken")) {
        weight = 22.5 + indexFactor * 2.5;
      } else if (ex.name.includes("Schulterdrücken")) {
        weight = 17.5 + indexFactor * 2.5;
      } else if (ex.name.includes("Trizepsdrücken")) {
        weight = 25 + indexFactor * 2.5;
      } else if (ex.name.includes("Kreuzheben")) {
        weight = deadliftWeights[i];
      } else if (ex.name.includes("Klimmzüge")) {
        weight = 0; // Bodyweight
      } else if (ex.name.includes("Langhantelrudern")) {
        weight = 50 + indexFactor * 5;
      } else if (ex.name.includes("Hammer Curls")) {
        weight = 14 + indexFactor * 2;
      }

      const completedSets = [];
      for (let s = 0; s < ex.sets; s++) {
        completedSets.push({
          setNumber: s + 1,
          weight: weight,
          reps: ex.reps,
          done: true
        });
      }
      
      return {
        name: ex.name,
        sets: completedSets
      };
    });

    history.push({
      id: `workout-hist-${i}`,
      planId: plan.id,
      planName: plan.name,
      splitName: plan.split || 'Einzelne Pläne',
      date: workoutDate.toISOString(),
      durationMinutes: 45 + Math.floor(Math.random() * 15),
      exercises: workoutExercises
    });
  }

  return history;
}

function generateMockWeightHistory() {
  const list = [];
  const now = new Date();
  const weights = [84.5, 84.1, 83.6, 83.2, 82.9, 82.5];
  
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setDate(now.getDate() - (25 - i * 4));
    list.push({
      date: d.toISOString(),
      weight: weights[i]
    });
  }
  return list;
}

// --- LOCAL STORAGE HANDLING ---
function saveToLocalStorage() {
  localStorage.setItem('fittracker_plans', JSON.stringify(state.plans));
  localStorage.setItem('fittracker_history', JSON.stringify(state.history));
  localStorage.setItem('fittracker_weightHistory', JSON.stringify(state.weightHistory));
  localStorage.setItem('fittracker_settings', JSON.stringify(state.settings));
}

function loadFromLocalStorage() {
  const plansStr = localStorage.getItem('fittracker_plans');
  const histStr = localStorage.getItem('fittracker_history');
  const weightStr = localStorage.getItem('fittracker_weightHistory');
  const settingsStr = localStorage.getItem('fittracker_settings');
  
  if (plansStr) state.plans = JSON.parse(plansStr);
  if (histStr) state.history = JSON.parse(histStr);
  if (weightStr) state.weightHistory = JSON.parse(weightStr);
  if (settingsStr) state.settings = JSON.parse(settingsStr);
}

// --- APP NAVIGATION ---
function showView(viewId, headerTitle) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Show active view
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update header title
  const headerTitleEl = document.getElementById('header-title');
  if (headerTitleEl) {
    headerTitleEl.innerText = headerTitle;
  }

  // Manage header action button visibility based on view
  const actionBtn = document.getElementById('header-action-btn');
  if (viewId === 'workout') {
    actionBtn.classList.add('hidden');
  } else if (viewId === 'creator') {
    actionBtn.classList.remove('hidden');
    actionBtn.innerText = "Abbrechen";
    actionBtn.onclick = () => {
      resetCreatorForm();
      showView('home', 'Mein Training');
    };
  } else {
    actionBtn.classList.add('hidden');
  }

  // Update Bottom Tab Bar highlight
  document.querySelectorAll('.tab-item').forEach(item => {
    if (item.dataset.tab === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // View-specific initializations
  if (viewId === 'home') {
    renderHome();
  } else if (viewId === 'stats') {
    initStatsView();
  } else if (viewId === 'settings') {
    renderSettingsView();
  }
}

// --- HOME VIEW CONTROLLER ---
function renderHome() {
  const splitsContainer = document.getElementById('splits-container');
  const recentList = document.getElementById('recent-workouts-list');
  const recentHeader = document.querySelector('.recent-workouts-header');
  
  // Render Plans grouped by Splits (Überordner)
  if (state.plans.length === 0) {
    splitsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💪</div>
        <h3>Keine Trainingspläne</h3>
        <p>Erstelle deinen ersten Trainingsplan, um loszulegen!</p>
        <button id="btn-empty-create" class="btn-primary-pill">+ Trainingsplan erstellen</button>
      </div>
    `;
    document.getElementById('btn-empty-create').onclick = () => {
      setupCreatorView();
      showView('creator', 'Neuer Plan');
    };
  } else {
    splitsContainer.innerHTML = '';
    
    // Group plans by their split name
    const groupedPlans = {};
    state.plans.forEach(plan => {
      const splitName = (plan.split && plan.split.trim()) ? plan.split.trim() : "Einzelne Pläne";
      if (!groupedPlans[splitName]) {
        groupedPlans[splitName] = [];
      }
      groupedPlans[splitName].push(plan);
    });

    // Render each split folder
    Object.keys(groupedPlans).sort().forEach(splitName => {
      const splitGroup = document.createElement('div');
      splitGroup.className = 'split-group';
      
      const splitHeader = document.createElement('div');
      splitHeader.className = 'split-header';
      splitHeader.innerText = splitName;
      splitGroup.appendChild(splitHeader);

      const plansList = document.createElement('div');
      plansList.className = 'plans-list';

      groupedPlans[splitName].forEach(plan => {
        const card = document.createElement('div');
        card.className = 'plan-card';
        
        const exercisesHTML = plan.exercises.map(ex => 
          `<span class="exercise-tag">${ex.name} (${ex.sets}x${ex.reps})</span>`
        ).join('');

        card.innerHTML = `
          <div class="plan-card-header">
            <h3>${plan.name}</h3>
          </div>
          <div class="plan-card-meta">${plan.exercises.length} Übungen</div>
          <div class="plan-card-exercises">
            ${exercisesHTML}
          </div>
          <div class="plan-card-actions">
            <div class="plan-card-left-btns">
              <button class="btn-edit-plan" data-id="${plan.id}">Bearbeiten</button>
              <button class="btn-delete-plan" data-id="${plan.id}">Löschen</button>
            </div>
            <button class="btn-start-plan" data-id="${plan.id}">Starten</button>
          </div>
        `;
        plansList.appendChild(card);
      });

      splitGroup.appendChild(plansList);
      splitsContainer.appendChild(splitGroup);
    });

    // Wire up buttons
    document.querySelectorAll('.btn-start-plan').forEach(btn => {
      btn.onclick = (e) => startWorkout(e.target.dataset.id);
    });

    document.querySelectorAll('.btn-edit-plan').forEach(btn => {
      btn.onclick = (e) => editPlan(e.target.dataset.id);
    });

    document.querySelectorAll('.btn-delete-plan').forEach(btn => {
      btn.onclick = (e) => deletePlan(e.target.dataset.id);
    });
  }

  // Render Recent Workouts
  if (state.history.length === 0) {
    recentHeader.classList.add('hidden');
    recentList.innerHTML = '';
  } else {
    recentHeader.classList.remove('hidden');
    recentList.innerHTML = '';
    
    // Show last 4 completed workouts
    const recent = [...state.history].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    
    recent.forEach(work => {
      const date = new Date(work.date);
      const dateStr = date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      
      let totalWeight = 0;
      work.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.done) {
            totalWeight += (Number(set.weight) || 0) * (Number(set.reps) || 0);
          }
        });
      });

      const card = document.createElement('div');
      card.className = 'recent-workout-card';
      card.innerHTML = `
        <div class="recent-workout-info">
          <h4>${work.planName}</h4>
          <p>${dateStr} &bull; ${work.exercises.length} Übungen</p>
        </div>
        <div class="recent-workout-metrics">
          <div class="recent-workout-weight">${totalWeight.toLocaleString()} kg</div>
          <div class="recent-workout-time">${work.durationMinutes} Min.</div>
        </div>
      `;
      recentList.appendChild(card);
    });
  }

  updateGlobalMetrics();
}

function updateGlobalMetrics() {
  const weeklyCountBadge = document.getElementById('weekly-count-badge');
  const statTotalVolume = document.getElementById('stat-total-volume');
  const statAvgDuration = document.getElementById('stat-avg-duration');

  if (state.history.length === 0) {
    weeklyCountBadge.innerText = '0 Workouts';
    statTotalVolume.innerText = '0 kg';
    statAvgDuration.innerText = '0 Min';
    return;
  }

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const weeklyWorkouts = state.history.filter(w => new Date(w.date) >= sevenDaysAgo);
  weeklyCountBadge.innerText = `${weeklyWorkouts.length} Workout${weeklyWorkouts.length === 1 ? '' : 's'}`;

  let totalVolume = 0;
  let totalDuration = 0;

  state.history.forEach(w => {
    totalDuration += w.durationMinutes;
    w.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        if (s.done) {
          totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      });
    });
  });

  const avgDuration = Math.round(totalDuration / state.history.length);
  statTotalVolume.innerText = `${totalVolume.toLocaleString()} kg`;
  statAvgDuration.innerText = `${avgDuration} Min`;
}

function deletePlan(planId) {
  if (confirm('Bist du sicher, dass du diesen Trainingsplan löschen möchtest?')) {
    state.plans = state.plans.filter(p => p.id !== planId);
    saveToLocalStorage();
    renderHome();
  }
}

// --- CREATOR VIEW CONTROLLER (WITH EDIT FLOW) ---
let exerciseFieldIndex = 0;

function setupCreatorView() {
  const container = document.getElementById('creator-exercises-container');
  container.innerHTML = '';
  exerciseFieldIndex = 0;
  
  // Start with 1 default empty exercise field
  addExerciseField();
}

function resetCreatorForm() {
  document.getElementById('creator-edit-id').value = '';
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-split').value = '';
  document.getElementById('btn-save-plan').innerText = 'Plan speichern';
  setupCreatorView();
}

function addExerciseField(name = '', sets = 3, reps = 10, rest = 90) {
  const container = document.getElementById('creator-exercises-container');
  const index = exerciseFieldIndex++;

  const card = document.createElement('div');
  card.className = 'creator-exercise-card';
  card.id = `creator-ex-card-${index}`;
  card.innerHTML = `
    <div class="creator-exercise-header">
      <span class="creator-exercise-title">Übung #${index + 1}</span>
      ${index > 0 ? `<button type="button" class="btn-remove-exercise" onclick="removeExerciseField(${index})">Entfernen</button>` : ''}
    </div>
    
    <div class="form-group" style="margin-bottom: 12px;">
      <input type="text" class="ex-name" value="${name}" placeholder="Name der Übung, z.B. Bankdrücken" required autocomplete="off">
    </div>

    <div class="exercise-inputs-row">
      <div class="small-input-group">
        <label>Sätze</label>
        <input type="number" class="ex-sets" value="${sets}" min="1" max="15" required>
      </div>
      <div class="small-input-group">
        <label>Wiederholungen</label>
        <input type="number" class="ex-reps" value="${reps}" min="1" max="100" required>
      </div>
      <div class="small-input-group">
        <label>Pause (Sek.)</label>
        <input type="number" class="ex-rest" value="${rest}" min="0" max="600" required>
      </div>
    </div>
  `;
  container.appendChild(card);
  
  card.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

window.removeExerciseField = function(index) {
  const card = document.getElementById(`creator-ex-card-${index}`);
  if (card) {
    card.remove();
    // Re-index titles for clarity
    document.querySelectorAll('.creator-exercise-card').forEach((c, idx) => {
      c.querySelector('.creator-exercise-title').innerText = `Übung #${idx + 1}`;
    });
  }
};

function editPlan(planId) {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;

  // Set form into edit mode
  document.getElementById('creator-edit-id').value = plan.id;
  document.getElementById('plan-name').value = plan.name;
  document.getElementById('plan-split').value = plan.split || '';
  document.getElementById('btn-save-plan').innerText = 'Änderungen speichern';

  // Fill in exercises
  const container = document.getElementById('creator-exercises-container');
  container.innerHTML = '';
  exerciseFieldIndex = 0;

  plan.exercises.forEach(ex => {
    addExerciseField(ex.name, ex.sets, ex.reps, ex.rest);
  });

  showView('creator', 'Plan bearbeiten');
}

function saveNewPlan() {
  const editId = document.getElementById('creator-edit-id').value;
  const planName = document.getElementById('plan-name').value.trim();
  const planSplit = document.getElementById('plan-split').value.trim();
  
  if (!planName) return;

  const exerciseCards = document.querySelectorAll('.creator-exercise-card');
  const exercises = [];

  let isValid = true;
  exerciseCards.forEach(card => {
    const name = card.querySelector('.ex-name').value.trim();
    const sets = parseInt(card.querySelector('.ex-sets').value);
    const reps = parseInt(card.querySelector('.ex-reps').value);
    const rest = parseInt(card.querySelector('.ex-rest').value);

    if (!name || isNaN(sets) || isNaN(reps) || isNaN(rest)) {
      isValid = false;
      return;
    }

    exercises.push({ name, sets, reps, rest });
  });

  if (!isValid || exercises.length === 0) {
    alert('Bitte alle Felder vollständig ausfüllen.');
    return;
  }

  if (editId) {
    // Edit existing plan
    const planIndex = state.plans.findIndex(p => p.id === editId);
    if (planIndex !== -1) {
      state.plans[planIndex].name = planName;
      state.plans[planIndex].split = planSplit;
      state.plans[planIndex].exercises = exercises;
    }
  } else {
    // Create new plan
    const newPlan = {
      id: `plan-${Date.now()}`,
      name: planName,
      split: planSplit,
      exercises: exercises
    };
    state.plans.push(newPlan);
  }

  saveToLocalStorage();
  resetCreatorForm();
  
  renderHome();
  showView('home', 'Mein Training');
}

// --- WORKOUT TRACKER VIEW ---
let workoutDurationInterval = null;
let workoutSecondsElapsed = 0;

function startWorkout(planId) {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;

  // Initialize Active Workout State
  state.activeWorkout = {
    planId: plan.id,
    planName: plan.name,
    splitName: plan.split || 'Einzelne Pläne',
    startTime: new Date(),
    exercises: plan.exercises.map(ex => {
      const setsData = [];
      let historyWeight = 0;
      let historyReps = ex.reps;

      // Find the most recent workout where this exercise was completed
      const relevantHistory = [...state.history].sort((a, b) => new Date(b.date) - new Date(a.date));
      const pastWorkout = relevantHistory.find(w => w.exercises.some(pe => pe.name.toLowerCase() === ex.name.toLowerCase()));
      
      if (pastWorkout) {
        const pastEx = pastWorkout.exercises.find(pe => pe.name.toLowerCase() === ex.name.toLowerCase());
        const lastSet = pastEx.sets.find(s => s.done);
        if (lastSet) {
          historyWeight = lastSet.weight;
          historyReps = lastSet.reps;
        }
      }

      for (let s = 0; s < ex.sets; s++) {
        setsData.push({
          setNumber: s + 1,
          weight: historyWeight,
          reps: historyReps,
          done: false
        });
      }

      return {
        name: ex.name,
        restTime: ex.rest || 90,
        sets: setsData
      };
    })
  };

  // UI rendering
  renderWorkoutView();

  // Reset & Start Workout Clock
  workoutSecondsElapsed = 0;
  document.getElementById('workout-duration-clock').innerText = "00:00";
  
  if (workoutDurationInterval) clearInterval(workoutDurationInterval);
  workoutDurationInterval = setInterval(() => {
    workoutSecondsElapsed++;
    const mins = Math.floor(workoutSecondsElapsed / 60).toString().padStart(2, '0');
    const secs = (workoutSecondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('workout-duration-clock').innerText = `${mins}:${secs}`;
  }, 1000);

  showView('workout', plan.name);
}

function renderWorkoutView() {
  const container = document.getElementById('workout-exercises-list');
  container.innerHTML = '';

  state.activeWorkout.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = 'workout-exercise-card';
    
    let tableRows = ex.sets.map((set, setIdx) => {
      return `
        <tr class="workout-set-row ${set.done ? 'done' : ''}" id="set-row-${exIdx}-${setIdx}">
          <td>Satz ${set.setNumber}</td>
          <td>
            <input type="number" 
                   class="set-input set-weight" 
                   value="${set.weight || ''}" 
                   placeholder="${set.weight ? '' : '0'}" 
                   step="0.5" 
                   data-ex="${exIdx}" 
                   data-set="${setIdx}"
                   onchange="updateWorkoutSet(this, 'weight')">
            <span style="font-size:12px; color:var(--text-secondary);">kg</span>
          </td>
          <td>
            <input type="number" 
                   class="set-input set-reps" 
                   value="${set.reps}" 
                   data-ex="${exIdx}" 
                   data-set="${setIdx}"
                   onchange="updateWorkoutSet(this, 'reps')">
          </td>
          <td>
            <button class="btn-check-set" data-ex="${exIdx}" data-set="${setIdx}" onclick="toggleSetCheck(this)">
              <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    card.innerHTML = `
      <h3>${ex.name}</h3>
      <table class="workout-sets-table">
        <thead>
          <tr>
            <th style="width: 25%">Satz</th>
            <th style="width: 35%">Gewicht</th>
            <th style="width: 25%">Wdh.</th>
            <th style="width: 15%">Done</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
    container.appendChild(card);
  });
}

window.updateWorkoutSet = function(inputEl, field) {
  const exIdx = parseInt(inputEl.dataset.ex);
  const setIdx = parseInt(inputEl.dataset.set);
  const val = parseFloat(inputEl.value);

  if (state.activeWorkout && !isNaN(val)) {
    state.activeWorkout.exercises[exIdx].sets[setIdx][field] = val;
  }
};

window.toggleSetCheck = function(btnEl) {
  const exIdx = parseInt(btnEl.dataset.ex);
  const setIdx = parseInt(btnEl.dataset.set);
  
  if (!state.activeWorkout) return;

  const setObj = state.activeWorkout.exercises[exIdx].sets[setIdx];
  const rowEl = document.getElementById(`set-row-${exIdx}-${setIdx}`);
  
  const weightInput = rowEl.querySelector('.set-weight');
  if (!weightInput.value) {
    weightInput.value = "0";
    setObj.weight = 0;
  }

  setObj.done = !setObj.done;

  if (setObj.done) {
    rowEl.classList.add('done');
    setObj.weight = parseFloat(weightInput.value);
    setObj.reps = parseInt(rowEl.querySelector('.set-reps').value);

    // Trigger Rest Timer
    const exObj = state.activeWorkout.exercises[exIdx];
    if (exObj.restTime > 0) {
      triggerRestTimer(exObj.name, `Satz ${setObj.setNumber} abgeschlossen`, exObj.restTime);
    }
  } else {
    rowEl.classList.remove('done');
  }
};

function cancelWorkout() {
  if (confirm('Möchtest du das aktuelle Training wirklich abbrechen? Deine Daten werden nicht gespeichert.')) {
    if (workoutDurationInterval) clearInterval(workoutDurationInterval);
    state.activeWorkout = null;
    renderHome();
    showView('home', 'Mein Training');
  }
}

function finishWorkout() {
  if (!state.activeWorkout) return;

  let totalSetsLogged = 0;
  state.activeWorkout.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if (set.done) totalSetsLogged++;
    });
  });

  if (totalSetsLogged === 0) {
    alert('Bitte logge mindestens einen abgeschlossenen Satz, um das Training zu beenden!');
    return;
  }

  if (workoutDurationInterval) clearInterval(workoutDurationInterval);

  const newWorkoutRecord = {
    id: `workout-record-${Date.now()}`,
    planId: state.activeWorkout.planId,
    planName: state.activeWorkout.planName,
    splitName: state.activeWorkout.splitName,
    date: new Date().toISOString(),
    durationMinutes: Math.max(1, Math.round(workoutSecondsElapsed / 60)),
    exercises: state.activeWorkout.exercises.map(ex => {
      return {
        name: ex.name,
        sets: ex.sets.filter(s => s.done)
      };
    }).filter(ex => ex.sets.length > 0)
  };

  state.history.push(newWorkoutRecord);
  saveToLocalStorage();

  state.activeWorkout = null;
  
  alert('Hervorragend! Dein Training wurde erfolgreich eingetragen. 💪');
  renderHome();
  showView('home', 'Mein Training');
}

// --- STOPWATCH (REST TIMER) MODULE ---
function triggerRestTimer(exerciseName, setInfo, seconds) {
  state.timer.exerciseName = exerciseName;
  state.timer.setInfo = setInfo;
  state.timer.totalSeconds = seconds;
  state.timer.secondsLeft = seconds;
  
  document.getElementById('timer-exercise-name').innerText = exerciseName;
  document.getElementById('timer-set-info').innerText = setInfo;
  
  updateTimerUI();

  document.getElementById('timer-backdrop').classList.add('active');
  document.getElementById('timer-sheet').classList.add('active');
  
  startTimerCountdown();
}

function startTimerCountdown() {
  if (state.timer.intervalId) clearInterval(state.timer.intervalId);
  
  state.timer.isRunning = true;
  toggleTimerPlayPauseUI(true);

  let startTimestamp = Date.now();
  let initialSecondsLeft = state.timer.secondsLeft;

  state.timer.intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    state.timer.secondsLeft = Math.max(0, initialSecondsLeft - elapsed);

    updateTimerUI();

    if (state.timer.secondsLeft <= 0) {
      handleTimerExpiration();
    }
  }, 100);
}

function pauseTimerCountdown() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  state.timer.isRunning = false;
  toggleTimerPlayPauseUI(false);
}

function updateTimerUI() {
  const min = Math.floor(state.timer.secondsLeft / 60);
  const sec = state.timer.secondsLeft % 60;
  
  document.getElementById('timer-countdown').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  const circleProgress = document.getElementById('timer-ring-progress');
  const dashArrayMax = 596.9;
  
  const percentage = state.timer.secondsLeft / state.timer.totalSeconds;
  const strokeOffset = dashArrayMax - (percentage * dashArrayMax);
  
  circleProgress.style.strokeDashoffset = isNaN(strokeOffset) ? 0 : strokeOffset;
}

function toggleTimerPlayPauseUI(isRunning) {
  const btn = document.getElementById('btn-timer-toggle');
  const playIcon = btn.querySelector('.icon-play');
  const pauseIcon = btn.querySelector('.icon-pause');
  
  if (isRunning) {
    btn.className = "btn-timer-main pause";
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    btn.className = "btn-timer-main";
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
}

function adjustTimerSeconds(amount) {
  state.timer.secondsLeft = Math.max(5, state.timer.secondsLeft + amount);
  if (state.timer.secondsLeft > state.timer.totalSeconds) {
    state.timer.totalSeconds = state.timer.secondsLeft;
  }
  updateTimerUI();

  if (state.timer.isRunning) {
    startTimerCountdown();
  }
}

function handleTimerExpiration() {
  pauseTimerCountdown();
  
  // Play soft tone ONLY if sound is enabled in Settings!
  if (state.settings.soundEnabled) {
    const audio = document.getElementById('audio-timer-alert');
    if (audio) {
      audio.play().catch(e => console.log('Audio playback prevented by browser: ', e));
    }
  }

  // Trigger vibration
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }

  document.getElementById('timer-countdown').innerText = "Fertig!";
  setTimeout(closeTimerSheet, 1200);
}

function closeTimerSheet() {
  pauseTimerCountdown();
  document.getElementById('timer-backdrop').classList.remove('active');
  document.getElementById('timer-sheet').classList.remove('active');
}

// --- OPTIONS / SETTINGS VIEW CONTROLLER ---
function renderSettingsView() {
  // Sound Toggle
  document.getElementById('toggle-sound').checked = state.settings.soundEnabled;

  // Weight Logs Mini Table
  const listContainer = document.getElementById('weight-history-list');
  const title = document.getElementById('weight-logs-title');
  listContainer.innerHTML = '';

  if (state.weightHistory.length === 0) {
    title.classList.add('hidden');
    listContainer.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-secondary); font-size:14px;">Noch kein Gewicht eingetragen</div>`;
  } else {
    title.classList.remove('hidden');
    // Show last 4 records
    const sortedWeights = [...state.weightHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    
    sortedWeights.forEach(log => {
      const d = new Date(log.date);
      const dStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      const row = document.createElement('div');
      row.className = 'weight-log-item';
      row.innerHTML = `
        <span class="weight-log-date">${dStr}</span>
        <span class="weight-log-val">${log.weight} kg</span>
      `;
      listContainer.appendChild(row);
    });
  }
}

function logBodyWeight() {
  const input = document.getElementById('input-body-weight');
  const weight = parseFloat(input.value);

  if (isNaN(weight) || weight <= 0) {
    alert('Bitte ein gültiges Körpergewicht eingeben.');
    return;
  }

  state.weightHistory.push({
    date: new Date().toISOString(),
    weight: weight
  });

  saveToLocalStorage();
  input.value = '';
  renderSettingsView();
  alert('Gewicht erfolgreich eingetragen! ⚖️');
}

function exportToCSV() {
  if (state.history.length === 0) {
    alert('Keine Trainingsdaten zum Exportieren vorhanden.');
    return;
  }

  // Define columns
  let csvContent = "Datum,Trainings-Programm (Split),Plan-Name,Uebung,Satz,Gewicht_kg,Wiederholungen\n";

  // Sort history chronologically
  const sortedHistory = [...state.history].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedHistory.forEach(workout => {
    const date = new Date(workout.date).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const splitName = workout.splitName || "Einzelne Pläne";
    const planName = workout.planName;

    workout.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        // Escaping comma values in string names
        const cleanSplit = splitName.replace(/"/g, '""');
        const cleanPlan = planName.replace(/"/g, '""');
        const cleanEx = ex.name.replace(/"/g, '""');

        csvContent += `"${date}","${cleanSplit}","${cleanPlan}","${cleanEx}",${set.setNumber},${set.weight},${set.reps}\n`;
      });
    });
  });

  // Create Blob and trigger direct browser download
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF is UTF-8 BOM so Excel opens German letters cleanly
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", `FitTracker_Rohdaten_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadDeveloperMockData() {
  if (confirm('Möchtest du wirklich professionelle Beispieldaten für Pläne, Trainingsverlauf und Körpergewicht laden? Deine aktuellen Daten bleiben dabei erhalten oder werden ergänzt.')) {
    // Overwrite/merge plans
    MOCK_PLANS.forEach(mockP => {
      if (!state.plans.some(p => p.name.toLowerCase() === mockP.name.toLowerCase())) {
        state.plans.push(mockP);
      }
    });

    // Merge mock history
    const mockHist = generateMockHistory();
    state.history = [...state.history, ...mockHist];

    // Merge mock weight history
    const mockWeight = generateMockWeightHistory();
    state.weightHistory = [...state.weightHistory, ...mockWeight];

    saveToLocalStorage();
    alert('Beispieldaten erfolgreich geladen! Gehe in die Statistiken, um die fertigen Diagramme anzusehen! 📊');
    
    // Refresh & redirect to stats to show off
    renderHome();
    showView('stats', 'Statistiken');
  }
}

function resetApp() {
  if (confirm('ACHTUNG: Möchtest du die App wirklich vollständig zurücksetzen? Alle Trainingspläne, deine Gewichtslogs und deine Trainingshistorie werden unwiderruflich gelöscht!')) {
    if (confirm('Möchtest du wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      localStorage.clear();
      state.plans = [];
      state.history = [];
      state.weightHistory = [];
      state.settings = { soundEnabled: true };
      state.activeWorkout = null;
      
      alert('Die App wurde vollständig zurückgesetzt.');
      location.reload();
    }
  }
}

// --- STATISTICS ENGINE & CHARTING ---
let chartOverallInstance = null;
let chartPlanInstance = null;
let chartExerciseInstance = null;
let chartWeightInstance = null;

function initStatsView() {
  // Populate Plan Selector
  const planSelect = document.getElementById('filter-plan-select');
  planSelect.innerHTML = '';
  state.plans.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = p.name;
    planSelect.appendChild(opt);
  });

  // Populate Exercise Selector
  const exerciseSelect = document.getElementById('filter-exercise-select');
  exerciseSelect.innerHTML = '';
  
  const uniqueExercises = new Set();
  state.history.forEach(w => {
    w.exercises.forEach(ex => {
      uniqueExercises.add(ex.name);
    });
  });

  if (uniqueExercises.size === 0) {
    const opt = document.createElement('option');
    opt.innerText = "Keine Übungsdaten vorhanden";
    exerciseSelect.appendChild(opt);
  } else {
    [...uniqueExercises].sort().forEach(exName => {
      const opt = document.createElement('option');
      opt.value = exName;
      opt.innerText = exName;
      exerciseSelect.appendChild(opt);
    });
  }

  updateActiveSegmentStats();
}

function updateActiveSegmentStats() {
  const activeSegmentBtn = document.querySelector('.segment-btn.active');
  const segment = activeSegmentBtn.dataset.segment;
  const timeRange = document.getElementById('filter-time-range').value;

  const filteredHistory = filterHistoryByTimeRange(timeRange);

  document.querySelectorAll('.stats-segment-content').forEach(el => {
    el.classList.remove('active');
  });
  document.getElementById(`stats-segment-${segment}s`).classList.add('active');

  if (segment === 'overall') {
    renderOverallStats(filteredHistory);
    renderWeightProgressionStats(timeRange);
  } else if (segment === 'plan') {
    renderPlanStats(filteredHistory);
  } else if (segment === 'exercise') {
    renderExerciseStats(filteredHistory);
  }
}

function filterHistoryByTimeRange(daysStr) {
  if (daysStr === 'all') return [...state.history].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const days = parseInt(daysStr);
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() - days);

  return state.history
    .filter(w => new Date(w.date) >= threshold)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderOverallStats(filteredHistory) {
  const workoutsCount = filteredHistory.length;
  let totalVolume = 0;
  let totalDuration = 0;
  let totalSets = 0;

  filteredHistory.forEach(w => {
    totalDuration += w.durationMinutes;
    w.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.done) {
          totalVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
          totalSets++;
        }
      });
    });
  });

  document.getElementById('stats-count').innerText = workoutsCount;
  document.getElementById('stats-volume').innerText = `${totalVolume.toLocaleString()} kg`;
  document.getElementById('stats-duration').innerText = `${totalDuration} Min`;
  document.getElementById('stats-sets').innerText = totalSets;

  const ctx = document.getElementById('chart-overall').getContext('2d');
  if (chartOverallInstance) chartOverallInstance.destroy();

  if (workoutsCount === 0) return;

  const labels = filteredHistory.map(w => {
    const d = new Date(w.date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  });

  const volumePerWorkout = filteredHistory.map(w => {
    let vol = 0;
    w.exercises.forEach(ex => ex.sets.forEach(s => vol += s.weight * s.reps));
    return vol;
  });

  chartOverallInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Workout-Volumen (kg)',
        data: volumePerWorkout,
        backgroundColor: 'rgba(10, 132, 255, 0.4)',
        borderColor: '#0a84ff',
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        }
      }
    }
  });
}

function renderWeightProgressionStats(timeRangeStr) {
  const container = document.getElementById('chart-body-weight-container');
  const ctx = document.getElementById('chart-body-weight').getContext('2d');

  if (chartWeightInstance) chartWeightInstance.destroy();

  // Filter weight records
  let filteredWeight = [...state.weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (timeRangeStr !== 'all') {
    const days = parseInt(timeRangeStr);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    filteredWeight = filteredWeight.filter(w => new Date(w.date) >= threshold);
  }

  if (filteredWeight.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  const labels = filteredWeight.map(w => {
    const d = new Date(w.date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  });

  const weights = filteredWeight.map(w => w.weight);

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(10, 132, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(10, 132, 255, 0.0)');

  chartWeightInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Körpergewicht (kg)',
        data: weights,
        borderColor: '#0a84ff',
        borderWidth: 3,
        pointBackgroundColor: '#0a84ff',
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        backgroundColor: gradient
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        }
      }
    }
  });
}

function renderPlanStats(filteredHistory) {
  const planSelect = document.getElementById('filter-plan-select');
  const planId = planSelect.value;

  if (!planId) return;

  const planHistory = filteredHistory.filter(w => w.planId === planId);
  const workoutCount = planHistory.length;

  let totalVolume = 0;
  planHistory.forEach(w => {
    w.exercises.forEach(ex => ex.sets.forEach(s => totalVolume += s.weight * s.reps));
  });

  const avgVolume = workoutCount > 0 ? Math.round(totalVolume / workoutCount) : 0;

  document.getElementById('plan-stats-count').innerText = workoutCount;
  document.getElementById('plan-stats-volume').innerText = `${avgVolume.toLocaleString()} kg`;

  const ctx = document.getElementById('chart-plan-volume').getContext('2d');
  if (chartPlanInstance) chartPlanInstance.destroy();

  if (workoutCount === 0) return;

  const labels = planHistory.map(w => {
    const d = new Date(w.date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  });

  const volumes = planHistory.map(w => {
    let vol = 0;
    w.exercises.forEach(ex => ex.sets.forEach(s => vol += s.weight * s.reps));
    return vol;
  });

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(48, 209, 88, 0.3)');
  gradient.addColorStop(1, 'rgba(48, 209, 88, 0.0)');

  chartPlanInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Gesamtvolumen',
        data: volumes,
        borderColor: '#30d158',
        borderWidth: 3,
        pointBackgroundColor: '#30d158',
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        backgroundColor: gradient
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        }
      }
    }
  });
}

function renderExerciseStats(filteredHistory) {
  const exSelect = document.getElementById('filter-exercise-select');
  const exName = exSelect.value;

  if (!exName) return;

  const exerciseData = [];
  
  filteredHistory.forEach(w => {
    const matchingEx = w.exercises.find(ex => ex.name.toLowerCase() === exName.toLowerCase());
    if (matchingEx && matchingEx.sets.length > 0) {
      const maxWeight = Math.max(...matchingEx.sets.map(s => s.weight));
      let vol = 0;
      matchingEx.sets.forEach(s => vol += s.weight * s.reps);

      exerciseData.push({
        date: new Date(w.date),
        maxWeight: maxWeight,
        volume: vol
      });
    }
  });

  if (exerciseData.length === 0) {
    document.getElementById('exercise-stats-max').innerText = '0 kg';
    document.getElementById('exercise-stats-volume').innerText = '0 kg';
    if (chartExerciseInstance) chartExerciseInstance.destroy();
    return;
  }

  const maxEver = Math.max(...exerciseData.map(d => d.maxWeight));
  let totalExVol = 0;
  exerciseData.forEach(d => totalExVol += d.volume);

  document.getElementById('exercise-stats-max').innerText = `${maxEver} kg`;
  document.getElementById('exercise-stats-volume').innerText = `${totalExVol.toLocaleString()} kg`;

  const ctx = document.getElementById('chart-exercise-progress').getContext('2d');
  if (chartExerciseInstance) chartExerciseInstance.destroy();

  const labels = exerciseData.map(d => {
    return d.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  });

  const weights = exerciseData.map(d => d.maxWeight);

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(10, 132, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(10, 132, 255, 0.0)');

  chartExerciseInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Maximalgewicht (kg)',
        data: weights,
        borderColor: '#0a84ff',
        borderWidth: 3,
        pointBackgroundColor: '#0a84ff',
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        backgroundColor: gradient
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8e8e93', font: { family: 'Outfit' } }
        }
      }
    }
  });
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
  // Tab Bar Switching
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab === 'home') {
        showView('home', 'Mein Training');
      } else if (tab === 'stats') {
        showView('stats', 'Statistiken');
      } else if (tab === 'settings') {
        showView('settings', 'Optionen');
      }
    });
  });

  // Home navigation button
  document.getElementById('btn-to-creator').onclick = () => {
    resetCreatorForm();
    showView('creator', 'Neuer Plan');
  };

  // Creator View actions
  document.getElementById('btn-add-exercise').onclick = () => addExerciseField();
  document.getElementById('btn-cancel-creator').onclick = () => {
    resetCreatorForm();
    showView('home', 'Mein Training');
  };
  document.getElementById('creator-form').onsubmit = saveNewPlan;

  // Active Workout View actions
  document.getElementById('btn-cancel-workout').onclick = cancelWorkout;
  document.getElementById('btn-finish-workout').onclick = finishWorkout;

  // Rest Timer adjust & skip buttons
  document.getElementById('btn-timer-toggle').onclick = () => {
    if (state.timer.isRunning) {
      pauseTimerCountdown();
    } else {
      startTimerCountdown();
    }
  };
  
  document.getElementById('btn-timer-sub15').onclick = () => adjustTimerSeconds(-15);
  document.getElementById('btn-timer-add15').onclick = () => adjustTimerSeconds(15);
  document.getElementById('btn-timer-skip').onclick = closeTimerSheet;
  document.getElementById('timer-backdrop').onclick = closeTimerSheet;

  // Stats filters
  document.getElementById('filter-time-range').onchange = updateActiveSegmentStats;
  document.getElementById('filter-plan-select').onchange = updateActiveSegmentStats;
  document.getElementById('filter-exercise-select').onchange = updateActiveSegmentStats;

  // Segment Buttons Switcher
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      updateActiveSegmentStats();
    };
  });

  // Settings Actions
  document.getElementById('btn-save-weight').onclick = logBodyWeight;
  document.getElementById('btn-export-csv').onclick = exportToCSV;
  document.getElementById('btn-load-mockdata').onclick = loadDeveloperMockData;
  document.getElementById('btn-reset-app').onclick = resetApp;

  // Sound toggle event
  document.getElementById('toggle-sound').onchange = (e) => {
    state.settings.soundEnabled = e.target.checked;
    saveToLocalStorage();
  };
}

// --- INITIALIZATION ---
window.onload = () => {
  loadFromLocalStorage();

  // Pre-populate creator input structures
  setupCreatorView();

  // Setup dynamic listeners
  setupEventListeners();

  // Render first screen
  renderHome();
  showView('home', 'Mein Training');
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('Service Worker registration skipped: ', err);
    });
  }
};
