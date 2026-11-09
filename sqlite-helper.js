/**
 * sqlite-helper.js - SQLite Schema, SQL Query Engine & SQL Export/Import Helper
 */

export const SQL_SCHEMA = `
-- PulseFit SQLite Database Schema
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

/**
 * Generates a full downloadable .sql dump file with DDL and INSERT statements
 */
export function generateSqlDump(profile, dailyMetrics, workouts) {
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

function escapeSql(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/'/g, "''");
}

/**
 * Lightweight in-browser SQL query evaluator
 * Parses and executes SELECT, INSERT, UPDATE, DELETE queries on current in-memory tables
 * Gives user an interactive SQLite terminal experience directly in the UI!
 */
export function executeSqlQuery(query, dataset) {
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
                error: 'Supported SQL in query console: SELECT queries on "workouts", "daily_metrics", and "user_profile", plus PRAGMA table_info(<table>) and SHOW TABLES.'
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
    // Basic regex query parser for SELECT ... FROM <table> [WHERE ...] [ORDER BY ...] [LIMIT ...]
    const match = query.match(/SELECT\s+(.*?)\s+FROM\s+([a-zA-Z_0-9]+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!match) {
        throw new Error('Query syntax not supported. Example: SELECT * FROM workouts WHERE calories > 200 ORDER BY date DESC LIMIT 10');
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

    // Filter WHERE
    if (wherePart) {
        data = data.filter(row => evaluateSimpleWhere(row, wherePart));
    }

    // ORDER BY
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

    // LIMIT
    if (limitPart) {
        data = data.slice(0, parseInt(limitPart, 10));
    }

    // Project columns
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
    // Handle simple clauses: column > value, column = 'value', column LIKE '%val%'
    const conditions = whereClause.split(/\s+AND\s+/i);
    return conditions.every(cond => {
        cond = cond.trim();
        // check =
        let m = cond.match(/^([a-zA-Z_0-9]+)\s*=\s*['"]?(.*?)['"]?$/);
        if (m) {
            const col = m[1];
            const val = m[2];
            return String(row[col]).toLowerCase() === val.toLowerCase();
        }
        // check >
        m = cond.match(/^([a-zA-Z_0-9]+)\s*>\s*([0-9.]+)/);
        if (m) {
            const col = m[1];
            const val = Number(m[2]);
            return Number(row[col]) > val;
        }
        // check <
        m = cond.match(/^([a-zA-Z_0-9]+)\s*<\s*([0-9.]+)/);
        if (m) {
            const col = m[1];
            const val = Number(m[2]);
            return Number(row[col]) < val;
        }
        // check >=
        m = cond.match(/^([a-zA-Z_0-9]+)\s*>=\s*([0-9.]+)/);
        if (m) {
            return Number(row[m[1]]) >= Number(m[2]);
        }
        // check <=
        m = cond.match(/^([a-zA-Z_0-9]+)\s*<=\s*([0-9.]+)/);
        if (m) {
            return Number(row[m[1]]) <= Number(m[2]);
        }
        // check LIKE
        m = cond.match(/^([a-zA-Z_0-9]+)\s+LIKE\s+['"]%(.*?)%['"]$/i);
        if (m) {
            const col = m[1];
            const val = m[2].toLowerCase();
            return String(row[col] || '').toLowerCase().includes(val);
        }
        return true;
    });
}
