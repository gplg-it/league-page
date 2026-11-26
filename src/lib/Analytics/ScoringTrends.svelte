<script>
    import { getTeamFromManagerID } from '$lib/utils/helperFunctions/universalFunctions';
    import { round } from '$lib/utils/helper';

    let {scoringTrends, leagueTeamManagers, allSeasons} = $props();

    let selectedYear = $state(null);

    $effect(() => {
        if(allSeasons?.length && !selectedYear) {
            selectedYear = allSeasons[0].year;
        }
    });

    let availableYears = $derived(allSeasons?.map(s => s.year).sort((a, b) => b - a) || []);

    let weeklyData = $derived(scoringTrends?.leagueAverageByWeek?.[selectedYear] || []);

    let maxScore = $derived(Math.max(...weeklyData.map(w => parseFloat(w.high)), 1));
    let minScore = $derived(Math.min(...weeklyData.map(w => parseFloat(w.low)), 0));

    let managerIDs = $derived(Object.keys(scoringTrends?.rosterTrends || {}));

    let selectedRoster = $state(null);

    let rosterWeekly = $derived.by(() => {
        if(!selectedRoster || !scoringTrends?.rosterTrends?.[selectedRoster]?.[selectedYear]) return [];
        return scoringTrends.rosterTrends[selectedRoster][selectedYear];
    });

    let hoveredWeek = $state(null);

    const chartW = 700;
    const chartH = 280;
    const pad = { top: 20, right: 20, bottom: 35, left: 50 };
    const plotW = chartW - pad.left - pad.right;
    const plotH = chartH - pad.top - pad.bottom;

    let yMin = $derived(Math.floor(minScore / 10) * 10);
    let yMax = $derived(Math.ceil(maxScore / 10) * 10 + 10);

    const scaleX = (i, total) => pad.left + (i / Math.max(total - 1, 1)) * plotW;
    const scaleY = (val) => pad.top + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

    let areaPath = $derived.by(() => {
        if(!weeklyData.length) return '';
        const pts = weeklyData.map((w, i) => ({
            x: scaleX(i, weeklyData.length),
            yHigh: scaleY(parseFloat(w.high)),
            yLow: scaleY(parseFloat(w.low)),
        }));
        const top = pts.map(p => `${p.x},${p.yHigh}`).join(' L');
        const bottom = [...pts].reverse().map(p => `${p.x},${p.yLow}`).join(' L');
        return `M${top} L${bottom} Z`;
    });

    let avgLine = $derived.by(() => {
        if(!weeklyData.length) return '';
        return weeklyData.map((w, i) => {
            const x = scaleX(i, weeklyData.length);
            const y = scaleY(parseFloat(w.avg));
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        }).join(' ');
    });

    let rosterLine = $derived.by(() => {
        if(!rosterWeekly.length || !weeklyData.length) return '';
        const weekMap = {};
        rosterWeekly.forEach(r => { weekMap[r.week] = r.points; });
        return weeklyData.map((w, i) => {
            const x = scaleX(i, weeklyData.length);
            const pts = weekMap[w.week];
            if(pts === undefined) return null;
            const y = scaleY(pts);
            return { x, y };
        }).filter(Boolean).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    });

    let yTicks = $derived.by(() => {
        const ticks = [];
        for(let v = yMin; v <= yMax; v += 20) {
            ticks.push(v);
        }
        return ticks;
    });

    const getHoverData = (week) => {
        if(!week) return null;
        const rw = rosterWeekly.find(r => r.week === week.week);
        return { ...week, rosterPts: rw?.points };
    };
</script>

<style>
    .statsSection {
        margin: 2em auto;
        max-width: 1200px;
    }

    h2 {
        font-size: 1.5em;
        margin: 1.5em 0 0.5em;
        text-align: center;
    }

    .description {
        text-align: center;
        font-size: 0.85em;
        color: #888;
        margin: 0 0 1.5em;
        font-style: italic;
    }

    .controls {
        display: flex;
        justify-content: center;
        gap: 1em;
        margin: 1em 0;
        flex-wrap: wrap;
    }

    select {
        padding: 8px 12px;
        border: 1px solid var(--eee);
        border-radius: 6px;
        font-size: 0.9em;
        background: var(--f3f3f3);
        color: inherit;
    }

    .statCards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin: 1.5em 0;
    }

    .statCard {
        border: 1px solid var(--eee);
        border-radius: 8px;
        padding: 0.8em 1em;
        text-align: center;
        background: var(--fff);
    }

    .statCard .value {
        font-size: 1.6em;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .statCard .value.blue { color: #4a90d9; }
    .statCard .value.green { color: #4caf50; }
    .statCard .value.red { color: #f44336; }
    .statCard .value.orange { color: #e8a838; }

    .statCard .label {
        font-size: 0.72em;
        color: #888;
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    /* ---- SVG Chart ---- */
    .chartContainer {
        max-width: 740px;
        margin: 2em auto;
        overflow-x: auto;
    }

    .svgChart {
        width: 100%;
        height: auto;
    }

    .gridLine {
        stroke: var(--eee);
        stroke-width: 1;
        stroke-dasharray: 4 4;
    }

    .axisLabel {
        fill: #888;
        font-size: 10px;
        font-variant-numeric: tabular-nums;
    }

    .areaFill {
        fill: rgba(74, 144, 217, 0.12);
    }

    .avgLinePath {
        fill: none;
        stroke: #4a90d9;
        stroke-width: 2.5;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    .rosterLinePath {
        fill: none;
        stroke: #ff6b35;
        stroke-width: 2.5;
        stroke-linejoin: round;
        stroke-linecap: round;
        stroke-dasharray: 6 4;
    }

    .dotAvg {
        fill: #4a90d9;
        cursor: pointer;
        transition: r 0.15s;
    }

    .dotAvg:hover { r: 5; }

    .dotRoster {
        fill: #ff6b35;
        stroke: #fff;
        stroke-width: 1.5;
        cursor: pointer;
        transition: r 0.15s;
    }

    .dotRoster:hover { r: 6; }

    .hoverCol {
        fill: transparent;
        cursor: crosshair;
    }

    /* ---- Tooltip ---- */
    .tooltip {
        position: absolute;
        background: var(--g333);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.78em;
        pointer-events: none;
        z-index: 10;
        white-space: nowrap;
        line-height: 1.5;
    }

    .tooltip .ttRow {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .tooltip .ttDot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    /* ---- Legend ---- */
    .legend {
        display: flex;
        justify-content: center;
        gap: 2em;
        margin: 0.5em 0 1em;
        font-size: 0.82em;
    }

    .legendItem {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .legendSwatch {
        width: 14px;
        height: 14px;
        border-radius: 3px;
    }

    /* ---- CSS Bar Fallback ---- */
    .barChart {
        margin: 2em auto;
        max-width: 740px;
    }

    .chartRow {
        display: flex;
        align-items: center;
        margin: 3px 0;
        font-size: 0.85em;
    }

    .weekLabel {
        width: 50px;
        text-align: right;
        padding-right: 8px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
    }

    .chartBar {
        flex: 1;
        position: relative;
        height: 28px;
        background: var(--eee);
        border-radius: 4px;
        overflow: hidden;
    }

    .rangeBar {
        position: absolute;
        top: 3px;
        bottom: 3px;
        background: rgba(74, 144, 217, 0.15);
        border-radius: 3px;
    }

    .avgMark {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #4a90d9;
        border-radius: 2px;
    }

    .rosterDot {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff6b35;
        border: 2px solid #fff;
        z-index: 2;
    }

    .chartValues {
        width: 50px;
        padding-left: 8px;
        font-size: 0.8em;
        color: #888;
        font-variant-numeric: tabular-nums;
        text-align: right;
    }

    @media (max-width: 540px) {
        .statCards {
            grid-template-columns: repeat(2, 1fr);
        }
        .weekLabel { width: 36px; font-size: 0.78em; }
    }
</style>

<div class="statsSection">
    <h2>Scoring Trends</h2>
    <p class="description">Weekly league scoring patterns showing high, low, and average performance by week</p>

    <div class="controls">
        <select bind:value={selectedYear}>
            {#each availableYears as year}
                <option value={year}>{year} Season</option>
            {/each}
        </select>
        <select bind:value={selectedRoster}>
            <option value={null}>Compare Team...</option>
            {#each managerIDs as mID}
                {@const team = getTeamFromManagerID(leagueTeamManagers, mID)}
                <option value={mID}>{team?.name || mID}</option>
            {/each}
        </select>
    </div>

    {#if weeklyData.length > 0}
        {@const seasonAvg = round(weeklyData.reduce((s, w) => s + parseFloat(w.avg), 0) / weeklyData.length)}
        {@const seasonHigh = round(Math.max(...weeklyData.map(w => parseFloat(w.high))))}
        {@const seasonLow = round(Math.min(...weeklyData.map(w => parseFloat(w.low))))}
        {@const avgSpread = round(weeklyData.reduce((s, w) => s + parseFloat(w.spread), 0) / weeklyData.length)}

        <div class="statCards">
            <div class="statCard">
                <div class="value blue">{seasonAvg}</div>
                <div class="label">Season Avg</div>
            </div>
            <div class="statCard">
                <div class="value green">{seasonHigh}</div>
                <div class="label">Season High</div>
            </div>
            <div class="statCard">
                <div class="value red">{seasonLow}</div>
                <div class="label">Season Low</div>
            </div>
            <div class="statCard">
                <div class="value orange">{avgSpread}</div>
                <div class="label">Avg Spread</div>
            </div>
        </div>

        <div class="legend">
            <div class="legendItem">
                <div class="legendSwatch" style="background: rgba(74, 144, 217, 0.15); border: 1px solid #4a90d9;"></div>
                <span>Score Range</span>
            </div>
            <div class="legendItem">
                <div class="legendSwatch" style="background: #4a90d9;"></div>
                <span>League Avg</span>
            </div>
            {#if selectedRoster}
                <div class="legendItem">
                    <div class="legendSwatch" style="background: #ff6b35; border-radius: 50%;"></div>
                    <span>Selected Team</span>
                </div>
            {/if}
        </div>

        <div class="chartContainer" style="position: relative;">
            <svg class="svgChart" viewBox="0 0 {chartW} {chartH}">
                {#each yTicks as tick}
                    <line class="gridLine" x1={pad.left} y1={scaleY(tick)} x2={chartW - pad.right} y2={scaleY(tick)} />
                    <text class="axisLabel" x={pad.left - 6} y={scaleY(tick) + 3} text-anchor="end">{tick}</text>
                {/each}

                {#each weeklyData as week, i}
                    <text class="axisLabel" x={scaleX(i, weeklyData.length)} y={chartH - 8} text-anchor="middle">
                        {week.week}
                    </text>
                {/each}
                <text class="axisLabel" x={chartW / 2} y={chartH} text-anchor="middle" font-size="11">Week</text>

                <path d={areaPath} class="areaFill" />
                <path d={avgLine} class="avgLinePath" />
                {#if rosterLine}
                    <path d={rosterLine} class="rosterLinePath" />
                {/if}

                {#each weeklyData as week, i}
                    {@const x = scaleX(i, weeklyData.length)}
                    {@const yAvg = scaleY(parseFloat(week.avg))}
                    <circle class="dotAvg" cx={x} cy={yAvg} r="3.5"
                        onmouseenter={() => hoveredWeek = week}
                        onmouseleave={() => hoveredWeek = null} />
                {/each}

                {#if rosterWeekly.length > 0}
                    {#each weeklyData as week, i}
                        {@const rw = rosterWeekly.find(r => r.week === week.week)}
                        {#if rw}
                            {@const x = scaleX(i, weeklyData.length)}
                            {@const y = scaleY(rw.points)}
                            <circle class="dotRoster" cx={x} cy={y} r="4" />
                        {/if}
                    {/each}
                {/if}
            </svg>

            {#if hoveredWeek}
                {@const hd = getHoverData(hoveredWeek)}
                {@const idx = weeklyData.indexOf(hoveredWeek)}
                {@const tx = scaleX(idx, weeklyData.length)}
                <div class="tooltip" style="left: {tx}px; top: 0px; transform: translateX(-50%);">
                    <strong>Week {hd.week}</strong>
                    <div class="ttRow"><div class="ttDot" style="background:#4a90d9"></div> Avg: {hd.avg}</div>
                    <div class="ttRow"><div class="ttDot" style="background:rgba(74,144,217,0.3)"></div> Range: {hd.low} - {hd.high}</div>
                    {#if hd.rosterPts !== undefined}
                        <div class="ttRow"><div class="ttDot" style="background:#ff6b35"></div> Team: {hd.rosterPts.toFixed(1)}</div>
                    {/if}
                </div>
            {/if}
        </div>

        <h2 style="font-size: 1.2em; margin-top: 2em;">Week-by-Week Detail</h2>
        <div class="barChart">
            {#each weeklyData as week}
                {@const lowPct = parseFloat(week.low) / maxScore * 100}
                {@const highPct = parseFloat(week.high) / maxScore * 100}
                {@const avgPct = parseFloat(week.avg) / maxScore * 100}
                {@const rosterWeek = rosterWeekly.find(r => r.week === week.week)}
                {@const rosterPct = rosterWeek ? rosterWeek.points / maxScore * 100 : 0}
                <div class="chartRow">
                    <div class="weekLabel">Wk {week.week}</div>
                    <div class="chartBar">
                        <div class="rangeBar" style="left: {lowPct}%; right: {100 - highPct}%"></div>
                        <div class="avgMark" style="left: {avgPct}%"></div>
                        {#if rosterWeek}
                            <div class="rosterDot" style="left: {rosterPct}%"></div>
                        {/if}
                    </div>
                    <div class="chartValues">{week.avg}</div>
                </div>
            {/each}
        </div>
    {:else}
        <p style="text-align: center; color: #888;">No scoring data available for this season.</p>
    {/if}
</div>
