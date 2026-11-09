/**
 * app.js - PulseFit Core Application Controller
 * Handles Navigation, State Management, UI Updates, Modals, Forms & Storage Sync
 */

import { EXERCISE_TYPES, calculateWorkoutCalories, calculateStepCalories, calculateStepDistance, calculateBMI, calculateBMR, formatDateKey, formatFriendlyDate, BADGES, calculateStreak } from './models.js';
import { FitnessStorage } from './storage.js';
import { FitnessCharts } from './charts.js';

class PulseFitApp {
    constructor() {
        this.storage = new FitnessStorage();
        this.selectedDate = this.storage.getTodayKey();
        this.currentView = 'dashboard';
        this.analyticsRange = 7; // 7 days or 30 days
        this.editingWorkoutId = null;

        this.initDOM();
        this.initTheme();
        this.initEventListeners();
        this.renderAll();
    }

    initDOM() {
        // Cache DOM elements
        this.navLinks = document.querySelectorAll('.nav-link');
        this.viewSections = document.querySelectorAll('.view-section');
        this.datePicker = document.getElementById('selected-date-picker');
        this.currentDateDisplay = document.getElementById('current-date-display');
        this.toastContainer = document.getElementById('toast-container');

        // Modals
        this.workoutModal = document.getElementById('workout-modal');
        this.metricsModal = document.getElementById('metrics-modal');
        this.workoutForm = document.getElementById('workout-form');
        this.metricsForm = document.getElementById('metrics-form');

        // Populate exercise types dropdown
        const typeSelect = document.getElementById('workout-type');
        if (typeSelect) {
            typeSelect.innerHTML = Object.values(EXERCISE_TYPES).map(ex => `
                <option value="${ex.id}">${ex.icon} ${ex.name}</option>
            `).join('');
        }

        // Set date picker max to today
        if (this.datePicker) {
            this.datePicker.max = this.storage.getTodayKey();
            this.datePicker.value = this.selectedDate;
        }
    }

    initTheme() {
        const theme = this.storage.profile.theme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            themeBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    }

    initEventListeners() {
        // Subscribe to storage changes
        this.storage.subscribe(() => {
            this.renderAll();
        });

        // Theme toggle
        document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            this.storage.setTheme(next);
            this.initTheme();
            this.showToast(`Switched to ${next} mode`, 'info');
        });

        // Tab Navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Date Navigator buttons
        document.getElementById('btn-prev-day')?.addEventListener('click', () => this.changeDate(-1));
        document.getElementById('btn-next-day')?.addEventListener('click', () => this.changeDate(1));
        document.getElementById('btn-today')?.addEventListener('click', () => {
            this.setDate(this.storage.getTodayKey());
        });

        if (this.datePicker) {
            this.datePicker.addEventListener('change', (e) => {
                this.setDate(e.target.value);
            });
        }

        // Quick log buttons on dashboard
        document.getElementById('btn-log-workout-quick')?.addEventListener('click', () => this.openWorkoutModal());
        document.getElementById('btn-log-metrics-quick')?.addEventListener('click', () => this.openMetricsModal());

        // Quick increments
        document.getElementById('btn-add-steps-250')?.addEventListener('click', () => {
            this.storage.incrementSteps(this.selectedDate, 250);
            this.showToast('+250 Steps logged!', 'success');
        });
        document.getElementById('btn-add-steps-1000')?.addEventListener('click', () => {
            this.storage.incrementSteps(this.selectedDate, 1000);
            this.showToast('+1,000 Steps logged!', 'success');
        });
        document.getElementById('btn-add-water-glass')?.addEventListener('click', () => {
            this.storage.incrementWater(this.selectedDate, 250);
            this.showToast('+250ml Water logged! 💧', 'success');
        });

        // Workout Form submission & auto-calculate calories on input
        this.setupWorkoutForm();

        // Metrics Form submission
        this.setupMetricsForm();

        // Profile Form submission
        this.setupProfileForm();

        // Storage & SQLite controls
        this.setupStorageControls();

        // Analytics range switch (7 vs 30 days)
        document.querySelectorAll('.analytics-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.analyticsRange = parseInt(btn.getAttribute('data-range'), 10);
                this.renderAnalytics();
            });
        });

        // Modal close buttons & backdrop click
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeAllModals();
            }
        });
    }

    switchView(viewName) {
        this.currentView = viewName;
        this.navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('data-view') === viewName);
        });
        this.viewSections.forEach(s => {
            s.classList.toggle('active', s.id === `view-${viewName}`);
        });

        // Re-render specific view
        if (viewName === 'dashboard') this.renderDashboard();
        if (viewName === 'analytics') this.renderAnalytics();
        if (viewName === 'history') this.renderHistory();
        if (viewName === 'storage') this.renderStorageTab();
        if (viewName === 'profile') this.renderProfile();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    changeDate(offsetDays) {
        const [y, m, d] = this.selectedDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + offsetDays);

        const newDateKey = formatDateKey(date);
        const todayKey = this.storage.getTodayKey();

        // Don't navigate into future beyond today
        if (newDateKey > todayKey) {
            this.showToast('Cannot navigate into future dates', 'warning');
            return;
        }

        this.setDate(newDateKey);
    }

    setDate(dateKey) {
        this.selectedDate = dateKey;
        if (this.datePicker) this.datePicker.value = dateKey;
        this.renderDashboard();
    }

    renderAll() {
        this.renderDateHeader();
        this.renderDashboard();
        this.renderAnalytics();
        this.renderHistory();
        this.renderProfile();
        this.renderStorageTab();
    }

    renderDateHeader() {
        if (this.currentDateDisplay) {
            this.currentDateDisplay.textContent = formatFriendlyDate(this.selectedDate);
        }
        const isToday = this.selectedDate === this.storage.getTodayKey();
        const nextBtn = document.getElementById('btn-next-day');
        if (nextBtn) {
            nextBtn.disabled = isToday;
            nextBtn.classList.toggle('disabled', isToday);
        }
    }

    // --- Dashboard Rendering ---

    renderDashboard() {
        this.renderDateHeader();
        const metrics = this.storage.getMetricsForDate(this.selectedDate);
        const workouts = this.storage.getWorkoutsForDate(this.selectedDate);
        const goals = this.storage.profile.goals;
        const weight = this.storage.profile.weight || 70;

        // Calculate workout totals
        const workoutCalories = workouts.reduce((sum, w) => sum + (Number(w.calories) || 0), 0);
        const workoutMinutes = workouts.reduce((sum, w) => sum + (Number(w.duration) || 0), 0);
        const workoutDistance = workouts.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);

        // Step calories & distance
        const stepCalories = calculateStepCalories(metrics.steps, weight);
        const stepDistance = calculateStepDistance(metrics.steps, this.storage.profile.stepLength);
        const totalCalories = workoutCalories + stepCalories;
        const totalDistance = (workoutDistance + stepDistance).toFixed(1);

        // Update Stat Cards & Rings
        // 1. Steps
        const stepsPercent = Math.min(Math.round(((metrics.steps || 0) / goals.steps) * 100), 100);
        document.getElementById('stat-steps-val').textContent = (metrics.steps || 0).toLocaleString();
        document.getElementById('stat-steps-goal').textContent = `Goal: ${goals.steps.toLocaleString()}`;
        document.getElementById('stat-steps-dist').textContent = `${stepDistance} km`;
        document.getElementById('stat-steps-bar').style.width = `${stepsPercent}%`;
        FitnessCharts.renderProgressRing(document.getElementById('ring-steps-svg'), stepsPercent, '#38BDF8');

        // 2. Calories
        const calPercent = Math.min(Math.round((totalCalories / goals.calories) * 100), 100);
        document.getElementById('stat-calories-val').textContent = totalCalories.toLocaleString();
        document.getElementById('stat-calories-goal').textContent = `Goal: ${goals.calories.toLocaleString()} kcal`;
        document.getElementById('stat-calories-split').textContent = `${workoutCalories} workout + ${stepCalories} steps`;
        document.getElementById('stat-calories-bar').style.width = `${calPercent}%`;
        FitnessCharts.renderProgressRing(document.getElementById('ring-calories-svg'), calPercent, '#FF5722');

        // 3. Active Minutes
        const activePercent = Math.min(Math.round((workoutMinutes / goals.activeMinutes) * 100), 100);
        document.getElementById('stat-active-val').textContent = `${workoutMinutes}m`;
        document.getElementById('stat-active-goal').textContent = `Goal: ${goals.activeMinutes} min`;
        document.getElementById('stat-active-workouts').textContent = `${workouts.length} workout${workouts.length === 1 ? '' : 's'}`;
        document.getElementById('stat-active-bar').style.width = `${activePercent}%`;
        FitnessCharts.renderProgressRing(document.getElementById('ring-active-svg'), activePercent, '#10B981');

        // 4. Water
        const waterVal = metrics.water || 0;
        const waterPercent = Math.min(Math.round((waterVal / goals.water) * 100), 100);
        document.getElementById('stat-water-val').textContent = `${(waterVal / 1000).toFixed(1)}L`;
        document.getElementById('stat-water-goal').textContent = `Goal: ${(goals.water / 1000).toFixed(1)}L (${waterVal}ml)`;
        document.getElementById('stat-water-bar').style.width = `${waterPercent}%`;
        FitnessCharts.renderProgressRing(document.getElementById('ring-water-svg'), waterPercent, '#06B6D4');

        // Sleep & Weight secondary badges
        const sleepEl = document.getElementById('stat-sleep-badge');
        if (sleepEl) {
            sleepEl.textContent = metrics.sleep ? `${metrics.sleep} hrs sleep` : 'Sleep not logged';
        }
        const weightEl = document.getElementById('stat-weight-badge');
        if (weightEl) {
            weightEl.textContent = metrics.weight ? `${metrics.weight} kg` : `${weight} kg`;
        }

        // Render Today's Workouts List
        const workoutList = document.getElementById('today-workouts-list');
        if (workoutList) {
            if (workouts.length === 0) {
                workoutList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🏃</div>
                        <h3>No workouts logged for this day</h3>
                        <p>Track your running, gym, yoga, or any sport to see calorie burn and stats.</p>
                        <button class="btn btn-primary" onclick="window.pulseApp.openWorkoutModal()">+ Log Workout</button>
                    </div>
                `;
            } else {
                workoutList.innerHTML = workouts.map(w => {
                    const typeDef = EXERCISE_TYPES[w.type] || EXERCISE_TYPES.other;
                    return `
                        <div class="workout-card">
                            <div class="workout-icon">${typeDef.icon}</div>
                            <div class="workout-info">
                                <div class="workout-header">
                                    <h4 class="workout-title">${typeDef.name}</h4>
                                    <span class="intensity-badge intensity-${w.intensity}">${w.intensity}</span>
                                </div>
                                <div class="workout-details">
                                    <span>⏱️ ${w.duration} mins</span>
                                    <span>🔥 ${w.calories} kcal</span>
                                    ${w.distance ? `<span>📍 ${w.distance} km</span>` : ''}
                                    ${w.heartRate ? `<span>❤️ ${w.heartRate} bpm</span>` : ''}
                                    <span>🕒 ${w.time}</span>
                                </div>
                                ${w.notes ? `<p class="workout-notes">${escapeHtml(w.notes)}</p>` : ''}
                            </div>
                            <div class="workout-actions">
                                <button class="btn-icon" title="Edit" onclick="window.pulseApp.openWorkoutModal('${w.id}')">✏️</button>
                                <button class="btn-icon btn-danger-icon" title="Delete" onclick="window.pulseApp.confirmDeleteWorkout('${w.id}')">🗑️</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // --- Analytics Rendering ---

    renderAnalytics() {
        const days = this.getPastDays(this.analyticsRange);
        const goals = this.storage.profile.goals;
        const weight = this.storage.profile.weight || 70;

        // Prepare Day aggregated dataset
        const daysData = days.map(dKey => {
            const metrics = this.storage.getMetricsForDate(dKey);
            const workouts = this.storage.getWorkoutsForDate(dKey);
            const workoutCals = workouts.reduce((s, w) => s + (Number(w.calories) || 0), 0);
            const stepCals = calculateStepCalories(metrics.steps, weight);
            const totalCals = workoutCals + stepCals;
            const workoutMins = workouts.reduce((s, w) => s + (Number(w.duration) || 0), 0);
            const distance = calculateStepDistance(metrics.steps, this.storage.profile.stepLength);

            const [y, m, d] = dKey.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
            const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
                date: dKey,
                dayName,
                label,
                steps: metrics.steps || 0,
                calories: totalCals,
                workoutMins,
                distance,
                water: metrics.water || 0
            };
        });

        // 1. Render Steps Bar Chart
        const stepsChartCont = document.getElementById('chart-steps-container');
        FitnessCharts.renderStepsBarChart(stepsChartCont, daysData, goals.steps);

        // 2. Render Calories Trend Chart
        const calChartCont = document.getElementById('chart-calories-container');
        FitnessCharts.renderCaloriesTrendChart(calChartCont, daysData, goals.calories);

        // 3. Render Workout Donut Chart (based on workouts in this date range)
        const relevantWorkouts = this.storage.workouts.filter(w => days.includes(w.date));
        const donutCont = document.getElementById('chart-breakdown-container');
        FitnessCharts.renderWorkoutDonutChart(donutCont, relevantWorkouts);

        // 4. Weekly Summary KPI Metrics
        const totalSteps = daysData.reduce((s, d) => s + d.steps, 0);
        const totalCals = daysData.reduce((s, d) => s + d.calories, 0);
        const totalActiveMins = daysData.reduce((s, d) => s + d.workoutMins, 0);
        const avgSteps = Math.round(totalSteps / daysData.length);
        const avgCals = Math.round(totalCals / daysData.length);

        document.getElementById('summary-total-steps').textContent = totalSteps.toLocaleString();
        document.getElementById('summary-avg-steps').textContent = `${avgSteps.toLocaleString()} / day`;
        document.getElementById('summary-total-calories').textContent = totalCals.toLocaleString();
        document.getElementById('summary-avg-calories').textContent = `${avgCals.toLocaleString()} / day`;
        document.getElementById('summary-total-active').textContent = `${totalActiveMins} min`;
        document.getElementById('summary-total-workouts').textContent = `${relevantWorkouts.length} logged`;

        // Streak & Badges
        const streak = calculateStreak(this.storage.workouts);
        document.getElementById('streak-count-badge').textContent = `${streak} Day${streak === 1 ? '' : 's'} Streak! 🔥`;

        this.renderBadges();
    }

    renderBadges() {
        const container = document.getElementById('badges-grid');
        if (!container) return;

        const w = this.storage.workouts;
        const m = this.storage.dailyMetrics;

        container.innerHTML = BADGES.map(badge => {
            const unlocked = badge.check(w, m);
            return `
                <div class="badge-item ${unlocked ? 'unlocked' : 'locked'}">
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-desc">${badge.desc}</div>
                    <span class="badge-status">${unlocked ? 'Unlocked 🌟' : 'In Progress'}</span>
                </div>
            `;
        }).join('');
    }

    // --- History View ---

    renderHistory() {
        const listCont = document.getElementById('history-records-list');
        if (!listCont) return;

        const workouts = [...this.storage.workouts].sort((a, b) => {
            const dateCmp = b.date.localeCompare(a.date);
            return dateCmp !== 0 ? dateCmp : (b.time || '').localeCompare(a.time || '');
        });

        if (workouts.length === 0) {
            listCont.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No history recorded yet</h3>
                    <p>Start logging your workouts or load demo data to view history logs.</p>
                </div>
            `;
            return;
        }

        listCont.innerHTML = workouts.map(w => {
            const typeDef = EXERCISE_TYPES[w.type] || EXERCISE_TYPES.other;
            return `
                <div class="history-item">
                    <div class="history-date-col">
                        <span class="history-date">${w.date}</span>
                        <span class="history-time">${w.time}</span>
                    </div>
                    <div class="history-icon">${typeDef.icon}</div>
                    <div class="history-info">
                        <strong>${typeDef.name}</strong>
                        <div class="history-metrics">
                            <span>⏱️ ${w.duration}m</span>
                            <span>🔥 ${w.calories} kcal</span>
                            ${w.distance ? `<span>📍 ${w.distance} km</span>` : ''}
                            <span class="intensity-tag">${w.intensity}</span>
                        </div>
                        ${w.notes ? `<div class="history-notes">"${escapeHtml(w.notes)}"</div>` : ''}
                    </div>
                    <div class="history-actions">
                        <button class="btn-icon" onclick="window.pulseApp.openWorkoutModal('${w.id}')">✏️</button>
                        <button class="btn-icon btn-danger-icon" onclick="window.pulseApp.confirmDeleteWorkout('${w.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Profile & Health Calculator ---

    renderProfile() {
        const profile = this.storage.profile;
        const goals = profile.goals;

        // Set inputs
        setValue('profile-name', profile.name);
        setValue('profile-gender', profile.gender);
        setValue('profile-age', profile.age);
        setValue('profile-weight', profile.weight);
        setValue('profile-height', profile.height);
        setValue('profile-step-length', profile.stepLength);

        setValue('goal-steps', goals.steps);
        setValue('goal-calories', goals.calories);
        setValue('goal-active', goals.activeMinutes);
        setValue('goal-water', goals.water);
        setValue('goal-sleep', goals.sleep);

        // Compute BMI & BMR
        const bmiData = calculateBMI(profile.weight, profile.height);
        const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);

        const bmiValEl = document.getElementById('calc-bmi-val');
        const bmiCatEl = document.getElementById('calc-bmi-cat');
        const bmrValEl = document.getElementById('calc-bmr-val');

        if (bmiData && bmiValEl && bmiCatEl) {
            bmiValEl.textContent = bmiData.bmi;
            bmiCatEl.textContent = bmiData.category;
            bmiCatEl.style.color = bmiData.color;
        }
        if (bmrValEl) {
            bmrValEl.textContent = `${bmr.toLocaleString()} kcal/day`;
        }
    }

    setupProfileForm() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const updatedProfile = {
                name: document.getElementById('profile-name').value.trim() || 'User',
                gender: document.getElementById('profile-gender').value,
                age: Number(document.getElementById('profile-age').value) || 25,
                weight: Number(document.getElementById('profile-weight').value) || 70,
                height: Number(document.getElementById('profile-height').value) || 175,
                stepLength: Number(document.getElementById('profile-step-length').value) || 0.75,
                goals: {
                    steps: Number(document.getElementById('goal-steps').value) || 10000,
                    calories: Number(document.getElementById('goal-calories').value) || 600,
                    activeMinutes: Number(document.getElementById('goal-active').value) || 45,
                    water: Number(document.getElementById('goal-water').value) || 2500,
                    sleep: Number(document.getElementById('goal-sleep').value) || 8
                }
            };

            this.storage.updateProfile(updatedProfile);
            this.showToast('Profile & fitness goals saved!', 'success');
        });
    }

    // --- Workout Modal & Form ---

    openWorkoutModal(workoutId = null) {
        this.editingWorkoutId = workoutId;
        const modalTitle = document.getElementById('workout-modal-title');
        const form = this.workoutForm;
        form.reset();

        if (workoutId) {
            modalTitle.textContent = 'Edit Workout';
            const w = this.storage.getWorkout(workoutId);
            if (w) {
                setValue('workout-date', w.date);
                setValue('workout-time', w.time);
                setValue('workout-type', w.type);
                setValue('workout-duration', w.duration);
                setValue('workout-intensity', w.intensity);
                setValue('workout-calories', w.calories);
                setValue('workout-distance', w.distance || '');
                setValue('workout-heartrate', w.heartRate || '');
                setValue('workout-notes', w.notes || '');
            }
        } else {
            modalTitle.textContent = 'Log New Workout';
            setValue('workout-date', this.selectedDate);
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            setValue('workout-time', timeStr);
            setValue('workout-duration', 30);
            setValue('workout-intensity', 'medium');
            this.autoCalculateWorkoutCalories();
        }

        this.workoutModal.classList.add('active');
    }

    setupWorkoutForm() {
        const durationInput = document.getElementById('workout-duration');
        const typeSelect = document.getElementById('workout-type');
        const intensitySelect = document.getElementById('workout-intensity');

        [durationInput, typeSelect, intensitySelect].forEach(input => {
            input?.addEventListener('input', () => this.autoCalculateWorkoutCalories());
            input?.addEventListener('change', () => this.autoCalculateWorkoutCalories());
        });

        this.workoutForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('workout-date').value;
            const time = document.getElementById('workout-time').value;
            const type = document.getElementById('workout-type').value;
            const duration = Number(document.getElementById('workout-duration').value);
            const intensity = document.getElementById('workout-intensity').value;
            const calories = Number(document.getElementById('workout-calories').value);
            const distance = Number(document.getElementById('workout-distance').value) || 0;
            const heartRate = Number(document.getElementById('workout-heartrate').value) || null;
            const notes = document.getElementById('workout-notes').value.trim();

            const workoutData = {
                date,
                time,
                type,
                duration,
                intensity,
                calories,
                distance,
                heartRate,
                notes
            };

            if (this.editingWorkoutId) {
                this.storage.updateWorkout(this.editingWorkoutId, workoutData);
                this.showToast('Workout updated successfully!', 'success');
            } else {
                this.storage.addWorkout(workoutData);
                this.showToast('Workout logged! Great job! 🎉', 'success');
            }

            this.closeAllModals();
        });
    }

    autoCalculateWorkoutCalories() {
        const type = document.getElementById('workout-type').value;
        const duration = Number(document.getElementById('workout-duration').value) || 0;
        const intensity = document.getElementById('workout-intensity').value;
        const weight = this.storage.profile.weight || 70;

        const estimated = calculateWorkoutCalories(type, duration, intensity, weight);
        const calInput = document.getElementById('workout-calories');
        if (calInput) {
            calInput.value = estimated;
        }
    }

    confirmDeleteWorkout(workoutId) {
        if (confirm('Are you sure you want to delete this workout?')) {
            this.storage.deleteWorkout(workoutId);
            this.showToast('Workout deleted.', 'info');
        }
    }

    // --- Daily Metrics Modal & Form ---

    openMetricsModal() {
        const metrics = this.storage.getMetricsForDate(this.selectedDate);
        setValue('metrics-date', this.selectedDate);
        setValue('metrics-steps', metrics.steps || 0);
        setValue('metrics-water', metrics.water || 0);
        setValue('metrics-sleep', metrics.sleep || 0);
        setValue('metrics-weight', metrics.weight || this.storage.profile.weight || 70);
        setValue('metrics-notes', metrics.notes || '');

        this.metricsModal.classList.add('active');
    }

    setupMetricsForm() {
        this.metricsForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('metrics-date').value;
            const steps = Number(document.getElementById('metrics-steps').value) || 0;
            const water = Number(document.getElementById('metrics-water').value) || 0;
            const sleep = Number(document.getElementById('metrics-sleep').value) || 0;
            const weight = Number(document.getElementById('metrics-weight').value) || null;
            const notes = document.getElementById('metrics-notes').value.trim();

            this.storage.updateDailyMetrics(date, { steps, water, sleep, weight, notes });
            this.showToast('Daily fitness metrics logged! 📊', 'success');
            this.closeAllModals();
        });
    }

    closeAllModals() {
        this.workoutModal?.classList.remove('active');
        this.metricsModal?.classList.remove('active');
        this.editingWorkoutId = null;
    }

    // --- Storage Tab, SQLite Console & Firebase Sync ---

    renderStorageTab() {
        const engineSelect = document.getElementById('storage-engine-select');
        if (engineSelect) {
            engineSelect.value = this.storage.storageEngine;
        }

        // Firebase Config display
        const fbConfig = this.storage.firebaseConfig || {};
        setValue('firebase-project-id', fbConfig.projectId || '');
        setValue('firebase-api-key', fbConfig.apiKey || '');

        const syncStatusEl = document.getElementById('firebase-sync-status');
        if (syncStatusEl) {
            if (this.storage.lastSyncTime) {
                const date = new Date(this.storage.lastSyncTime);
                syncStatusEl.textContent = `Last synced: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            } else {
                syncStatusEl.textContent = 'Not synced yet';
            }
        }
    }

    setupStorageControls() {
        // Storage Engine Switcher
        document.getElementById('storage-engine-select')?.addEventListener('change', (e) => {
            this.storage.setStorageEngine(e.target.value);
            this.showToast(`Active storage engine set to: ${e.target.value.toUpperCase()}`, 'info');
        });

        // Demo Data Button
        document.getElementById('btn-load-demo-data')?.addEventListener('click', () => {
            if (confirm('Load 14 days of realistic fitness demo data? This will add sample workouts, steps, and hydration records.')) {
                this.storage.populateDemoData(true);
                this.showToast('Demo fitness data loaded successfully! 🚀', 'success');
            }
        });

        // Clear Data Button
        document.getElementById('btn-clear-all-data')?.addEventListener('click', () => {
            if (confirm('WARNING: Are you sure you want to clear all workouts and daily records? This cannot be undone.')) {
                this.storage.clearAllData();
                this.showToast('All fitness records cleared.', 'warning');
            }
        });

        // Export SQL Dump
        document.getElementById('btn-export-sql')?.addEventListener('click', () => {
            const sql = this.storage.getSqlDump();
            this.downloadFile('pulsefit_database.sql', sql, 'text/sql');
            this.showToast('SQLite .sql database dump downloaded!', 'success');
        });

        // Export JSON Backup
        document.getElementById('btn-export-json')?.addEventListener('click', () => {
            const json = this.storage.exportAsJson();
            this.downloadFile('pulsefit_backup.json', json, 'application/json');
            this.showToast('JSON backup downloaded!', 'success');
        });

        // Import JSON Backup File
        document.getElementById('btn-import-json-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    this.storage.importFromJson(event.target.result);
                    this.showToast('Backup restored successfully!', 'success');
                } catch (err) {
                    this.showToast('Import error: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        });

        // SQL Query Console Runner
        document.getElementById('btn-run-sql-query')?.addEventListener('click', () => {
            const query = document.getElementById('sql-query-input').value;
            const resultBox = document.getElementById('sql-query-results');
            if (!query.trim()) return;

            const res = this.storage.runSqlQuery(query);
            if (res.error) {
                resultBox.innerHTML = `<div class="sql-error">⚠️ ${escapeHtml(res.error)}</div>`;
                return;
            }

            let tableHtml = `<div class="sql-success-info">✓ ${escapeHtml(res.message || 'Query executed')}</div>`;
            tableHtml += '<table class="sql-table"><thead><tr>';
            res.columns.forEach(col => {
                tableHtml += `<th>${escapeHtml(col)}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';

            if (res.rows.length === 0) {
                tableHtml += `<tr><td colspan="${res.columns.length}" style="text-align:center; opacity:0.6;">(0 rows returned)</td></tr>`;
            } else {
                res.rows.forEach(row => {
                    tableHtml += '<tr>';
                    row.forEach(val => {
                        tableHtml += `<td>${escapeHtml(String(val))}</td>`;
                    });
                    tableHtml += '</tr>';
                });
            }
            tableHtml += '</tbody></table>';
            resultBox.innerHTML = tableHtml;
        });

        // Firebase Save & Sync
        document.getElementById('btn-save-firebase-config')?.addEventListener('click', () => {
            const projectId = document.getElementById('firebase-project-id').value.trim();
            const apiKey = document.getElementById('firebase-api-key').value.trim();

            this.storage.setFirebaseConfig({ projectId, apiKey });
            this.showToast('Firebase configuration saved!', 'success');
        });

        document.getElementById('btn-sync-firebase-now')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-sync-firebase-now');
            btn.disabled = true;
            btn.textContent = 'Syncing...';
            try {
                await this.storage.syncToFirebase();
                this.showToast('Successfully synced records to Firebase Cloud! ☁️', 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sync Now to Cloud';
            }
        });

        document.getElementById('btn-pull-firebase-now')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-pull-firebase-now');
            btn.disabled = true;
            btn.textContent = 'Pulling...';
            try {
                await this.storage.pullFromFirebase();
                this.showToast('Successfully pulled records from Firebase Cloud! ☁️', 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Pull from Cloud';
            }
        });
    }

    // --- Helpers ---

    getPastDays(count = 7) {
        const days = [];
        const today = new Date();
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(formatDateKey(d));
        }
        return days;
    }

    downloadFile(filename, text, mimeType) {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showToast(message, type = 'info') {
        if (!this.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: '💡'
        };
        toast.innerHTML = `<span>${icons[type] || '💡'}</span> <span>${escapeHtml(message)}</span>`;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.pulseApp = new PulseFitApp();
});
