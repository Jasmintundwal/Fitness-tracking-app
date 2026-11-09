# ⚡ PulseFit — Modern Fitness Tracking App

A sleek, responsive, and full-featured fitness tracking web application built with clean HTML5, modern CSS3, and vanilla JavaScript. PulseFit allows you to track daily physical activities (steps, workouts, active calories, hydration, sleep), view rich visual progress rings and weekly charts, and persist your data using **LocalStorage**, an embedded **SQLite engine** (with query console and `.sql` dump export), or live **Google Firebase Firestore** cloud sync.

---

## 🌟 Key Features & Requirements Matrix

| Requirement | Implementation in PulseFit |
|---|---|
| **1. Track Daily Fitness Activities** | • Real-time tracking of **Daily Steps**, **Active Calories**, **Active Workout Time**, **Hydration (Water Intake)**, **Sleep Duration**, and **Weight**.<br>• Dynamic Apple Fitness-style animated **radial progress rings** and goal bars for each metric.<br>• Automatic estimation of step distance in kilometers and step calorie burn based on personal stride length. |
| **2. Manual Logging** | • Dedicated **Log Workout Modal** with Date, Time, Exercise Type (Running, Cycling, Strength, Swimming, HIIT, Yoga, Boxing, Pilates, etc.), Duration (minutes), Intensity (Low, Moderate, High, Extreme), Calories, Distance (km), Heart Rate (bpm), and Notes.<br>• **Smart MET-based Calorie Auto-Calculation**: Automatically estimates calories burned based on exercise type, intensity, duration, and body weight, while allowing manual override.<br>• **Log Daily Metrics Modal** for quickly logging steps, water intake, sleep hours, and body weight.<br>• **Quick-Add Buttons** on the dashboard for instant +250 steps, +1,000 steps, and +250ml water glass. |
| **3. Simple, Clean & Visual UI with Graphs** | • **Dashboard Screen**: Date switcher (navigate past days or pick calendar dates), 4 Hero KPI cards with circular progress rings and animated percentage bars, and Today's workout feed with Edit/Delete controls.<br>• **Weekly & Monthly Analytics Screen**: Switch between 7-Day and 30-Day scopes.<br>• **Interactive SVG Steps Bar Chart**: Mon–Sun step volume with daily goal reference line and hover tooltips.<br>• **Caloric Burn Trend Line & Area Chart**: Smooth gradient spline showing daily energy expenditure over time.<br>• **Workout Category Donut Chart**: Visual distribution of training minutes across exercise categories (Cardio, Strength, Flexibility, Sports, etc.).<br>• **Gamified Badges & Streaks**: Automatic detection of active day streaks and milestone achievements (10K Club, Calorie Crusher, Hydration Hero, 7-Day Champion).<br>• **Dark / Light Theme Toggle**: Seamless transition between high-contrast Dark Mode and clean Light Mode. |
| **4. Flexible Data Storage (SQLite & Firebase)** | • **Local Storage (Default)**: Instant zero-configuration offline persistence in the browser.<br>• **SQLite Relational Engine**: Pre-built relational schema (`workouts`, `daily_metrics`, `user_profile`). Includes an **interactive in-app SQL Query Console** to execute SQL queries directly (`SELECT * FROM workouts ORDER BY calories DESC;`) and an **Export SQLite .sql Dump** button that generates standard SQLite DDL + INSERT statements.<br>• **Firebase Firestore Cloud Sync**: Built-in REST client to sync fitness logs to Google Cloud Firestore with one click without needing server setup.<br>• **JSON Backup & Restore**: Full JSON import/export for data portability.<br>• **Pre-loaded 14-Day Demo Data**: Pre-populated realistic sample data so the dashboard, charts, and streaks look vibrant upon first launch. |

---

## 🚀 How to Run the App

PulseFit has **zero dependencies** and requires no installation. You can launch it using any of the following methods:

### Method 1: Instant Launch (Recommended)
Simply **double-click** either:
- `start.bat` — Launches the app in your default browser.
- `index.html` — Opens directly in Google Chrome, Microsoft Edge, Firefox, or Safari.

### Method 2: Local Web Server (PowerShell)
If you want to run it via HTTP:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```
This opens `http://localhost:8080` in your browser.

---

## 📁 Project Architecture

```
Fitness-tracking-app/
│
├── index.html              # Main Single-Page Application (Dashboard, Analytics, Modals)
├── start.bat               # Windows 1-click launcher script
├── server.ps1              # Zero-dependency PowerShell HTTP server (optional)
├── README.md               # App documentation & features guide
│
├── css/
│   ├── style.css           # Design tokens, themes (dark/light), layout, KPI cards
│   └── components.css      # SVG charts, donut diagram, SQL terminal, badges, toasts, modals
│
└── js/
    ├── bundle.js           # Self-contained unified script (runs offline via file:// and http://)
    ├── models.js           # Exercise definitions, MET formula, BMI/BMR math, demo data generator
    ├── charts.js           # Responsive SVG charting engine (bar chart, spline, donut chart, rings)
    ├── storage.js          # Unified storage provider (LocalStorage, Firebase sync, JSON backup)
    ├── sqlite-helper.js    # SQLite schema DDL, SQL query runner, and .sql dump generator
    └── app.js              # Core UI controller, modals, form bindings, and event orchestration
```

---

## 🗄️ SQLite Database Schema

PulseFit structures your fitness logs into the following relational tables:

```sql
-- User Physical Profile & Goals
CREATE TABLE user_profile (
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

-- Daily Summary Metrics
CREATE TABLE daily_metrics (
    date TEXT PRIMARY KEY,
    steps INTEGER DEFAULT 0,
    water INTEGER DEFAULT 0,
    sleep REAL DEFAULT 0,
    weight REAL,
    notes TEXT,
    updated_at INTEGER
);

-- Individual Workouts Log
CREATE TABLE workouts (
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

CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_workouts_type ON workouts(type);
```

### In-App SQL Console Examples
You can run queries directly inside the **Storage & SQLite** tab:
```sql
-- View top 5 highest calorie workouts
SELECT date, type, duration, calories, intensity FROM workouts ORDER BY calories DESC LIMIT 5;

-- Find all workouts longer than 40 minutes
SELECT date, type, duration, calories FROM workouts WHERE duration >= 40;

-- Inspect schema of any table
PRAGMA table_info(workouts);

-- List all tables
SHOW TABLES;
```

---

## ☁️ Google Firebase Firestore Cloud Sync

To sync your logs to Google Firebase:
1. Go to the **Storage & SQLite** tab in the app.
2. Select **Active Storage Engine: Firebase Firestore**.
3. Enter your **Firebase Project ID** (from your Firebase Console).
4. Optionally enter your **Web API Key**.
5. Click **Sync Now to Cloud** or **Pull from Cloud**.
The app communicates with Firestore via the standard Google REST API, requiring zero Node packages or client SDK builds.

---

## 🧮 Caloric Calculation Engine (MET Standards)

Calories burned during workouts are calculated using the scientific **Metabolic Equivalent of Task (MET)** standard:

$$\text{Calories Burned} = \text{MET} \times \text{Weight (kg)} \times \left(\frac{\text{Duration (min)}}{60}\right) \times \text{Intensity Multiplier}$$

- **Running**: MET 9.8
- **HIIT**: MET 10.5
- **Cycling**: MET 7.5
- **Swimming**: MET 8.0
- **Strength Training**: MET 5.0
- **Walking**: MET 3.8
- **Yoga**: MET 3.0

You can always manually adjust or override the calculated calorie value when adding or editing any workout.

---

## 🎨 Design & Accessibility
- **Apple Fitness & Strava Inspired**: Crisp typography, vibrant accents, dark mode by default, glassmorphic cards.
- **Pure Vector SVG Graphics**: Charts and rings scale crisply on 4K monitors, laptops, tablets, and phones.
- **Offline First**: All dependencies and charts are 100% self-contained with no external CDN or server requirement.
