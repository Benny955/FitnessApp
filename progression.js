/**
 * IRONPROGRESS v2 - Progression Service & Engine
 * Modular, scientifically-backed progression advisor for strength training.
 * Implements a double-progression logic using linear regression volume trends.
 */

const EXERCISE_PROFILES = {
  compound: {
    trend_window: 3,
    volume_damping_factor: 0.30,
    max_jump_percent: 0.05,
    min_target_completion: 0.66,
    progression_cooldown_sessions: 2
  },
  machine_compound: {
    trend_window: 3,
    volume_damping_factor: 0.40,
    max_jump_percent: 0.10,
    min_target_completion: 0.66,
    progression_cooldown_sessions: 2
  },
  isolation: {
    trend_window: 3,
    volume_damping_factor: 0.25,
    max_jump_percent: 0.10,
    min_target_completion: 0.66,
    progression_cooldown_sessions: 2
  },
  small_isolation: {
    trend_window: 3,
    volume_damping_factor: 0.15,
    max_jump_percent: 0.15,
    min_target_completion: 0.75,
    progression_cooldown_sessions: 2
  },
  bodyweight: {
    trend_window: 3,
    volume_damping_factor: 0.20,
    max_jump_percent: 0.10,
    min_target_completion: 0.66,
    progression_cooldown_sessions: 2
  },
  assisted_bodyweight: {
    trend_window: 3,
    volume_damping_factor: 0.20,
    max_jump_percent: 0.10,
    min_target_completion: 0.66,
    progression_cooldown_sessions: 2
  }
};

class ProgressionService {
  /**
   * Returns standard profile metrics based on exercise type
   */
  static getProfileDefaults(type) {
    return EXERCISE_PROFILES[type] || EXERCISE_PROFILES.compound;
  }

  /**
   * Performs a double-progression analysis on a specific exercise
   * @param {string} exerciseName Name of the exercise
   * @param {Array} history Completed workouts history list
   * @param {Object} planExercise Exercise configuration from the training plan
   */
  static analyze(exerciseName, history, planExercise, globalAvailableWeights = []) {
    if (!planExercise) {
      return {
        exerciseName,
        status: "invalid_data",
        reason: "Fehlendes Übungsprofil in den Plandaten.",
        userMessage: `${exerciseName}: Fehlerhaftes Übungsprofil.`
      };
    }

    // Merge plan configuration with defaults
    const type = planExercise.exercise_type || "compound";
    const defaults = this.getProfileDefaults(type);
    
    const profile = {
      exercise_type: type,
      target_rep_min: parseInt(planExercise.target_rep_min) || 8,
      target_rep_max: parseInt(planExercise.target_rep_max) || 12,
      available_weights: planExercise.available_weights || [],
      trend_window: parseInt(planExercise.trend_window) || defaults.trend_window,
      volume_damping_factor: parseFloat(planExercise.volume_damping_factor) || defaults.volume_damping_factor,
      max_jump_percent: parseFloat(planExercise.max_jump_percent) || defaults.max_jump_percent,
      min_target_completion: parseFloat(planExercise.min_target_completion) || defaults.min_target_completion,
      progression_cooldown_sessions: parseInt(planExercise.progression_cooldown_sessions) || defaults.progression_cooldown_sessions
    };

    // 1. Gather all historical sessions of this exercise (chronologically sorted)
    const sessions = history
      .filter(w => w.exercises && w.exercises.some(e => e.name.toLowerCase() === exerciseName.toLowerCase()))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sessions.length === 0) {
      return {
        exerciseName,
        status: "insufficient_data",
        reason: "Noch keine Trainingseinheiten für diese Übung absolviert.",
        userMessage: `${exerciseName}: Keine Daten vorhanden. Absolviere zuerst dein erstes Training!`,
        profile
      };
    }

    // Map sessions to simplified metrics
    const sessionData = sessions.map(w => {
      const ex = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
      // Filter out warm-up sets (marked as weight = 0 or done = false)
      const workSets = ex.sets.filter(s => s.done && s.weight > 0);
      
      // session_volume: sum of weight * reps for all work sets
      const volume = workSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      
      // current weight is the highest weight used in work sets
      const maxWeight = workSets.reduce((max, s) => s.weight > max ? s.weight : max, 0);

      // target completion: count sets matching target_rep_max
      const completedMaxReps = workSets.filter(s => s.reps >= profile.target_rep_max).length;
      const targetCompletion = workSets.length > 0 ? (completedMaxReps / workSets.length) : 0;

      return {
        date: w.date,
        volume,
        maxWeight,
        targetCompletion,
        avgRestSeconds: w.avgRestSeconds || planExercise.rest || 90
      };
    });

    const lastSession = sessionData[sessionData.length - 1];
    const currentWeight = lastSession.maxWeight;

    // 2. Cooldown check: Have enough sessions passed since the last weight increase?
    let lastIncreaseIndex = -1;
    for (let i = 1; i < sessionData.length; i++) {
      if (sessionData[i].maxWeight > sessionData[i - 1].maxWeight) {
        lastIncreaseIndex = i;
      }
    }

    if (lastIncreaseIndex !== -1) {
      const sessionsSinceIncrease = sessionData.length - 1 - lastIncreaseIndex;
      if (sessionsSinceIncrease < profile.progression_cooldown_sessions) {
        return {
          exerciseName,
          status: "cooldown_active",
          currentWeight,
          reason: `Gewichts-Cooldown aktiv. Seit der letzten Erhöhung sind erst ${sessionsSinceIncrease} von ${profile.progression_cooldown_sessions} Einheiten vergangen.`,
          userMessage: `${exerciseName}: Erholungsphase aktiv. Behalte das Gewicht von ${currentWeight} kg bei, um dich an die Belastung anzupassen.`,
          profile,
          sessionsCount: sessionData.length
        };
      }
    }

    // 3. Check for sufficient data window
    if (sessionData.length < profile.trend_window) {
      return {
        exerciseName,
        status: "insufficient_data",
        currentWeight,
        reason: `Zu wenige Trainingseinheiten vorhanden. Benötigt: ${profile.trend_window}, Gefunden: ${sessionData.length}.`,
        userMessage: `${exerciseName}: Bereite Progression vor. Sammle noch ${profile.trend_window - sessionData.length} weitere Einheit(en).`,
        profile,
        sessionsCount: sessionData.length
      };
    }

    // Grab the trend window data
    const trendWindowSessions = sessionData.slice(-profile.trend_window);
    const firstVolume = trendWindowSessions[0].volume;
    const lastVolume = trendWindowSessions[trendWindowSessions.length - 1].volume;

    if (firstVolume <= 0) {
      return {
        exerciseName,
        status: "invalid_data",
        reason: "Volumen der ersten Einheit im Trendfenster ist Null oder ungültig.",
        userMessage: `${exerciseName}: Fehlerhafte Volumenwerte.`,
        profile
      };
    }

    // 4. Calculate Linear Regression Slope (x = 1..N, y = volume)
    const n = trendWindowSessions.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = trendWindowSessions[i].volume;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const progression_trend_is_positive = slope > 0;

    // 5. Calculate Relative Volume Growth
    const volumeGrowthPercent = (lastVolume - firstVolume) / firstVolume;

    // 6. Outlier Check: Unusually long rests (avgRestSeconds > 30% of previous average in window)
    let restWarning = "";
    if (trendWindowSessions.length >= 2) {
      const prevRests = trendWindowSessions.slice(0, -1);
      const avgPrevRest = prevRests.reduce((sum, s) => sum + s.avgRestSeconds, 0) / prevRests.length;
      const lastRest = lastSession.avgRestSeconds;
      
      if (lastRest > avgPrevRest * 1.3) {
        restWarning = "⚠️ Ungewöhnlich lange Satzpausen im letzten Training!";
      }
    }

    // 7. Progression Check: Lineare Steigung & Zielerfüllung
    if (!progression_trend_is_positive) {
      return {
        exerciseName,
        status: "no_positive_trend",
        currentWeight,
        slope,
        volumeGrowthPercent,
        restWarning,
        reason: "Kein positiver Volumentrend über die letzten Einheiten erkennbar.",
        userMessage: `${exerciseName}: Noch keine Steigerung. Konzentriere dich darauf, das Gewicht von ${currentWeight} kg stabiler zu bewegen.`,
        profile,
        trendWindowSessions
      };
    }

    if (lastSession.targetCompletion < profile.min_target_completion) {
      const percentageDisplay = Math.round(lastSession.targetCompletion * 100);
      const minPercentageDisplay = Math.round(profile.min_target_completion * 100);
      return {
        exerciseName,
        status: "target_not_reached",
        currentWeight,
        slope,
        volumeGrowthPercent,
        restWarning,
        lastTargetCompletion: lastSession.targetCompletion,
        reason: `Zielbereich nicht ausreichend oft erreicht (${percentageDisplay}% von geforderten ${minPercentageDisplay}% Sätzen).`,
        userMessage: `${exerciseName}: Positiver Trend, aber Zielbereich nicht voll erfüllt. Trainiere weiter bei ${currentWeight} kg, bis du in fast allen Sätzen ${profile.target_rep_max} Wiederholungen schaffst.`,
        profile,
        trendWindowSessions
      };
    }

    // 8. Weight Steps Validation & Resolution (available_weights / global fallback / constant step)
    let nextAvailableWeight = undefined;
    let usingConstantStep = false;
    let constantStepValue = 0;

    // Check if we have a single item in available weights representing a constant step size
    if (profile.available_weights && profile.available_weights.length === 1) {
      constantStepValue = Number(profile.available_weights[0]);
      if (!isNaN(constantStepValue) && constantStepValue > 0) {
        nextAvailableWeight = currentWeight + constantStepValue;
        usingConstantStep = true;
      }
    }

    if (!usingConstantStep) {
      // Choose list of weights to use: custom or global fallback
      let weightsToUse = [];
      if (profile.available_weights && profile.available_weights.length > 0) {
        weightsToUse = profile.available_weights;
      } else if (globalAvailableWeights && globalAvailableWeights.length > 0) {
        weightsToUse = globalAvailableWeights;
      } else {
        // Ultimate fallback: standard gym weights from 2.5 to 200 kg in 2.5kg steps
        for (let w = 2.5; w <= 200; w += 2.5) {
          weightsToUse.push(w);
        }
      }

      const sortedWeights = [...weightsToUse].map(Number).sort((a, b) => a - b);
      nextAvailableWeight = sortedWeights.find(w => w > currentWeight);

      if (sortedWeights.length === 0) {
        return {
          exerciseName,
          status: "missing_available_weights",
          currentWeight,
          slope,
          volumeGrowthPercent,
          restWarning,
          reason: "Keine verfügbaren Gewichtsstufen für diese Übung hinterlegt.",
          userMessage: `${exerciseName}: Positiver Trend! Aber es sind noch keine verfügbaren Gewichtsstufen für diese Übung hinterlegt.`,
          profile,
          trendWindowSessions
        };
      }
    }

    if (nextAvailableWeight === undefined) {
      return {
        exerciseName,
        status: "no_higher_weight_available",
        currentWeight,
        slope,
        volumeGrowthPercent,
        restWarning,
        reason: "Kein höheres verfügbares Gewicht in der Liste hinterlegt.",
        userMessage: `${exerciseName}: Höchstes hinterlegtes Gewicht von ${currentWeight} kg erreicht! Ergänze schwerere Scheiben in den Übungseinstellungen.`,
        profile,
        trendWindowSessions
      };
    }

    // 9. Damped Weight Jump calculation
    let suggestedWeightGrowthPercent = volumeGrowthPercent * profile.volume_damping_factor;
    suggestedWeightGrowthPercent = Math.min(suggestedWeightGrowthPercent, profile.max_jump_percent);

    const candidateWeight = currentWeight * (1 + suggestedWeightGrowthPercent);

    // Calculate actual jump to next available weight
    const actualJumpPercent = (nextAvailableWeight - currentWeight) / currentWeight;

    // 10. Final Decision Mapping
    if (actualJumpPercent <= profile.max_jump_percent) {
      let msg = `${exerciseName}: Deine Leistung ist über die letzten ${profile.trend_window} Einheiten stabil gestiegen. Erhöhe beim nächsten Training von ${currentWeight} kg auf ${nextAvailableWeight} kg. 💪`;
      if (restWarning) msg += ` (Hinweis: ${restWarning})`;
      
      return {
        exerciseName,
        status: "increase_recommended",
        currentWeight,
        recommendedWeight: nextAvailableWeight,
        trendWindow: profile.trend_window,
        slope,
        volumeGrowthPercent,
        suggestedWeightGrowthPercent,
        actualJumpPercent,
        restWarning,
        reason: "Positiver Volumentrend und Zielbereich erfolgreich erfüllt.",
        userMessage: msg,
        profile,
        trendWindowSessions
      };
    } else {
      return {
        exerciseName,
        status: "positive_trend_but_jump_too_large",
        currentWeight,
        recommendedWeight: currentWeight,
        trendWindow: profile.trend_window,
        slope,
        volumeGrowthPercent,
        suggestedWeightGrowthPercent,
        actualJumpPercent,
        maxJumpAllowed: profile.max_jump_percent,
        restWarning,
        reason: `Positiver Trend, aber der nächste Gewichtssprung (${actualJumpPercent.toFixed(1)}%) übersteigt das Limit (${(profile.max_jump_percent * 100).toFixed(0)}%).`,
        userMessage: `${exerciseName}: Positiver Trend erkannt, aber der nächste Gewichtssprung (auf ${nextAvailableWeight} kg) ist zu groß. Behalte die ${currentWeight} kg noch bei und steigere zuerst die Wiederholungen oder Satzqualität.`,
        profile,
        trendWindowSessions
      };
    }
  }

  /**
   * Diagnostic Test Suite running the 8 core scenarios
   */
  static runDiagnostics() {
    const results = [];
    const baseDate = new Date();
    
    const mockPlanExercise = {
      exercise_type: "compound",
      target_rep_min: 8,
      target_rep_max: 10,
      available_weights: [60, 70, 80, 82.5, 85, 90],
      trend_window: 3,
      volume_damping_factor: 0.30,
      max_jump_percent: 0.05, // 5% max jump (e.g. from 80kg max jump is 4kg)
      min_target_completion: 0.66,
      progression_cooldown_sessions: 2
    };

    // --- CASE 1: Positive Trend & Small Weight Jump (Bankdrücken) ---
    // Session 1: Volume = 80*8 + 80*8 + 80*7 = 1840
    // Session 2: Volume = 80*9 + 80*8 + 80*8 = 2000
    // Session 3: Volume = 80*10 + 80*10 + 80*9 = 2320 (target completion 2/3 = 0.67 >= 0.66)
    // First: 1840, Last: 2320 -> Growth: 26%. Damped jump: 26% * 0.3 = 7.8% -> capped at 5%.
    // Current: 80kg -> Max jump allowed: 4kg. Next available is 82.5kg (jump of 2.5kg = 3.1% <= 5%). Recommendation: Increase!
    const history1 = [
      { date: new Date(baseDate.getTime() - 8*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 8, done: true }, { weight: 80, reps: 8, done: true }, { weight: 80, reps: 7, done: true }] }] },
      { date: new Date(baseDate.getTime() - 4*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 9, done: true }, { weight: 80, reps: 8, done: true }, { weight: 80, reps: 8, done: true }] }] },
      { date: new Date(baseDate.getTime()).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 10, done: true }, { weight: 80, reps: 10, done: true }, { weight: 80, reps: 9, done: true }] }] }
    ];
    results.push({
      scenario: "1. Positive Trend & Sinnvoller Sprung (Bankdrücken)",
      analysis: this.analyze("Bankdrücken", history1, mockPlanExercise)
    });

    // --- CASE 2: Positive Trend but Weight Jump Too Large (Bizepscurls) ---
    // Isolation profile: max_jump_percent = 10%. Available weights: [10, 15, 20]. Current: 10kg. Next is 15kg (jump is 50% > 10%!).
    const curlPlan = {
      exercise_type: "isolation",
      target_rep_min: 10,
      target_rep_max: 12,
      available_weights: [10, 15, 20],
      trend_window: 3,
      volume_damping_factor: 0.25,
      max_jump_percent: 0.10,
      min_target_completion: 0.66,
      progression_cooldown_sessions: 2
    };
    const history2 = [
      { date: new Date(baseDate.getTime() - 8*86400000).toISOString(), exercises: [{ name: "Bizepscurls", sets: [{ weight: 10, reps: 10, done: true }, { weight: 10, reps: 10, done: true }] }] },
      { date: new Date(baseDate.getTime() - 4*86400000).toISOString(), exercises: [{ name: "Bizepscurls", sets: [{ weight: 10, reps: 11, done: true }, { weight: 10, reps: 11, done: true }] }] },
      { date: new Date(baseDate.getTime()).toISOString(), exercises: [{ name: "Bizepscurls", sets: [{ weight: 10, reps: 12, done: true }, { weight: 10, reps: 12, done: true }] }] }
    ];
    results.push({
      scenario: "2. Positive Trend aber Sprung zu groß (Bizepscurls)",
      analysis: this.analyze("Bizepscurls", history2, curlPlan)
    });

    // --- CASE 3: Insufficient Sessions ---
    const history3 = [
      { date: new Date(baseDate.getTime()).toISOString(), exercises: [{ name: "Kniebeugen", sets: [{ weight: 100, reps: 8, done: true }] }] }
    ];
    results.push({
      scenario: "3. Zu wenige Trainingseinheiten",
      analysis: this.analyze("Kniebeugen", history3, mockPlanExercise)
    });

    // --- CASE 4: No Positive Trend (Declining or Flat Volume) ---
    // Session 1: Volume = 80*10 = 800
    // Session 2: Volume = 80*8 = 640
    // Session 3: Volume = 80*8 = 640
    const history4 = [
      { date: new Date(baseDate.getTime() - 8*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 10, done: true }] }] },
      { date: new Date(baseDate.getTime() - 4*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 8, done: true }] }] },
      { date: new Date(baseDate.getTime()).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 8, done: true }] }] }
    ];
    results.push({
      scenario: "4. Kein positiver Volumentrend",
      analysis: this.analyze("Bankdrücken", history4, mockPlanExercise)
    });

    // --- CASE 5: Target Reps Not Met in Last Session ---
    // Volume slope is positive (1840 -> 2000 -> 2080).
    // Target max = 10 reps. Last session sets are 8, 9, 9 reps. Target completion is 0% < 66%.
    const history5 = [
      { date: new Date(baseDate.getTime() - 8*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 8, done: true }, { weight: 80, reps: 8, done: true }, { weight: 80, reps: 7, done: true }] }] },
      { date: new Date(baseDate.getTime() - 4*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 9, done: true }, { weight: 80, reps: 8, done: true }, { weight: 80, reps: 8, done: true }] }] },
      { date: new Date(baseDate.getTime()).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 8, done: true }, { weight: 80, reps: 9, done: true }, { weight: 80, reps: 9, done: true }] }] }
    ];
    results.push({
      scenario: "5. Zielbereich nicht ausreichend oft erfüllt",
      analysis: this.analyze("Bankdrücken", history5, mockPlanExercise)
    });

    // --- CASE 6: Missing Available Weights ---
    const planNoWeights = {...mockPlanExercise, available_weights: []};
    results.push({
      scenario: "6. Keine Gewichtsstufen hinterlegt",
      analysis: this.analyze("Bankdrücken", history1, planNoWeights)
    });

    // --- CASE 7: No Higher Weights Available ---
    const planMaxWeightReached = {...mockPlanExercise, available_weights: [60, 70, 80]};
    results.push({
      scenario: "7. Kein höheres Gewicht in Liste hinterlegt",
      analysis: this.analyze("Bankdrücken", history1, planMaxWeightReached)
    });

    // --- CASE 8: Cooldown Active (Weight increased last session) ---
    // In session 2 maxWeight is 80kg. In session 3 it is 82.5kg.
    // Last increase index = 2 (the very last session!).
    // Sessions completed since increase = 0 < 2 cooldown sessions.
    const history8 = [
      { date: new Date(baseDate.getTime() - 8*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 10, done: true }] }] },
      { date: new Date(baseDate.getTime() - 4*86400000).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 80, reps: 10, done: true }] }] },
      { date: new Date(baseDate.getTime()).toISOString(), exercises: [{ name: "Bankdrücken", sets: [{ weight: 82.5, reps: 8, done: true }] }] }
    ];
    results.push({
      scenario: "8. Cooldown nach kürzlicher Gewichtserhöhung",
      analysis: this.analyze("Bankdrücken", history8, mockPlanExercise)
    });

    // --- CASE 9: Global Fallback Weights (v2.1) ---
    // Exercise available_weights is empty. We pass global available weights [60, 70, 80, 82.5, 85, 90] as fourth argument.
    // It should successfully fallback to global weights and recommend increase to 82.5 kg!
    const planGlobalFallback = {...mockPlanExercise, available_weights: []};
    results.push({
      scenario: "9. Globaler Gewichts-Fallback (v2.1)",
      analysis: this.analyze("Bankdrücken", history1, planGlobalFallback, [60, 70, 80, 82.5, 85, 90])
    });

    // --- CASE 10: Constant Increment Step (v2.1) ---
    // Exercise has available_weights = [2.5] (single number step).
    // Current weight is 80kg. 2.5kg step means next weight is 82.5kg (jump of 3.125% <= 5%).
    // Recommendation should recommend increase to 82.5 kg!
    const planConstantStep = {...mockPlanExercise, available_weights: [2.5]};
    results.push({
      scenario: "10. Konstanter Steigerungsschritt z.B. Maschine (+2.5kg) (v2.1)",
      analysis: this.analyze("Bankdrücken", history1, planConstantStep)
    });

    return results;
  }
}

// Attach to window object for frontend consumption
window.ProgressionService = ProgressionService;
