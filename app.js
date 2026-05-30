/**
 * FitTracker - Application Logic
 * iOS-inspired, premium performance training logger and statistics suite
 */

// --- APPLICATION STATE ---
const state = {
  plans: [],
  history: [],
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

// --- MOCK DATA FOR PREMIUM FIRST-TIME EXPERIENCE ---
const MOCK_PLANS = [
  {
    id: "plan-push",
    name: "Montag - Push (Brust, Trizeps, Schultern)",
    exercises: [
      { name: "Bankdrücken (Langhantel)", sets: 4, reps: 8, rest: 120 },
      { name: "Schrägbankdrücken (Kurzhantel)", sets: 3, reps: 10, rest: 90 },
      { name: "Schulterdrücken (Kurzhantel)", sets: 3, reps: 10, rest: 90 },
      { name: "Trizepsdrücken (Kabel)", sets: 3, reps: 12, rest: 60 }
    ]
  },
  {
    id: "plan-pull",
    name: "Donnerstag - Pull (Rücken, Bizeps)",
    exercises: [
      { name: "Kreuzheben", sets: 3, reps: 5, rest: 180 },
      { name: "Klimmzüge", sets: 4, reps: 8, rest: 90 },
      { name: "Langhantelrudern", sets: 3, reps: 10, rest: 90 },
      { name: "Hammer Curls", sets: 3, reps: 12, rest: 60 }
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
      planName: plan.name.split(" - ")[1] || plan.name,
      date: workoutDate.toISOString(),
      durationMinutes: 45 + Math.floor(Math.random() * 15),
      exercises: workoutExercises
    });
  }

  return history;
}

// --- LOCAL STORAGE HANDLING ---
function saveToLocalStorage() {
  localStorage.setItem('fittracker_plans', JSON.stringify(state.plans));
  localStorage.setItem('fittracker_history', JSON.stringify(state.history));
}

function loadFromLocalStorage() {
  const plansStr = localStorage.getItem('fittracker_plans');
  const histStr = localStorage.getItem('fittracker_history');
  
  if (plansStr) state.plans = JSON.parse(plansStr);
  if (histStr) state.history = JSON.parse(histStr);
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
    actionBtn.onclick = () => showView('home', 'Mein Training');
  } else {
    actionBtn.classList.add('hidden');
  }

  // Update Bottom Tab Bar highlight
  document.querySelectorAll('.tab-item').forEach(item => {
    if (item.dataset.tab === viewId || (viewId === 'home' && item.dataset.tab === 'home')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Re-draw charts or populate selectors when entering Stats View
  if (viewId === 'stats') {
    initStatsView();
  }
}

// --- HOME VIEW CONTROLLER ---
function renderHome() {
  const plansList = document.getElementById('plans-list');
  const recentList = document.getElementById('recent-workouts-list');
  const recentHeader = document.querySelector('.recent-workouts-header');
  
  // Render Plans
  if (state.plans.length === 0) {
    plansList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💪</div>
        <h3>Keine Trainingspläne</h3>
        <p>Erstelle deinen ersten Trainingsplan, um loszulegen!</p>
        <button id="btn-empty-create" class="btn-primary-pill">+ Trainingsplan erstellen</button>
      </div>
    `;
    document.getElementById('btn-empty-create').onclick = () => showView('creator', 'Neuer Plan');
  } else {
    plansList.innerHTML = '';
    state.plans.forEach(plan => {
      const card = document.createElement('div');
      card.className = 'plan-card';
      
      const exercisesHTML = plan.exercises.map(ex => 
        `<span class="exercise-tag">${ex.name} (${ex.sets}x${ex.reps})</span>`
      ).join('');

      card.innerHTML = `
        <div class="plan-card-header">
          <h3>${plan.name}</h3>
        </div>
        <div class="plan-card-meta">${plan.exercises.length} Übungen &bull; Default Rest: 90s</div>
        <div class="plan-card-exercises">
          ${exercisesHTML}
        </div>
        <div class="plan-card-actions">
          <button class="btn-delete-plan" data-id="${plan.id}">Löschen</button>
          <button class="btn-start-plan" data-id="${plan.id}">Starten</button>
        </div>
      `;
      plansList.appendChild(card);
    });

    // Wire up start & delete buttons
    document.querySelectorAll('.btn-start-plan').forEach(btn => {
      btn.onclick = (e) => startWorkout(e.target.dataset.id);
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
      
      // Calculate total weight lifted in this workout
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

  // Update Summary Dashboard Widgets
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

  // Calculate workouts in last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const weeklyWorkouts = state.history.filter(w => new Date(w.date) >= sevenDaysAgo);
  weeklyCountBadge.innerText = `${weeklyWorkouts.length} Workout${weeklyWorkouts.length === 1 ? '' : 's'}`;

  // Volume & Duration (overall averages)
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

// --- CREATOR VIEW CONTROLLER ---
let exerciseFieldIndex = 0;

function setupCreatorView() {
  const container = document.getElementById('creator-exercises-container');
  container.innerHTML = '';
  exerciseFieldIndex = 0;
  
  // Start with 1 default exercise field
  addExerciseField();
}

function addExerciseField() {
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
      <input type="text" class="ex-name" placeholder="Name der Übung, z.B. Bankdrücken" required autocomplete="off">
    </div>

    <div class="exercise-inputs-row">
      <div class="small-input-group">
        <label>Sätze</label>
        <input type="number" class="ex-sets" value="3" min="1" max="15" required>
      </div>
      <div class="small-input-group">
        <label>Wiederholungen</label>
        <input type="number" class="ex-reps" value="10" min="1" max="100" required>
      </div>
      <div class="small-input-group">
        <label>Pause (Sek.)</label>
        <input type="number" class="ex-rest" value="90" min="0" max="600" required>
      </div>
    </div>
  `;
  container.appendChild(card);
  
  // Smooth scroll to the newly added field
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

function saveNewPlan() {
  const nameInput = document.getElementById('plan-name');
  const planName = nameInput.value.trim();
  
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

  const newPlan = {
    id: `plan-${Date.now()}`,
    name: planName,
    exercises: exercises
  };

  state.plans.push(newPlan);
  saveToLocalStorage();
  
  // Reset Form
  nameInput.value = '';
  setupCreatorView();
  
  // Go back to home
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
    planName: plan.name.split(" - ")[1] || plan.name,
    startTime: new Date(),
    exercises: plan.exercises.map(ex => {
      const setsData = [];
      // Grab historical weights for this exercise to pre-populate and wow the user!
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
          weight: historyWeight, // Prefill with history or 0
          reps: historyReps,     // Prefill with target reps or history
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

  // Switch View
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
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
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
  
  // If weight input is empty, prefill with default or prompt visual error
  const weightInput = rowEl.querySelector('.set-weight');
  if (!weightInput.value) {
    weightInput.value = "0";
    setObj.weight = 0;
  }

  setObj.done = !setObj.done;

  if (setObj.done) {
    rowEl.classList.add('done');
    // Save to active local state
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

  // Validate if at least one set is completed
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

  // Compile final history item
  const newWorkoutRecord = {
    id: `workout-record-${Date.now()}`,
    planId: state.activeWorkout.planId,
    planName: state.activeWorkout.planName,
    date: new Date().toISOString(),
    durationMinutes: Math.max(1, Math.round(workoutSecondsElapsed / 60)),
    exercises: state.activeWorkout.exercises.map(ex => {
      return {
        name: ex.name,
        sets: ex.sets.filter(s => s.done) // only save completed sets
      };
    }).filter(ex => ex.sets.length > 0) // only save exercises with completed sets
  };

  state.history.push(newWorkoutRecord);
  saveToLocalStorage();

  state.activeWorkout = null;
  
  // Transition
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
  
  // Update UI Elements
  document.getElementById('timer-exercise-name').innerText = exerciseName;
  document.getElementById('timer-set-info').innerText = setInfo;
  
  updateTimerUI();

  // Slide Sheet Up
  document.getElementById('timer-backdrop').classList.add('active');
  document.getElementById('timer-sheet').classList.add('active');
  
  // Start Countdowns
  startTimerCountdown();
}

function startTimerCountdown() {
  if (state.timer.intervalId) clearInterval(state.timer.intervalId);
  
  state.timer.isRunning = true;
  toggleTimerPlayPauseUI(true);

  // Time tracking variables for solid precision
  let startTimestamp = Date.now();
  let initialSecondsLeft = state.timer.secondsLeft;

  state.timer.intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    state.timer.secondsLeft = Math.max(0, initialSecondsLeft - elapsed);

    updateTimerUI();

    if (state.timer.secondsLeft <= 0) {
      handleTimerExpiration();
    }
  }, 100); // Poll frequently for smooth ticking
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

  // Update Visual Progress Ring
  const circleProgress = document.getElementById('timer-ring-progress');
  const dashArrayMax = 596.9; // 2 * PI * r (r=95) -> ~596.9
  
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
  // Re-adjust total if we added beyond bounds
  if (state.timer.secondsLeft > state.timer.totalSeconds) {
    state.timer.totalSeconds = state.timer.secondsLeft;
  }
  updateTimerUI();

  // If timer is running, restart countdown interval to sync with real elapsed time
  if (state.timer.isRunning) {
    startTimerCountdown();
  }
}

function handleTimerExpiration() {
  pauseTimerCountdown();
  
  // Play soft tone
  const audio = document.getElementById('audio-timer-alert');
  if (audio) {
    audio.play().catch(e => console.log('Audio playback prevented by browser auto-play policy: ', e));
  }

  // Trigger haptic vibration (supported on mobile browser PWAs!)
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }

  // Visual notify
  document.getElementById('timer-countdown').innerText = "Fertig!";
  setTimeout(closeTimerSheet, 1200);
}

function closeTimerSheet() {
  pauseTimerCountdown();
  document.getElementById('timer-backdrop').classList.remove('active');
  document.getElementById('timer-sheet').classList.remove('active');
}

// --- STATISTICS ENGINE & CHARTING ---
let chartOverallInstance = null;
let chartPlanInstance = null;
let chartExerciseInstance = null;

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

  // Populate Exercise Selector with all unique exercises in history
  const exerciseSelect = document.getElementById('filter-exercise-select');
  exerciseSelect.innerHTML = '';
  
  const uniqueExercises = new Set();
  state.history.forEach(w => {
    w.exercises.forEach(ex => {
      uniqueExercises.add(ex.name);
    });
  });

  if (uniqueExercises.size === 0) {
    // Fallback if empty history
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

  // Load appropriate segments
  updateActiveSegmentStats();
}

function updateActiveSegmentStats() {
  const activeSegmentBtn = document.querySelector('.segment-btn.active');
  const segment = activeSegmentBtn.dataset.segment;
  const timeRange = document.getElementById('filter-time-range').value;

  // Filter history based on time range
  const filteredHistory = filterHistoryByTimeRange(timeRange);

  // Hide all segment content divs, show active
  document.querySelectorAll('.stats-segment-content').forEach(el => {
    el.classList.remove('active');
  });
  document.getElementById(`stats-segment-${segment}s`).classList.add('active');

  if (segment === 'overall') {
    renderOverallStats(filteredHistory);
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
  // Aggregate
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

  // Chart Rendering - Over Time Volume Bar Chart
  const ctx = document.getElementById('chart-overall').getContext('2d');
  
  if (chartOverallInstance) chartOverallInstance.destroy();

  if (workoutsCount === 0) {
    return; // Leave empty if no data
  }

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
      plugins: {
        legend: { display: false }
      },
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

  // Filter history to just this plan
  const planHistory = filteredHistory.filter(w => w.planId === planId);
  const workoutCount = planHistory.length;

  let totalVolume = 0;
  planHistory.forEach(w => {
    w.exercises.forEach(ex => ex.sets.forEach(s => totalVolume += s.weight * s.reps));
  });

  const avgVolume = workoutCount > 0 ? Math.round(totalVolume / workoutCount) : 0;

  document.getElementById('plan-stats-count').innerText = workoutCount;
  document.getElementById('plan-stats-volume').innerText = `${avgVolume.toLocaleString()} kg`;

  // Draw Line Chart showing Volume Progression
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

  // Create iOS blue-green gradient for premium touch
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
        tension: 0.35, // sleek curves
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

  // Filter history records containing this exercise
  const exerciseData = [];
  
  filteredHistory.forEach(w => {
    const matchingEx = w.exercises.find(ex => ex.name.toLowerCase() === exName.toLowerCase());
    if (matchingEx && matchingEx.sets.length > 0) {
      // Find max weight
      const maxWeight = Math.max(...matchingEx.sets.map(s => s.weight));
      // Calculate total volume for this exercise
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

  // Metrics
  const maxEver = Math.max(...exerciseData.map(d => d.maxWeight));
  let totalExVol = 0;
  exerciseData.forEach(d => totalExVol += d.volume);

  document.getElementById('exercise-stats-max').innerText = `${maxEver} kg`;
  document.getElementById('exercise-stats-volume').innerText = `${totalExVol.toLocaleString()} kg`;

  // Draw chart
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
        renderHome();
        showView('home', 'Mein Training');
      } else if (tab === 'stats') {
        showView('stats', 'Statistiken');
      }
    });
  });

  // Home view navigation buttons
  document.getElementById('btn-to-creator').onclick = () => {
    setupCreatorView();
    showView('creator', 'Neuer Plan');
  };

  // Creator View actions
  document.getElementById('btn-add-exercise').onclick = addExerciseField;
  document.getElementById('btn-cancel-creator').onclick = () => {
    renderHome();
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

  // Stats filter updates
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
}

// --- INITIALIZATION ---
window.onload = () => {
  loadFromLocalStorage();

  // Populate mock data if nothing exists yet
  if (state.plans.length === 0) {
    state.plans = [...MOCK_PLANS];
    state.history = generateMockHistory();
    saveToLocalStorage();
  }

  // Pre-populate creator input structures
  setupCreatorView();

  // Setup dynamic listeners
  setupEventListeners();

  // Render first screen
  renderHome();
  showView('home', 'Mein Training');
  
  // Register service worker if possible
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('Service Worker registration skipped: ', err);
    });
  }
};
