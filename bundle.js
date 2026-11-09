/**
 * PulseFit - Standalone Unified Bundle
 * Contains models, sqlite-helper, charts, storage, and app controller
 * Runs 100% reliably in browsers via both file:// and http:// protocols without CORS hurdles.
 */
(function() {
    'use strict';

    // ==========================================
    // 1. MODELS & CONSTANTS
    // ==========================================
    const EXERCISE_TYPES = {
        running: { id: 'running', name: 'Running', icon: '🏃', category: 'cardio', met: 9.8, defaultIntensity: 'high', hasDistance: true },
        walking: { id: 'walking', name: 'Walking', icon: '🚶', category: 'cardio', met: 3.8, defaultIntensity: 'low', hasDistance: true },
        cycling: { id: 'cycling', name: 'Cycling', icon: '🚴', category: 'cardio', met: 7.5, defaultIntensity: 'medium', hasDistance: true },
        swimming: { id: 'swimming', name: 'Swimming', icon: '🏊', category: 'cardio', met: 8.0, defaultIntensity: 'high', hasDistance: true },
        strength: { id: 'strength', name: 'Strength Training', icon: '🏋️', category: 'strength', met: 5.0, defaultIntensity: 'medium', hasDistance: false },
        hiit: { id: 'hiit', name: 'HIIT Workout', icon: '⚡', category: 'cardio', met: 10.5, defaultIntensity: 'high', hasDistance: false },
        yoga: { id: 'yoga', name: 'Yoga & Stretching', icon: '🧘', category: 'flexibility', met: 3.0, defaultIntensity: 'low', hasDistance: false },
        pilates: { id: 'pilates', name: 'Pilates', icon: '🤸', category: 'flexibility', met: 4.2, defaultIntensity: 'medium', hasDistance: false },
        boxing: { id: 'boxing', name: 'Boxing / Martial Arts', icon: '🥊', category: 'cardio', met: 9.0, defaultIntensity: 'high', hasDistance: false },
        jump_rope: { id: 'jump_rope', name: 'Jump Rope', icon: '⏱️', category: 'cardio', met: 11.5, defaultIntensity: 'high', hasDistance: false },
        sports: { id: 'sports', name: 'Sports (Football / Basketball)', icon: '🏀', category: 'sports', met: 8.0, defaultIntensity: 'high', hasDistance: false },
        other: { id: 'other', name: 'Other Workout', icon: '🔥', category: 'other', met: 5.5, defaultIntensity: 'medium', hasDistance: false }
    };

    const INTENSITY_MULTIPLIERS = {
        low: 0.8,
        medium: 1.0,
        high: 1.25,
        extreme: 1.5
    };

    const DEFAULT_USER_PROFILE = {
        name: 'Alex Johnson',
        gender: 'other',
        age: 28,
        weight: 70, // kg
        height: 175, // cm
        stepLength: 0.75, // meters
        goals: {
            steps: 10000,
            calories: 600, // active burn kcal
            activeMinutes: 45,
            water: 2500, // ml
            sleep: 8.0 // hours
        },
        theme: 'dark'
    };

    function calculateWorkoutCalories(typeId, durationMins, intensity = 'medium', userWeightKg = 70) {
        const exercise = EXERCISE_TYPES[typeId] || EXERCISE_TYPES.other;
        const baseMet = exercise.met;
        const multiplier = INTENSITY_MULTIPLIERS[intensity] || 1.0;
        const durationHours = (Number(durationMins) || 0) / 60;
        const calories = Math.round(baseMet * multiplier * userWeightKg * durationHours);
        return Math.max(0, calories);
    }

    function calculateStepCalories(steps, userWeightKg = 70) {
        const factor = (userWeightKg / 70) * 0.045;
        return Math.round((Number(steps) || 0) * factor);
    }

    function calculateStepDistance(steps, stepLengthMeters = 0.75) {
        const meters = (Number(steps) || 0) * stepLengthMeters;
        return Number((meters / 1000).toFixed(2));
    }

    function calculateBMI(weightKg, heightCm) {
        if (!weightKg || !heightCm) return null;
        const heightM = heightCm / 100;
        const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
        let category = 'Normal';
        let color = '#10B981';

        if (bmi < 18.5) {
            category = 'Underweight';
            color = '#38BDF8';
        } else if (bmi >= 18.5 && bmi < 25) {
            category = 'Normal weight';
            color = '#10B981';
        } else if (bmi >= 25 && bmi < 30) {
            category = 'Overweight';
            color = '#F59E0B';
        } else {
            category = 'Obese';
            color = '#EF4444';
        }

        return { bmi, category, color };
    }

    function calculateBMR(weightKg, heightCm, age, gender = 'other') {
        if (!weightKg || !heightCm || !age) return 1600;
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        if (gender === 'male') {
            bmr += 5;
        } else if (gender === 'female') {
            bmr -= 161;
        } else {
            bmr -= 78;
        }
        return Math.round(bmr);
    }

    function formatDateKey(date = new Date()) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatFriendlyDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (formatDateKey(today) === dateStr) {
            return 'Today, ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        if (formatDateKey(yesterday) === dateStr) {
            return 'Yesterday, ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function generateSampleData(profile = DEFAULT_USER_PROFILE) {
        const workouts = [];
        const dailyMetrics = {};
        const today = new Date();

        const sampleWorkoutTemplates = [
            { type: 'running', duration: 35, intensity: 'high', distance: 5.2, notes: 'Morning park interval run' },
            { type: 'strength', duration: 45, intensity: 'medium', distance: 0, notes: 'Chest, shoulders and triceps' },
            { type: 'cycling', duration: 50, intensity: 'medium', distance: 16.4, notes: 'Coastal road ride' },
            { type: 'hiit', duration: 30, intensity: 'extreme', distance: 0, notes: 'Tabata circuit + core' },
            { type: 'yoga', duration: 40, intensity: 'low', distance: 0, notes: 'Vinyasa flow recovery' },
            { type: 'walking', duration: 40, intensity: 'low', distance: 3.1, notes: 'Evening neighborhood walk' },
            { type: 'swimming', duration: 45, intensity: 'high', distance: 1.5, notes: 'Laps freestyle & breaststroke' },
            { type: 'boxing', duration: 45, intensity: 'high', distance: 0, notes: 'Heavy bag & speed rope' }
        ];

        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateKey = formatDateKey(d);

            const stepMultiplier = (i === 0) ? 0.85 : 0.7 + Math.random() * 0.6;
            const steps = Math.round(profile.goals.steps * stepMultiplier);
            const water = Math.round(1800 + Math.random() * 1200);
            const sleep = Number((6.5 + Math.random() * 2.2).toFixed(1));
            const weight = Number((profile.weight - 0.5 + (Math.sin(i) * 0.4)).toFixed(1));

            dailyMetrics[dateKey] = {
                date: dateKey,
                steps,
                water,
                sleep,
                weight,
                notes: i === 0 ? 'Felt energetic today!' : ''
            };

            if (i % 4 !== 3) {
                const template = sampleWorkoutTemplates[(13 - i) % sampleWorkoutTemplates.length];
                const calories = calculateWorkoutCalories(template.type, template.duration, template.intensity, profile.weight);
                workouts.push({
                    id: 'demo_' + dateKey + '_1',
                    date: dateKey,
                    time: (i % 2 === 0) ? '07:30' : '18:15',
                    type: template.type,
                    duration: template.duration,
                    intensity: template.intensity,
                    calories: calories,
                    distance: template.distance,
                    heartRate: template.intensity === 'high' ? 152 : (template.intensity === 'extreme' ? 168 : 130),
                    notes: template.notes,
                    createdAt: d.getTime()
                });

                if (d.getDay() === 0 || d.getDay() === 6) {
                    const walkCal = calculateWorkoutCalories('walking', 30, 'low', profile.weight);
                    workouts.push({
                        id: 'demo_' + dateKey + '_2',
                        date: dateKey,
                        time: '16:00',
                        type: 'walking',
                        duration: 30,
                        intensity: 'low',
                        calories: walkCal,
                        distance: 2.4,
                        heartRate: 110,
                        notes: 'Sunny weekend stroll',
                        createdAt: d.getTime() + 1000
                    });
                }
            }
        }

        return { workouts, dailyMetrics };
    }

    function calculateStreak(workouts) {
        if (!workouts || workouts.length === 0) return 0;
        const activeDates = new Set(workouts.map(w => w.date));
        let streak = 0;
        const cursor = new Date();

        const todayKey = formatDateKey(cursor);
        if (!activeDates.has(todayKey)) {
            cursor.setDate(cursor.getDate() - 1);
            if (!activeDates.has(formatDateKey(cursor))) {
                return 0;
            }
        }

        while (activeDates.has(formatDateKey(cursor))) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        }
        return streak;
    }

    const BADGES = [
        { id: 'first_step', name: 'First Workout', desc: 'Logged your very first workout', icon: '🏆', check: (w, m) => w.length >= 1 },
        { id: 'club_10k', name: '10K Club', desc: 'Reached 10,000 steps in a single day', icon: '👟', check: (w, m) => Object.values(m).some(d => d.steps >= 10000) },
        { id: 'calorie_torch', name: 'Calorie Crusher', desc: 'Burned 600+ active kcal in one day', icon: '🔥', check: (w, m) => {
            const cals = {};
            w.forEach(item => { cals[item.date] = (cals[item.date] || 0) + item.calories; });
            return Object.values(cals).some(c => c >= 600);
        }},
        { id: 'hydration_hero', name: 'Hydration Hero', desc: 'Hit 2,500ml water goal', icon: '💧', check: (w, m) => Object.values(m).some(d => d.water >= 2500) },
        { id: 'streak_3', name: '3-Day Momentum', desc: 'Exercised 3 days in a row', icon: '⚡', check: (w, m) => calculateStreak(w) >= 3 },
        { id: 'streak_7', name: '7-Day Champion', desc: 'Exercised 7 days in a row', icon: '👑', check: (w, m) => calculateStreak(w) >= 7 },
        { id: 'iron_will', name: 'Distance Explorer', desc: 'Logged over 15km of distance', icon: '🌍', check: (w, m) => {
            const dist = w.reduce((acc, cur) => acc + (cur.distance || 0), 0);
            return dist >= 15;
        }}
    ];

    // ==========================================
    // 2. SQLITE ENGINE & EXPORT HELPER
    // ==========================================
    const SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT,
    age INTEGER,
    weight REAL,
    height REAL,
    step_goal INTEGER,
    calorie_goal INTEGER,
    water_goal INTEGER,
    active_goal INTEGER,
    theme TEXT
);

CREATE TABLE IF NOT EXISTS daily_metrics (
    date TEXT PRIMARY KEY,
    steps INTEGER DEFAULT 0,
    water INTEGER DEFAULT 0,
    sleep REAL DEFAULT 0,
    weight REAL,
    notes TEXT,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    intensity TEXT NOT NULL,
    calories INTEGER NOT NULL,
    distance REAL DEFAULT 0,
    heart_rate INTEGER,
    notes TEXT,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(type);
`;

    function escapeSql(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/'/g, "''");
    }

    function generateSqlDump(profile, dailyMetrics, workouts) {
        let sql = `-- PulseFit Fitness Tracker SQLite Database Dump
-- Generated: ${new Date().toISOString()}

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

${SQL_SCHEMA}

-- Profile Data
INSERT OR REPLACE INTO user_profile (id, name, gender, age, weight, height, step_goal, calorie_goal, water_goal, active_goal, theme) VALUES (
    'current_user',
    '${escapeSql(profile.name)}',
    '${escapeSql(profile.gender)}',
    ${Number(profile.age) || 25},
    ${Number(profile.weight) || 70},
    ${Number(profile.height) || 175},
    ${Number(profile.goals?.steps) || 10000},
    ${Number(profile.goals?.calories) || 600},
    ${Number(profile.goals?.water) || 2500},
    ${Number(profile.goals?.activeMinutes) || 45},
    '${escapeSql(profile.theme || 'dark')}'
);

-- Daily Metrics Data
`;

        Object.values(dailyMetrics).forEach(metric => {
            sql += `INSERT OR REPLACE INTO daily_metrics (date, steps, water, sleep, weight, notes, updated_at) VALUES ('${escapeSql(metric.date)}', ${Number(metric.steps) || 0}, ${Number(metric.water) || 0}, ${Number(metric.sleep) || 0}, ${Number(metric.weight) || 'NULL'}, '${escapeSql(metric.notes || '')}', ${Date.now()});\n`;
        });

        sql += `\n-- Workouts Data\n`;
        workouts.forEach(w => {
            sql += `INSERT OR REPLACE INTO workouts (id, date, time, type, duration, intensity, calories, distance, heart_rate, notes, created_at) VALUES ('${escapeSql(w.id)}', '${escapeSql(w.date)}', '${escapeSql(w.time)}', '${escapeSql(w.type)}', ${Number(w.duration) || 0}, '${escapeSql(w.intensity)}', ${Number(w.calories) || 0}, ${Number(w.distance) || 0}, ${w.heartRate ? Number(w.heartRate) : 'NULL'}, '${escapeSql(w.notes || '')}', ${w.createdAt || Date.now()});\n`;
        });

        sql += `\nCOMMIT;\n`;
        return sql;
    }

    function executeSqlQuery(query, dataset) {
        const trimmed = query.trim().replace(/;$/, '');
        const { workouts, dailyMetrics, profile } = dataset;

        try {
            if (/^SELECT\b/i.test(trimmed)) {
                return executeSelectQuery(trimmed, { workouts, dailyMetrics, profile });
            } else if (/^SHOW TABLES\b/i.test(trimmed) || /^.tables\b/i.test(trimmed)) {
                return {
                    columns: ['Table Name', 'Estimated Rows'],
                    rows: [
                        ['workouts', workouts.length],
                        ['daily_metrics', Object.keys(dailyMetrics).length],
                        ['user_profile', 1]
                    ],
                    message: '3 tables found'
                };
            } else if (/^PRAGMA\s+table_info\((\w+)\)/i.test(trimmed)) {
                const match = trimmed.match(/^PRAGMA\s+table_info\((\w+)\)/i);
                const table = match[1].toLowerCase();
                return getTableInfo(table);
            } else {
                return {
                    error: 'Supported SQL: SELECT queries on "workouts", "daily_metrics", and "user_profile", plus PRAGMA table_info(<table>) and SHOW TABLES.'
                };
            }
        } catch (err) {
            return { error: err.message };
        }
    }

    function getTableInfo(table) {
        const schemas = {
            workouts: [
                ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'],
                ['0', 'id', 'TEXT', '1', 'NULL', '1'],
                ['1', 'date', 'TEXT', '1', 'NULL', '0'],
                ['2', 'time', 'TEXT', '1', 'NULL', '0'],
                ['3', 'type', 'TEXT', '1', 'NULL', '0'],
                ['4', 'duration', 'INTEGER', '1', 'NULL', '0'],
                ['5', 'intensity', 'TEXT', '1', 'NULL', '0'],
                ['6', 'calories', 'INTEGER', '1', 'NULL', '0'],
                ['7', 'distance', 'REAL', '0', '0', '0'],
                ['8', 'heart_rate', 'INTEGER', '0', 'NULL', '0'],
                ['9', 'notes', 'TEXT', '0', 'NULL', '0'],
                ['10', 'created_at', 'INTEGER', '0', 'NULL', '0']
            ],
            daily_metrics: [
                ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'],
                ['0', 'date', 'TEXT', '1', 'NULL', '1'],
                ['1', 'steps', 'INTEGER', '0', '0', '0'],
                ['2', 'water', 'INTEGER', '0', '0', '0'],
                ['3', 'sleep', 'REAL', '0', '0', '0'],
                ['4', 'weight', 'REAL', '0', 'NULL', '0'],
                ['5', 'notes', 'TEXT', '0', 'NULL', '0'],
                ['6', 'updated_at', 'INTEGER', '0', 'NULL', '0']
            ],
            user_profile: [
                ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'],
                ['0', 'id', 'TEXT', '1', 'NULL', '1'],
                ['1', 'name', 'TEXT', '1', 'NULL', '0'],
                ['2', 'gender', 'TEXT', '0', 'NULL', '0'],
                ['3', 'age', 'INTEGER', '0', 'NULL', '0'],
                ['4', 'weight', 'REAL', '0', 'NULL', '0'],
                ['5', 'height', 'REAL', '0', 'NULL', '0'],
                ['6', 'step_goal', 'INTEGER', '0', 'NULL', '0'],
                ['7', 'calorie_goal', 'INTEGER', '0', 'NULL', '0']
            ]
        };

        if (!schemas[table]) return { error: `Table '${table}' not found.` };
        return {
            columns: schemas[table][0],
            rows: schemas[table].slice(1),
            message: `${schemas[table].length - 1} columns in ${table}`
        };
    }

    function executeSelectQuery(query, { workouts, dailyMetrics, profile }) {
        const match = query.match(/SELECT\s+(.*?)\s+FROM\s+([a-zA-Z_0-9]+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i);
        if (!match) {
            throw new Error('Query syntax: SELECT <cols|*> FROM <table> [WHERE cond] [ORDER BY col [ASC|DESC]] [LIMIT n]');
        }

        const [, colsPart, rawTableName, wherePart, orderPart, limitPart] = match;
        const tableName = rawTableName.toLowerCase();

        let data = [];
        if (tableName === 'workouts') {
            data = workouts.map(w => ({
                id: w.id,
                date: w.date,
                time: w.time,
                type: w.type,
                duration: w.duration,
                intensity: w.intensity,
                calories: w.calories,
                distance: w.distance || 0,
                heart_rate: w.heartRate || null,
                notes: w.notes || ''
            }));
        } else if (tableName === 'daily_metrics') {
            data = Object.values(dailyMetrics).map(m => ({
                date: m.date,
                steps: m.steps || 0,
                water: m.water || 0,
                sleep: m.sleep || 0,
                weight: m.weight || null,
                notes: m.notes || ''
            }));
        } else if (tableName === 'user_profile') {
            data = [{
                id: 'current_user',
                name: profile.name,
                gender: profile.gender,
                age: profile.age,
                weight: profile.weight,
                height: profile.height,
                step_goal: profile.goals.steps,
                calorie_goal: profile.goals.calories,
                water_goal: profile.goals.water
            }];
        } else {
            throw new Error(`Table '${tableName}' does not exist. Available tables: workouts, daily_metrics, user_profile`);
        }

        if (wherePart) {
            data = data.filter(row => evaluateSimpleWhere(row, wherePart));
        }

        if (orderPart) {
            const [field, dir] = orderPart.trim().split(/\s+/);
            const isDesc = dir && dir.toUpperCase() === 'DESC';
            data.sort((a, b) => {
                let va = a[field];
                let vb = b[field];
                if (va === undefined || vb === undefined) return 0;
                if (typeof va === 'number' && typeof vb === 'number') {
                    return isDesc ? vb - va : va - vb;
                }
                return isDesc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
            });
        }

        if (limitPart) {
            data = data.slice(0, parseInt(limitPart, 10));
        }

        let columns = [];
        if (colsPart.trim() === '*') {
            columns = data.length > 0 ? Object.keys(data[0]) : ['(empty)'];
        } else {
            columns = colsPart.split(',').map(c => c.trim().toLowerCase());
        }

        const rows = data.map(row => {
            return columns.map(c => {
                const val = row[c];
                return val === null || val === undefined ? 'NULL' : val;
            });
        });

        return {
            columns,
            rows,
            message: `${rows.length} row(s) returned`
        };
    }

    function evaluateSimpleWhere(row, whereClause) {
        const conditions = whereClause.split(/\s+AND\s+/i);
        return conditions.every(cond => {
            cond = cond.trim();
            let m = cond.match(/^([a-zA-Z_0-9]+)\s*=\s*['"]?(.*?)['"]?$/);
            if (m) {
                return String(row[m[1]]).toLowerCase() === m[2].toLowerCase();
            }
            m = cond.match(/^([a-zA-Z_0-9]+)\s*>\s*([0-9.]+)/);
            if (m) {
                return Number(row[m[1]]) > Number(m[2]);
            }
            m = cond.match(/^([a-zA-Z_0-9]+)\s*<\s*([0-9.]+)/);
            if (m) {
                return Number(row[m[1]]) < Number(m[2]);
            }
            m = cond.match(/^([a-zA-Z_0-9]+)\s*>=\s*([0-9.]+)/);
            if (m) {
                return Number(row[m[1]]) >= Number(m[2]);
            }
            m = cond.match(/^([a-zA-Z_0-9]+)\s*<=\s*([0-9.]+)/);
            if (m) {
                return Number(row[m[1]]) <= Number(m[2]);
            }
            m = cond.match(/^([a-zA-Z_0-9]+)\s+LIKE\s+['"]%(.*?)%['"]$/i);
            if (m) {
                return String(row[m[1]] || '').toLowerCase().includes(m[2].toLowerCase());
            }
            return true;
        });
    }

    // ==========================================
    // 3. STORAGE LAYER
    // ==========================================
    const STORAGE_KEYS = {
        PROFILE: 'pulsefit_profile',
        WORKOUTS: 'pulsefit_workouts',
        METRICS: 'pulsefit_daily_metrics',
        FIREBASE_CONFIG: 'pulsefit_firebase_config',
        ACTIVE_ENGINE: 'pulsefit_storage_engine',
        SYNC_META: 'pulsefit_sync_meta'
    };

    class FitnessStorage {
        constructor() {
            this.profile = DEFAULT_USER_PROFILE;
            this.workouts = [];
            this.dailyMetrics = {};
            this.storageEngine = 'local';
            this.firebaseConfig = null;
            this.lastSyncTime = null;
            this.subscribers = [];
            this.init();
        }

        init() {
            try {
                const savedEngine = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENGINE);
                if (savedEngine) this.storageEngine = savedEngine;

                const savedFb = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
                if (savedFb) this.firebaseConfig = JSON.parse(savedFb);

                const savedSync = localStorage.getItem(STORAGE_KEYS.SYNC_META);
                if (savedSync) {
                    const meta = JSON.parse(savedSync);
                    this.lastSyncTime = meta.lastSyncTime;
                }

                const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
                if (rawProfile) {
                    this.profile = { ...DEFAULT_USER_PROFILE, ...JSON.parse(rawProfile) };
                }

                const rawWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
                const rawMetrics = localStorage.getItem(STORAGE_KEYS.METRICS);

                if (rawWorkouts && rawMetrics) {
                    this.workouts = JSON.parse(rawWorkouts);
                    this.dailyMetrics = JSON.parse(rawMetrics);
                } else {
                    this.populateDemoData(false);
                }
            } catch (e) {
                console.error('Storage init error, defaulting:', e);
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

                if (this.storageEngine === 'firebase' && this.firebaseConfig?.projectId) {
                    this.syncToFirebase().catch(err => console.warn('Firebase auto-sync background error:', err));
                }
            } catch (err) {
                console.error('Failed to save data:', err);
            }
        }

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

        setFirebaseConfig(config) {
            this.firebaseConfig = config;
            this.saveAll();
        }

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

    // ==========================================
    // 4. CHARTS VISUAL ENGINE
    // ==========================================
    class FitnessCharts {
        static renderProgressRing(svgEl, percent, color = '#10B981', strokeWidth = 10) {
            if (!svgEl) return;
            const boundedPercent = Math.min(Math.max(percent, 0), 100);
            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (boundedPercent / 100) * circumference;

            svgEl.innerHTML = `
                <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="currentColor" stroke-width="${strokeWidth}" class="ring-bg" />
                <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);" />
            `;
        }

        static renderStepsBarChart(container, daysData, stepGoal = 10000) {
            if (!container) return;
            if (!daysData || daysData.length === 0) {
                container.innerHTML = '<div class="chart-empty">No steps data available.</div>';
                return;
            }

            const maxSteps = Math.max(stepGoal * 1.15, ...daysData.map(d => d.steps || 0));
            const chartHeight = 180;
            const chartWidth = 500;
            const barWidth = 36;
            const gap = (chartWidth - (barWidth * daysData.length)) / (daysData.length + 1);
            const goalY = chartHeight - (stepGoal / maxSteps) * (chartHeight - 40) - 25;

            let barsSvg = '';
            daysData.forEach((item, index) => {
                const steps = item.steps || 0;
                const barHeight = Math.max(4, (steps / maxSteps) * (chartHeight - 40));
                const x = gap + index * (barWidth + gap);
                const y = chartHeight - barHeight - 25;
                const isGoalMet = steps >= stepGoal;
                const barColor = isGoalMet ? 'url(#greenGradient)' : 'url(#blueGradient)';

                barsSvg += `
                    <g class="bar-group" data-tooltip="${item.label}: ${steps.toLocaleString()} steps">
                        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" ry="6" fill="${barColor}" class="chart-bar" />
                        <text x="${x + barWidth / 2}" y="${chartHeight - 8}" text-anchor="middle" class="chart-label">${item.dayName}</text>
                        <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" class="chart-val-label">${steps > 0 ? (steps > 999 ? (steps / 1000).toFixed(1) + 'k' : steps) : ''}</text>
                    </g>
                `;
            });

            container.innerHTML = `
                <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="fitness-chart-svg" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#38BDF8"/>
                            <stop offset="100%" stop-color="#0284C7"/>
                        </linearGradient>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#34D399"/>
                            <stop offset="100%" stop-color="#059669"/>
                        </linearGradient>
                    </defs>
                    <line x1="10" y1="${goalY}" x2="${chartWidth - 10}" y2="${goalY}" stroke="#F59E0B" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.75" />
                    <text x="${chartWidth - 12}" y="${goalY - 4}" text-anchor="end" class="chart-goal-label">Goal ${stepGoal / 1000}k</text>
                    ${barsSvg}
                </svg>
            `;
        }

        static renderCaloriesTrendChart(container, daysData, calorieGoal = 600) {
            if (!container) return;
            if (!daysData || daysData.length === 0) {
                container.innerHTML = '<div class="chart-empty">No calorie data available.</div>';
                return;
            }

            const maxCals = Math.max(calorieGoal * 1.25, ...daysData.map(d => d.calories || 0), 300);
            const w = 500;
            const h = 180;
            const padX = 35;
            const padY = 30;
            const plotW = w - padX * 2;
            const plotH = h - padY * 2;

            const points = daysData.map((d, i) => {
                const x = padX + (i / (daysData.length - 1)) * plotW;
                const y = h - padY - ((d.calories || 0) / maxCals) * plotH;
                return { x, y, ...d };
            });

            let lineD = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const cx1 = prev.x + (curr.x - prev.x) / 2;
                const cy1 = prev.y;
                const cx2 = prev.x + (curr.x - prev.x) / 2;
                const cy2 = curr.y;
                lineD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
            }

            const areaD = `${lineD} L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`;
            const goalY = h - padY - (calorieGoal / maxCals) * plotH;

            let dotsSvg = '';
            points.forEach(p => {
                dotsSvg += `
                    <g class="chart-point-group" data-tooltip="${p.label}: ${p.calories} kcal burned">
                        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#FF5722" stroke="#FFFFFF" stroke-width="2" class="chart-dot" />
                        <text x="${p.x}" y="${h - 10}" text-anchor="middle" class="chart-label">${p.dayName}</text>
                        <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" class="chart-val-label">${p.calories}</text>
                    </g>
                `;
            });

            container.innerHTML = `
                <svg viewBox="0 0 ${w} ${h}" class="fitness-chart-svg" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="calAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#FF5722" stop-opacity="0.45"/>
                            <stop offset="100%" stop-color="#FF5722" stop-opacity="0.0"/>
                        </linearGradient>
                    </defs>
                    <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="currentColor" opacity="0.1" />
                    <line x1="${padX}" y1="${goalY}" x2="${w - padX}" y2="${goalY}" stroke="#F59E0B" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.75" />
                    <text x="${w - padX}" y="${goalY - 4}" text-anchor="end" class="chart-goal-label">Goal ${calorieGoal} kcal</text>
                    <path d="${areaD}" fill="url(#calAreaGrad)" />
                    <path d="${lineD}" fill="none" stroke="#FF5722" stroke-width="3" stroke-linecap="round" />
                    ${dotsSvg}
                </svg>
            `;
        }

        static renderWorkoutDonutChart(container, workouts) {
            if (!container) return;
            if (!workouts || workouts.length === 0) {
                container.innerHTML = '<div class="chart-empty">No workouts logged yet. Log your first workout to see category breakdowns!</div>';
                return;
            }

            const typeTotals = {};
            let totalMins = 0;
            workouts.forEach(w => {
                const type = w.type || 'other';
                const duration = Number(w.duration) || 0;
                typeTotals[type] = (typeTotals[type] || 0) + duration;
                totalMins += duration;
            });

            if (totalMins === 0) {
                container.innerHTML = '<div class="chart-empty">No workout duration recorded.</div>';
                return;
            }

            const colors = ['#38BDF8', '#34D399', '#F472B6', '#A78BFA', '#FBBF24', '#FB7185', '#4ADE80'];
            const slices = Object.entries(typeTotals).map(([type, mins], index) => {
                const def = EXERCISE_TYPES[type] || EXERCISE_TYPES.other;
                return {
                    type,
                    name: def.name,
                    icon: def.icon,
                    mins,
                    percent: Math.round((mins / totalMins) * 100),
                    color: colors[index % colors.length]
                };
            }).sort((a, b) => b.mins - a.mins);

            const radius = 55;
            const circumference = 2 * Math.PI * radius;
            let cumulativePercent = 0;
            let pathsSvg = '';

            slices.forEach(slice => {
                const strokeDash = (slice.percent / 100) * circumference;
                const strokeOffset = circumference - (cumulativePercent / 100) * circumference;
                cumulativePercent += slice.percent;

                pathsSvg += `
                    <circle cx="80" cy="80" r="${radius}" fill="transparent" stroke="${slice.color}" stroke-width="22" stroke-dasharray="${strokeDash} ${circumference}" stroke-dashoffset="${strokeOffset}" transform="rotate(-90 80 80)" class="donut-segment" />
                `;
            });

            let legendHtml = '<div class="donut-legend">';
            slices.forEach(s => {
                legendHtml += `
                    <div class="legend-item">
                        <span class="legend-dot" style="background:${s.color}"></span>
                        <span class="legend-name">${s.icon} ${s.name}</span>
                        <span class="legend-val">${s.mins}m (${s.percent}%)</span>
                    </div>
                `;
            });
            legendHtml += '</div>';

            container.innerHTML = `
                <div class="donut-chart-wrapper">
                    <div class="donut-svg-container">
                        <svg viewBox="0 0 160 160" class="donut-svg">
                            <circle cx="80" cy="80" r="${radius}" fill="transparent" stroke="currentColor" stroke-width="22" class="ring-bg" />
                            ${pathsSvg}
                        </svg>
                        <div class="donut-center-info">
                            <span class="donut-center-total">${totalMins}m</span>
                            <span class="donut-center-label">Total Time</span>
                        </div>
                    </div>
                    ${legendHtml}
                </div>
            `;
        }
    }

    // ==========================================
    // 5. APP CONTROLLER
    // ==========================================
    class PulseFitApp {
        constructor() {
            this.storage = new FitnessStorage();
            this.selectedDate = this.storage.getTodayKey();
            this.currentView = 'dashboard';
            this.analyticsRange = 7;
            this.editingWorkoutId = null;

            this.initDOM();
            this.initTheme();
            this.initEventListeners();
            this.renderAll();
        }

        initDOM() {
            this.navLinks = document.querySelectorAll('.nav-link');
            this.viewSections = document.querySelectorAll('.view-section');
            this.datePicker = document.getElementById('selected-date-picker');
            this.currentDateDisplay = document.getElementById('current-date-display');
            this.toastContainer = document.getElementById('toast-container');

            this.workoutModal = document.getElementById('workout-modal');
            this.metricsModal = document.getElementById('metrics-modal');
            this.workoutForm = document.getElementById('workout-form');
            this.metricsForm = document.getElementById('metrics-form');

            const typeSelect = document.getElementById('workout-type');
            if (typeSelect) {
                typeSelect.innerHTML = Object.values(EXERCISE_TYPES).map(ex => `
                    <option value="${ex.id}">${ex.icon} ${ex.name}</option>
                `).join('');
            }

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
            this.storage.subscribe(() => {
                this.renderAll();
            });

            document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                this.storage.setTheme(next);
                this.initTheme();
                this.showToast(`Switched to ${next} mode`, 'info');
            });

            this.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const view = link.getAttribute('data-view');
                    this.switchView(view);
                });
            });

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

            document.getElementById('btn-log-workout-quick')?.addEventListener('click', () => this.openWorkoutModal());
            document.getElementById('btn-log-metrics-quick')?.addEventListener('click', () => this.openMetricsModal());

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

            this.setupWorkoutForm();
            this.setupMetricsForm();
            this.setupProfileForm();
            this.setupStorageControls();

            document.querySelectorAll('.analytics-range-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.analyticsRange = parseInt(btn.getAttribute('data-range'), 10);
                    this.renderAnalytics();
                });
            });

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

            if (viewName === 'dashboard') this.renderDashboard();
            if (viewName === 'analytics') this.renderAnalytics();
            if (viewName === 'history') this.renderHistory();
            if (viewName === 'storage') this.renderStorageTab();
            if (viewName === 'profile') this.renderProfile();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        changeDate(offsetDays) {
            const [y, m, d] = this.selectedDate.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            date.setDate(date.getDate() + offsetDays);

            const newDateKey = formatDateKey(date);
            const todayKey = this.storage.getTodayKey();

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

        renderDashboard() {
            this.renderDateHeader();
            const metrics = this.storage.getMetricsForDate(this.selectedDate);
            const workouts = this.storage.getWorkoutsForDate(this.selectedDate);
            const goals = this.storage.profile.goals;
            const weight = this.storage.profile.weight || 70;

            const workoutCalories = workouts.reduce((sum, w) => sum + (Number(w.calories) || 0), 0);
            const workoutMinutes = workouts.reduce((sum, w) => sum + (Number(w.duration) || 0), 0);
            const workoutDistance = workouts.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);

            const stepCalories = calculateStepCalories(metrics.steps, weight);
            const stepDistance = calculateStepDistance(metrics.steps, this.storage.profile.stepLength);
            const totalCalories = workoutCalories + stepCalories;

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

            const sleepEl = document.getElementById('stat-sleep-badge');
            if (sleepEl) {
                sleepEl.textContent = metrics.sleep ? `${metrics.sleep} hrs sleep` : 'Sleep: --';
            }
            const weightEl = document.getElementById('stat-weight-badge');
            if (weightEl) {
                weightEl.textContent = metrics.weight ? `${metrics.weight} kg` : `${weight} kg`;
            }

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

        renderAnalytics() {
            const days = this.getPastDays(this.analyticsRange);
            const goals = this.storage.profile.goals;
            const weight = this.storage.profile.weight || 70;

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

            const stepsChartCont = document.getElementById('chart-steps-container');
            FitnessCharts.renderStepsBarChart(stepsChartCont, daysData, goals.steps);

            const calChartCont = document.getElementById('chart-calories-container');
            FitnessCharts.renderCaloriesTrendChart(calChartCont, daysData, goals.calories);

            const relevantWorkouts = this.storage.workouts.filter(w => days.includes(w.date));
            const donutCont = document.getElementById('chart-breakdown-container');
            FitnessCharts.renderWorkoutDonutChart(donutCont, relevantWorkouts);

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

        renderProfile() {
            const profile = this.storage.profile;
            const goals = profile.goals;

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

        renderStorageTab() {
            const engineSelect = document.getElementById('storage-engine-select');
            if (engineSelect) {
                engineSelect.value = this.storage.storageEngine;
            }

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
            document.getElementById('storage-engine-select')?.addEventListener('change', (e) => {
                this.storage.setStorageEngine(e.target.value);
                this.showToast(`Active storage engine: ${e.target.value.toUpperCase()}`, 'info');
            });

            document.getElementById('btn-load-demo-data')?.addEventListener('click', () => {
                if (confirm('Load 14 days of realistic fitness demo data?')) {
                    this.storage.populateDemoData(true);
                    this.showToast('Demo fitness data loaded! 🚀', 'success');
                }
            });

            document.getElementById('btn-clear-all-data')?.addEventListener('click', () => {
                if (confirm('WARNING: Are you sure you want to clear all workouts and daily records?')) {
                    this.storage.clearAllData();
                    this.showToast('All fitness records cleared.', 'warning');
                }
            });

            document.getElementById('btn-export-sql')?.addEventListener('click', () => {
                const sql = this.storage.getSqlDump();
                this.downloadFile('pulsefit_database.sql', sql, 'text/sql');
                this.showToast('SQLite .sql database dump downloaded!', 'success');
            });

            document.getElementById('btn-export-json')?.addEventListener('click', () => {
                const json = this.storage.exportAsJson();
                this.downloadFile('pulsefit_backup.json', json, 'application/json');
                this.showToast('JSON backup downloaded!', 'success');
            });

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

    // Bootstrap app immediately on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.pulseApp = new PulseFitApp();
        });
    } else {
        window.pulseApp = new PulseFitApp();
    }
})();
