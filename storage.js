/**
 * storage.js - Unified Storage Provider (LocalStorage, SQLite Export/Console, and Firebase Sync)
 */

import { DEFAULT_USER_PROFILE, generateSampleData } from './models.js';
import { generateSqlDump, executeSqlQuery } from './sqlite-helper.js';

const STORAGE_KEYS = {
    PROFILE: 'pulsefit_profile',
    WORKOUTS: 'pulsefit_workouts',
    METRICS: 'pulsefit_daily_metrics',
    FIREBASE_CONFIG: 'pulsefit_firebase_config',
    ACTIVE_ENGINE: 'pulsefit_storage_engine',
    SYNC_META: 'pulsefit_sync_meta'
};

export class FitnessStorage {
    constructor() {
        this.profile = DEFAULT_USER_PROFILE;
        this.workouts = [];
        this.dailyMetrics = {};
        this.storageEngine = 'local'; // 'local' | 'sqlite' | 'firebase'
        this.firebaseConfig = null;
        this.lastSyncTime = null;
        this.subscribers = [];
        this.init();
    }

    init() {
        try {
            // Load Engine preference
            const savedEngine = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENGINE);
            if (savedEngine) this.storageEngine = savedEngine;

            // Load Firebase config if any
            const savedFb = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
            if (savedFb) this.firebaseConfig = JSON.parse(savedFb);

            // Load Sync Meta
            const savedSync = localStorage.getItem(STORAGE_KEYS.SYNC_META);
            if (savedSync) {
                const meta = JSON.parse(savedSync);
                this.lastSyncTime = meta.lastSyncTime;
            }

            // Load Profile
            const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
            if (rawProfile) {
                this.profile = { ...DEFAULT_USER_PROFILE, ...JSON.parse(rawProfile) };
            }

            // Load Workouts & Metrics
            const rawWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
            const rawMetrics = localStorage.getItem(STORAGE_KEYS.METRICS);

            if (rawWorkouts && rawMetrics) {
                this.workouts = JSON.parse(rawWorkouts);
                this.dailyMetrics = JSON.parse(rawMetrics);
            } else {
                // First-time user experience: Prepopulate with realistic 14 days demo data
                this.populateDemoData(false);
            }
        } catch (e) {
            console.error('Error initializing storage, defaulting to sample data:', e);
            this.populateDemoData(false);
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    notify() {
        this.subscribers.forEach(cb => cb(this));
    }

    saveAll() {
        try {
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
            localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(this.workouts));
            localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(this.dailyMetrics));
            localStorage.setItem(STORAGE_KEYS.ACTIVE_ENGINE, this.storageEngine);
            if (this.firebaseConfig) {
                localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(this.firebaseConfig));
            }
            if (this.lastSyncTime) {
                localStorage.setItem(STORAGE_KEYS.SYNC_META, JSON.stringify({ lastSyncTime: this.lastSyncTime }));
            }
            this.notify();

            // Auto-sync to Firebase if configured
            if (this.storageEngine === 'firebase' && this.firebaseConfig?.projectId) {
                this.syncToFirebase().catch(err => console.warn('Background Firebase sync error:', err));
            }
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    }

    // --- Workouts CRUD ---

    addWorkout(workout) {
        const id = workout.id || 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const newWorkout = {
            ...workout,
            id,
            createdAt: workout.createdAt || Date.now()
        };
        this.workouts.unshift(newWorkout);
        this.saveAll();
        return newWorkout;
    }

    updateWorkout(id, updatedFields) {
        const index = this.workouts.findIndex(w => w.id === id);
        if (index !== -1) {
            this.workouts[index] = { ...this.workouts[index], ...updatedFields };
            this.saveAll();
            return this.workouts[index];
        }
        return null;
    }

    deleteWorkout(id) {
        this.workouts = this.workouts.filter(w => w.id !== id);
        this.saveAll();
    }

    getWorkoutsForDate(dateStr) {
        return this.workouts.filter(w => w.date === dateStr);
    }

    getWorkout(id) {
        return this.workouts.find(w => w.id === id);
    }

    // --- Daily Metrics CRUD ---

    getMetricsForDate(dateStr) {
        if (!this.dailyMetrics[dateStr]) {
            return {
                date: dateStr,
                steps: 0,
                water: 0,
                sleep: 0,
                weight: this.profile.weight || 70,
                notes: ''
            };
        }
        return this.dailyMetrics[dateStr];
    }

    updateDailyMetrics(dateStr, partial) {
        const current = this.getMetricsForDate(dateStr);
        this.dailyMetrics[dateStr] = {
            ...current,
            ...partial,
            date: dateStr,
            updatedAt: Date.now()
        };

        // If weight was updated for today, optionally update profile weight
        if (partial.weight && dateStr === this.getTodayKey()) {
            this.profile.weight = Number(partial.weight);
        }

        this.saveAll();
        return this.dailyMetrics[dateStr];
    }

    incrementSteps(dateStr, delta) {
        const current = this.getMetricsForDate(dateStr);
        const steps = Math.max(0, (current.steps || 0) + delta);
        return this.updateDailyMetrics(dateStr, { steps });
    }

    incrementWater(dateStr, deltaMl) {
        const current = this.getMetricsForDate(dateStr);
        const water = Math.max(0, (current.water || 0) + deltaMl);
        return this.updateDailyMetrics(dateStr, { water });
    }

    // --- Profile & Goals ---

    updateProfile(newProfile) {
        this.profile = {
            ...this.profile,
            ...newProfile,
            goals: {
                ...this.profile.goals,
                ...(newProfile.goals || {})
            }
        };
        this.saveAll();
        return this.profile;
    }

    setTheme(theme) {
        this.profile.theme = theme;
        this.saveAll();
    }

    setStorageEngine(engine) {
        this.storageEngine = engine;
        this.saveAll();
    }

    // --- Demo Data & Reset ---

    populateDemoData(notify = true) {
        const sample = generateSampleData(this.profile);
        this.workouts = sample.workouts;
        this.dailyMetrics = sample.dailyMetrics;
        if (notify) {
            this.saveAll();
        }
    }

    clearAllData() {
        this.workouts = [];
        this.dailyMetrics = {};
        this.saveAll();
    }

    // --- SQLite Integration & Querying ---

    getSqlDump() {
        return generateSqlDump(this.profile, this.dailyMetrics, this.workouts);
    }

    runSqlQuery(query) {
        return executeSqlQuery(query, {
            workouts: this.workouts,
            dailyMetrics: this.dailyMetrics,
            profile: this.profile
        });
    }

    // --- Firebase Cloud Sync Integration ---

    setFirebaseConfig(config) {
        this.firebaseConfig = config;
        this.saveAll();
    }

    /**
     * Firebase Firestore REST API synchronization
     * Allows syncing without bulky client SDKs: works directly via HTTPS REST!
     */
    async syncToFirebase() {
        if (!this.firebaseConfig || !this.firebaseConfig.projectId) {
            throw new Error('Firebase Project ID is required. Please configure Firebase in the Storage tab.');
        }

        const projectId = this.firebaseConfig.projectId.trim();
        const apiKey = this.firebaseConfig.apiKey ? this.firebaseConfig.apiKey.trim() : '';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fitness_users/current_user${apiKey ? `?key=${apiKey}` : ''}`;

        const payload = {
            fields: {
                profile: { stringValue: JSON.stringify(this.profile) },
                workouts: { stringValue: JSON.stringify(this.workouts) },
                dailyMetrics: { stringValue: JSON.stringify(this.dailyMetrics) },
                lastUpdated: { integerValue: String(Date.now()) }
            }
        };

        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Firebase Sync Failed (${res.status}): ${errBody}`);
        }

        this.lastSyncTime = new Date().toISOString();
        this.saveAll();
        return { success: true, timestamp: this.lastSyncTime };
    }

    async pullFromFirebase() {
        if (!this.firebaseConfig || !this.firebaseConfig.projectId) {
            throw new Error('Firebase Project ID is required.');
        }

        const projectId = this.firebaseConfig.projectId.trim();
        const apiKey = this.firebaseConfig.apiKey ? this.firebaseConfig.apiKey.trim() : '';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fitness_users/current_user${apiKey ? `?key=${apiKey}` : ''}`;

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch from Firebase (${res.status})`);
        }

        const doc = await res.json();
        if (doc.fields) {
            if (doc.fields.profile?.stringValue) {
                this.profile = JSON.parse(doc.fields.profile.stringValue);
            }
            if (doc.fields.workouts?.stringValue) {
                this.workouts = JSON.parse(doc.fields.workouts.stringValue);
            }
            if (doc.fields.dailyMetrics?.stringValue) {
                this.dailyMetrics = JSON.parse(doc.fields.dailyMetrics.stringValue);
            }
            this.lastSyncTime = new Date().toISOString();
            this.saveAll();
            return { success: true, timestamp: this.lastSyncTime };
        }
        throw new Error('No fitness record document found in Firebase Firestore for current_user.');
    }

    // --- JSON Export / Import ---

    exportAsJson() {
        const data = {
            app: 'PulseFit',
            version: '2.0',
            exportedAt: new Date().toISOString(),
            profile: this.profile,
            workouts: this.workouts,
            dailyMetrics: this.dailyMetrics
        };
        return JSON.stringify(data, null, 2);
    }

    importFromJson(jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.profile) this.profile = { ...DEFAULT_USER_PROFILE, ...parsed.profile };
            if (Array.isArray(parsed.workouts)) this.workouts = parsed.workouts;
            if (parsed.dailyMetrics) this.dailyMetrics = parsed.dailyMetrics;
            this.saveAll();
            return true;
        } catch (e) {
            throw new Error('Invalid JSON fitness backup file format: ' + e.message);
        }
    }

    getTodayKey() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
