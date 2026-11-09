/**
 * charts.js - Lightweight, Zero-Dependency Interactive SVG & Canvas Visualizations
 * Renders Crisp Progress Rings, Weekly Step Bar Charts, Calorie Trend Lines & Donut Breakdowns
 */

import { EXERCISE_TYPES } from './models.js';

export class FitnessCharts {
    /**
     * Render Circular Progress Ring in an SVG element
     */
    static renderProgressRing(svgEl, percent, color = '#10B981', strokeWidth = 10) {
        if (!svgEl) return;
        const boundedPercent = Math.min(Math.max(percent, 0), 100);
        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (boundedPercent / 100) * circumference;

        svgEl.innerHTML = `
            <circle
                cx="50" cy="50" r="${radius}"
                fill="transparent"
                stroke="currentColor"
                stroke-width="${strokeWidth}"
                class="ring-bg"
            />
            <circle
                cx="50" cy="50" r="${radius}"
                fill="transparent"
                stroke="${color}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
                transform="rotate(-90 50 50)"
                style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
            />
        `;
    }

    /**
     * Render Weekly Steps Bar Chart into a container
     */
    static renderStepsBarChart(container, daysData, stepGoal = 10000) {
        if (!container) return;
        if (!daysData || daysData.length === 0) {
            container.innerHTML = '<div class="chart-empty">No steps data available for this range.</div>';
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
                <g class="bar-group" data-tooltip="${item.label}: ${steps.toLocaleString()} steps (${item.distance || 0} km)">
                    <rect
                        x="${x}" y="${y}"
                        width="${barWidth}" height="${barHeight}"
                        rx="6" ry="6"
                        fill="${barColor}"
                        class="chart-bar"
                    />
                    <text x="${x + barWidth / 2}" y="${chartHeight - 8}" text-anchor="middle" class="chart-label">
                        ${item.dayName}
                    </text>
                    <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" class="chart-val-label">
                        ${steps > 0 ? (steps > 999 ? (steps / 1000).toFixed(1) + 'k' : steps) : ''}
                    </text>
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
                <!-- Goal Reference Line -->
                <line x1="10" y1="${goalY}" x2="${chartWidth - 10}" y2="${goalY}" stroke="#F59E0B" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.75" />
                <text x="${chartWidth - 12}" y="${goalY - 4}" text-anchor="end" class="chart-goal-label">Goal ${stepGoal / 1000}k</text>
                ${barsSvg}
            </svg>
        `;
    }

    /**
     * Render Calories Burn Trend Line & Area Chart
     */
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

        // Build SVG path
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
                <!-- Horizontal Grid Lines -->
                <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="currentColor" opacity="0.1" />
                <line x1="${padX}" y1="${goalY}" x2="${w - padX}" y2="${goalY}" stroke="#F59E0B" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.75" />
                <text x="${w - padX}" y="${goalY - 4}" text-anchor="end" class="chart-goal-label">Goal ${calorieGoal} kcal</text>
                <!-- Area Fill -->
                <path d="${areaD}" fill="url(#calAreaGrad)" />
                <!-- Line -->
                <path d="${lineD}" fill="none" stroke="#FF5722" stroke-width="3" stroke-linecap="round" />
                ${dotsSvg}
            </svg>
        `;
    }

    /**
     * Render Workout Type Breakdown Donut Chart
     */
    static renderWorkoutDonutChart(container, workouts) {
        if (!container) return;
        if (!workouts || workouts.length === 0) {
            container.innerHTML = '<div class="chart-empty">No workouts logged yet. Log your first workout to see category breakdowns!</div>';
            return;
        }

        // Aggregate by type
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

        // Build SVG Donut slices
        const radius = 55;
        const circumference = 2 * Math.PI * radius;
        let cumulativePercent = 0;
        let pathsSvg = '';

        slices.forEach(slice => {
            const strokeDash = (slice.percent / 100) * circumference;
            const strokeOffset = circumference - (cumulativePercent / 100) * circumference;
            cumulativePercent += slice.percent;

            pathsSvg += `
                <circle
                    cx="80" cy="80" r="${radius}"
                    fill="transparent"
                    stroke="${slice.color}"
                    stroke-width="22"
                    stroke-dasharray="${strokeDash} ${circumference}"
                    stroke-dashoffset="${strokeOffset}"
                    transform="rotate(-90 80 80)"
                    class="donut-segment"
                />
            `;
        });

        // Build Legend
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
