/**
 * models.js - Fitness Tracker Data Models, Exercises, Calculations & Sample Data
 */

export const EXERCISE_TYPES = {
    running: {
        id: 'running',
        name: 'Running',
        icon: '🏃',
        category: 'cardio',
        met: 9.8,
        defaultIntensity: 'high',
        hasDistance: true
    },
    walking: {
        id: 'walking',
        name: 'Walking',
        icon: '🚶',
        category: 'cardio',
        met: 3.8,
        defaultIntensity: 'low',
        hasDistance: true
    },
    cycling: {
        id: 'cycling',
        name: 'Cycling',
        icon: '🚴',
        category: 'cardio',
        met: 7.5,
        defaultIntensity: 'medium',
        hasDistance: true
    },
    swimming: {
        id: 'swimming',
        name: 'Swimming',
        icon: '🏊',
        category: 'cardio',
        met: 8.0,
        defaultIntensity: 'high',
        hasDistance: true
    },
    strength: {
        id: 'strength',
        name: 'Strength Training',
        icon: '🏋️',
        category: 'strength',
        met: 5.0,
        defaultIntensity: 'medium',
        hasDistance: false
    },
    hiit: {
        id: 'hiit',
        name: 'HIIT Workout',
        icon: '⚡',
        category: 'cardio',
        met: 10.5,
        defaultIntensity: 'high',
        hasDistance: false
    },
    yoga: {
        id: 'yoga',
        name: 'Yoga & Stretching',
        icon: '🧘',
        category: 'flexibility',
        met: 3.0,
        defaultIntensity: 'low',
        hasDistance: false
    },
    pilates: {
        id: 'pilates',
        name: 'Pilates',
        icon: '🤸',
        category: 'flexibility',
        met: 4.2,
        defaultIntensity: 'medium',
        hasDistance: false
    },
    boxing: {
        id: 'boxing',
        name: 'Boxing / Martial Arts',
        icon: '🥊',
        category: 'cardio',
        met: 9.0,
        defaultIntensity: 'high',
        hasDistance: false
    },
    jump_rope: {
        id: 'jump_rope',
        name: 'Jump Rope',
        icon: '⏱️',
        category: 'cardio',
        met: 11.5,
        defaultIntensity: 'high',
        hasDistance: false
    },
    sports: {
        id: 'sports',
        name: 'Sports (Football / Basketball)',
        icon: '🏀',
        category: 'sports',
        met: 8.0,
        defaultIntensity: 'high',
        hasDistance: false
    },
    other: {
        id: 'other',
        name: 'Other Workout',
        icon: '🔥',
        category: 'other',
        met: 5.5,
        defaultIntensity: 'medium',
        hasDistance: false
    }
};

export const INTENSITY_MULTIPLIERS = {
    low: 0.8,
    medium: 1.0,
    high: 1.25,
    extreme: 1.5
};

export const DEFAULT_USER_PROFILE = {
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

/**
 * Calculate calories burned using MET formula:
 * Calories = MET * Weight(kg) * (Duration in mins / 60) * IntensityMultiplier
 */
export function calculateWorkoutCalories(typeId, durationMins, intensity = 'medium', userWeightKg = 70) {
    const exercise = EXERCISE_TYPES[typeId] || EXERCISE_TYPES.other;
    const baseMet = exercise.met;
    const multiplier = INTENSITY_MULTIPLIERS[intensity] || 1.0;
    const durationHours = (Number(durationMins) || 0) / 60;
    const calories = Math.round(baseMet * multiplier * userWeightKg * durationHours);
    return Math.max(0, calories);
}

/**
 * Estimate calories burned from steps
 * Avg 0.04 - 0.05 kcal per step based on body weight
 */
export function calculateStepCalories(steps, userWeightKg = 70) {
    const factor = (userWeightKg / 70) * 0.045;
    return Math.round((Number(steps) || 0) * factor);
}

/**
 * Convert steps to distance in kilometers
 */
export function calculateStepDistance(steps, stepLengthMeters = 0.75) {
    const meters = (Number(steps) || 0) * stepLengthMeters;
    return Number((meters / 1000).toFixed(2));
}

/**
 * Calculate Body Mass Index (BMI) and Category
 */
export function calculateBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const heightM = heightCm / 100;
    const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    let category = 'Normal';
    let color = '#10B981';

    if (bmi < 18.5) {
        category = 'Underweight';
        color = '#3B82F6';
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

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor formula
 */
export function calculateBMR(weightKg, heightCm, age, gender = 'other') {
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

/**
 * Get date string formatted as YYYY-MM-DD
 */
export function formatDateKey(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a localized friendly format (e.g., "Monday, Nov 9")
 */
export function formatFriendlyDate(dateStr) {
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

/**
 * Generates 14 days of realistic demo fitness records for instant app enjoyment
 */
export function generateSampleData(profile = DEFAULT_USER_PROFILE) {
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

        // Daily step variations (7,000 to 13,500)
        const stepMultiplier = (i === 0) ? 0.85 : 0.7 + Math.random() * 0.6;
        const steps = Math.round(profile.goals.steps * stepMultiplier);
        const water = Math.round(1800 + Math.random() * 1200); // 1800 - 3000 ml
        const sleep = Number((6.5 + Math.random() * 2.2).toFixed(1)); // 6.5 - 8.7 hrs
        const weight = Number((profile.weight - 0.5 + (Math.sin(i) * 0.4)).toFixed(1));

        dailyMetrics[dateKey] = {
            date: dateKey,
            steps,
            water,
            sleep,
            weight,
            notes: i === 0 ? 'Felt energetic today!' : ''
        };

        // Add 1 or 2 workouts on most days (rest day every ~4 days)
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

            // Extra walk on weekends
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

export const BADGES = [
    { id: 'first_step', name: 'First Workout', desc: 'Logged your very first workout', icon: '🏆', check: (w, m) => w.length >= 1 },
    { id: 'club_10k', name: '10K Club', desc: 'Reached 10,000 steps in a single day', icon: '👟', check: (w, m) => Object.values(m).some(d => d.steps >= 10000) },
    { id: 'calorie_torch', name: 'Calorie Crusher', desc: 'Burned 600+ active kcal in one day', icon: '🔥', check: (w, m) => {
        // Group by date
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

/**
 * Calculate current consecutive active workout streak
 */
export function calculateStreak(workouts) {
    if (!workouts || workouts.length === 0) return 0;
    const activeDates = new Set(workouts.map(w => w.date));
    let streak = 0;
    const cursor = new Date();

    // Check if logged today, if not check if logged yesterday to maintain streak
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
