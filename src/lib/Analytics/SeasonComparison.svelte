<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromManagerID } from '$lib/utils/helperFunctions/universalFunctions';

    let {managerAnalytics, leagueTeamManagers, allSeasons} = $props();

    const PALETTE = ['#4a90d9','#5bb974','#e8a838','#d94a4a','#9b59b6','#1abc9c','#e67e22','#3498db','#c0392b','#27ae60','#8e44ad','#f39c12'];

    let selectedRoster = $state(null);
    let compareAll = $state(false);
    let visibleManagers = $state({});
    let tooltip = $state(null);

    let managerIDs = $derived(Object.keys(managerAnalytics || {}));

    $effect(() => {
        if(managerIDs.length && !selectedRoster) {
            selectedRoster = managerIDs[0];
        }
    });

    $effect(() => {
        if(managerIDs.length && Object.keys(visibleManagers).length === 0) {
            const init = {};
            managerIDs.forEach(id => init[id] = true);
            visibleManagers = init;
        }
    });

    const getManagerName = (managerID) => {
        const team = getTeamFromManagerID(leagueTeamManagers, managerID);
        return team?.name || `Manager ${managerID}`;
    };

    const getManagerColor = (managerID) => {
        const idx = managerIDs.indexOf(managerID);
        return PALETTE[idx % PALETTE.length];
    };

    let allYears = $derived.by(() => {
        if(!managerAnalytics) return [];
        const years = new Set();
        for(const mID of managerIDs) {
            const breakdowns = managerAnalytics[mID]?.seasonBreakdowns;
            if(breakdowns) Object.keys(breakdowns).forEach(y => years.add(parseInt(y)));
        }
        return [...years].sort((a, b) => a - b);
    });

    let chartData = $derived.by(() => {
        if(!managerAnalytics || !allYears.length) return [];
        return managerIDs.map(mID => {
            const breakdowns = managerAnalytics[mID]?.seasonBreakdowns || {};
            const points = allYears.map(year => {
                const s = breakdowns[year];
                return s ? { year, avg: parseFloat(s.avgPoints), games: s.gamesPlayed, total: s.totalPoints, best: s.bestWeek, worst: s.worstWeek } : null;
            });
            return { managerID: mID, points };
        });
    });

    let chartYRange = $derived.by(() => {
        let min = Infinity, max = -Infinity;
        for(const mgr of chartData) {
            if(!visibleManagers[mgr.managerID] && compareAll) continue;
            if(!compareAll && mgr.managerID !== selectedRoster) continue;
            for(const p of mgr.points) {
                if(!p) continue;
                if(p.avg < min) min = p.avg;
                if(p.avg > max) max = p.avg;
            }
        }
        if(min === Infinity) return { min: 0, max: 100 };
        const pad = (max - min) * 0.15 || 10;
        return { min: Math.floor((min - pad) / 10) * 10, max: Math.ceil((max + pad) / 10) * 10 };
    });

    const CHART_W = 760;
    const CHART_H = 340;
    const PAD = { top: 20, right: 30, bottom: 40, left: 55 };
    const plotW = CHART_W - PAD.left - PAD.right;
    const plotH = CHART_H - PAD.top - PAD.bottom;

    const xPos = (year) => {
        if(allYears.length <= 1) return PAD.left + plotW / 2;
        const idx = allYears.indexOf(year);
        return PAD.left + (idx / (allYears.length - 1)) * plotW;
    };

    const yPos = (val) => {
        const { min, max } = chartYRange;
        const range = max - min || 1;
        return PAD.top + plotH - ((val - min) / range) * plotH;
    };

    let yTicks = $derived.by(() => {
        const { min, max } = chartYRange;
        const step = max - min > 60 ? 20 : 10;
        const ticks = [];
        for(let v = min; v <= max; v += step) ticks.push(v);
        return ticks;
    });

    const buildPath = (points) => {
        const valid = points.filter(p => p !== null);
        if(valid.length < 2) return '';
        return valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${xPos(p.year).toFixed(1)},${yPos(p.avg).toFixed(1)}`).join(' ');
    };

    let seasonData = $derived.by(() => {
        if(!selectedRoster || !managerAnalytics?.[selectedRoster]?.seasonBreakdowns) return [];
        const breakdowns = managerAnalytics[selectedRoster].seasonBreakdowns;
        return Object.entries(breakdowns)
            .map(([year, data]) => ({year: parseInt(year), ...data}))
            .sort((a, b) => b.year - a.year);
    });

    let maxAvg = $derived(Math.max(...seasonData.map(s => parseFloat(s.avgPoints)), 1));

    let careerSummary = $derived.by(() => {
        if(!seasonData.length) return null;
        const sorted = [...seasonData].sort((a, b) => parseFloat(b.avgPoints) - parseFloat(a.avgPoints));
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        const totalPts = seasonData.reduce((s, d) => s + parseFloat(d.totalPoints || 0), 0);
        const chronological = [...seasonData].sort((a, b) => a.year - b.year);
        let trend = 'Stable';
        if(chronological.length >= 2) {
            const n = chronological.length;
            const xs = chronological.map((_, i) => i);
            const ys = chronological.map(s => parseFloat(s.avgPoints));
            const xMean = xs.reduce((a, b) => a + b, 0) / n;
            const yMean = ys.reduce((a, b) => a + b, 0) / n;
            let num = 0, den = 0;
            for(let i = 0; i < n; i++) {
                num += (xs[i] - xMean) * (ys[i] - yMean);
                den += (xs[i] - xMean) ** 2;
            }
            const slope = den ? num / den : 0;
            if(slope > 1.5) trend = 'Improving';
            else if(slope < -1.5) trend = 'Declining';
        }
        return { best, worst, totalPts: totalPts.toFixed(1), trend, seasons: seasonData.length };
    });

    const getSeasonDelta = (seasonArr, idx) => {
        if(idx >= seasonArr.length - 1) return null;
        const curr = parseFloat(seasonArr[idx].avgPoints);
        const prev = parseFloat(seasonArr[idx + 1].avgPoints);
        return (curr - prev).toFixed(1);
    };

    const toggleManager = (mID) => {
        visibleManagers = { ...visibleManagers, [mID]: !visibleManagers[mID] };
    };

    const showTooltip = (managerID, point, evt) => {
        const svgEl = evt.target.closest('svg');
        if(!svgEl) return;
        tooltip = { managerID, ...point, x: xPos(point.year), y: yPos(point.avg) };
    };

    const hideTooltip = () => { tooltip = null; };
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
        align-items: center;
    }

    select {
        padding: 8px 12px;
        border: 1px solid var(--eee);
        border-radius: 6px;
        font-size: 0.9em;
        background: var(--f3f3f3);
        color: inherit;
    }

    .compareToggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85em;
        cursor: pointer;
    }

    .compareToggle input {
        accent-color: #920505;
    }

    .chartContainer {
        max-width: 800px;
        margin: 1.5em auto;
        position: relative;
    }

    svg.lineChart {
        width: 100%;
        height: auto;
        display: block;
    }

    .gridLine {
        stroke: var(--eee);
        stroke-width: 1;
        stroke-dasharray: 4,4;
    }

    .axisLabel {
        fill: #888;
        font-size: 11px;
    }

    .axisLabelY {
        fill: #888;
        font-size: 11px;
        text-anchor: end;
    }

    .chartLine {
        fill: none;
        stroke-width: 2.5;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    .chartDot {
        cursor: pointer;
        transition: r 0.15s ease;
    }

    .chartDot:hover {
        r: 7;
    }

    .tooltipBox {
        position: absolute;
        pointer-events: none;
        background: rgba(30, 30, 30, 0.92);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.78em;
        line-height: 1.5;
        white-space: nowrap;
        z-index: 10;
        transform: translate(-50%, -110%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .tooltipBox::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: rgba(30, 30, 30, 0.92);
    }

    .managerToggles {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px 12px;
        margin: 1em 0;
        font-size: 0.8em;
    }

    .mgrToggle {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        opacity: 1;
        transition: opacity 0.2s;
    }

    .mgrToggle.dimmed {
        opacity: 0.4;
    }

    .mgrSwatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .summaryCards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1em;
        margin: 2em auto;
        max-width: 700px;
    }

    .summaryCard {
        background: linear-gradient(135deg, var(--f3f3f3), var(--fff));
        border: 1px solid var(--eee);
        border-radius: 10px;
        padding: 1em;
        text-align: center;
        backdrop-filter: blur(4px);
    }

    .summaryCard .cardValue {
        font-size: 1.5em;
        font-weight: 700;
        color: #920505;
    }

    .summaryCard .cardLabel {
        font-size: 0.75em;
        color: #888;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .summaryCard .cardSub {
        font-size: 0.8em;
        color: #666;
        margin-top: 2px;
    }

    .trendBadge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.75em;
        font-weight: 600;
    }

    .trendBadge.improving { background: rgba(76,175,80,0.15); color: #4caf50; }
    .trendBadge.declining { background: rgba(244,67,54,0.15); color: #f44336; }
    .trendBadge.stable { background: rgba(158,158,158,0.15); color: #888; }

    .tableHolder {
        max-width: 100%;
        overflow-x: auto;
        margin: 1em 0 2em;
    }

    .trendChart {
        max-width: 700px;
        margin: 2em auto;
    }

    .trendRow {
        display: flex;
        align-items: center;
        margin: 6px 0;
        font-size: 0.85em;
    }

    .trendLabel {
        width: 60px;
        text-align: right;
        padding-right: 10px;
        font-weight: 600;
    }

    .trendBarTrack {
        flex: 1;
        height: 32px;
        background: var(--eee);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }

    .trendBarFill {
        height: 100%;
        border-radius: 4px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        color: #fff;
        font-weight: 600;
        font-size: 0.9em;
        transition: width 0.3s ease;
    }

    .trendValue {
        width: 60px;
        text-align: right;
        padding-left: 8px;
        font-weight: 500;
    }

    .deltaIndicator {
        width: 60px;
        font-size: 0.78em;
        font-weight: 600;
        text-align: center;
    }

    .deltaIndicator.up { color: #4caf50; }
    .deltaIndicator.down { color: #f44336; }
    .deltaIndicator.flat { color: #888; }

    @media (max-width: 540px) {
        .summaryCards {
            grid-template-columns: repeat(2, 1fr);
        }
        .summaryCard .cardValue {
            font-size: 1.2em;
        }
        .managerToggles {
            gap: 4px 8px;
        }
        .trendLabel { width: 44px; font-size: 0.8em; }
        .trendValue { width: 40px; font-size: 0.8em; }
        .deltaIndicator { width: 48px; font-size: 0.7em; }
    }
</style>

<div class="statsSection">
    <h2>Season-over-Season Comparison</h2>
    <p class="description">Track how each team's performance has evolved across seasons</p>

    <div class="controls">
        <select bind:value={selectedRoster}>
            {#each managerIDs as mID}
                {@const team = getTeamFromManagerID(leagueTeamManagers, mID)}
                <option value={mID}>{team?.name || mID}</option>
            {/each}
        </select>
        <label class="compareToggle">
            <input type="checkbox" bind:checked={compareAll} />
            Compare All Managers
        </label>
    </div>

    {#if allYears.length > 0 && chartData.length > 0}
        <div class="chartContainer">
            <svg class="lineChart" viewBox="0 0 {CHART_W} {CHART_H}" preserveAspectRatio="xMidYMid meet">
                {#each yTicks as tick}
                    <line class="gridLine" x1={PAD.left} x2={CHART_W - PAD.right} y1={yPos(tick)} y2={yPos(tick)} />
                    <text class="axisLabelY" x={PAD.left - 8} y={yPos(tick) + 4}>{tick}</text>
                {/each}

                <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="#ccc" stroke-width="1" />
                <line x1={PAD.left} x2={CHART_W - PAD.right} y1={CHART_H - PAD.bottom} y2={CHART_H - PAD.bottom} stroke="#ccc" stroke-width="1" />

                {#each allYears as year}
                    <text class="axisLabel" x={xPos(year)} y={CHART_H - PAD.bottom + 18} text-anchor="middle">{year}</text>
                {/each}

                <text class="axisLabel" x={PAD.left - 40} y={PAD.top + plotH / 2} text-anchor="middle" transform="rotate(-90, {PAD.left - 40}, {PAD.top + plotH / 2})">Avg Points</text>

                {#each chartData as mgr}
                    {#if compareAll ? visibleManagers[mgr.managerID] : mgr.managerID === selectedRoster}
                        {@const color = getManagerColor(mgr.managerID)}
                        <path class="chartLine" d={buildPath(mgr.points)} stroke={color} />
                        {#each mgr.points as point}
                            {#if point}
                                <circle
                                    class="chartDot"
                                    cx={xPos(point.year)}
                                    cy={yPos(point.avg)}
                                    r="4.5"
                                    fill={color}
                                    stroke="#fff"
                                    stroke-width="2"
                                    onmouseenter={(e) => showTooltip(mgr.managerID, point, e)}
                                    onmouseleave={hideTooltip}
                                />
                            {/if}
                        {/each}
                    {/if}
                {/each}
            </svg>

            {#if tooltip}
                {@const pctX = ((tooltip.x / CHART_W) * 100)}
                {@const pctY = ((tooltip.y / CHART_H) * 100)}
                <div class="tooltipBox" style="left: {pctX}%; top: {pctY}%;">
                    <strong>{getManagerName(tooltip.managerID)}</strong><br/>
                    {tooltip.year}: <strong>{tooltip.avg.toFixed(1)}</strong> avg<br/>
                    {tooltip.games}g &middot; Best: {tooltip.best} &middot; Worst: {tooltip.worst}
                </div>
            {/if}
        </div>

        {#if compareAll}
            <div class="managerToggles">
                {#each managerIDs as mID}
                    <span class="mgrToggle" class:dimmed={!visibleManagers[mID]} onclick={() => toggleManager(mID)}>
                        <span class="mgrSwatch" style="background: {getManagerColor(mID)};"></span>
                        {getManagerName(mID)}
                    </span>
                {/each}
            </div>
        {/if}
    {/if}

    {#if careerSummary && !compareAll}
        <div class="summaryCards">
            <div class="summaryCard">
                <div class="cardValue">{careerSummary.best.avgPoints}</div>
                <div class="cardLabel">Best Season</div>
                <div class="cardSub">{careerSummary.best.year}</div>
            </div>
            <div class="summaryCard">
                <div class="cardValue">{careerSummary.worst.avgPoints}</div>
                <div class="cardLabel">Worst Season</div>
                <div class="cardSub">{careerSummary.worst.year}</div>
            </div>
            <div class="summaryCard">
                <div class="cardValue">{careerSummary.totalPts}</div>
                <div class="cardLabel">Career Points</div>
                <div class="cardSub">{careerSummary.seasons} seasons</div>
            </div>
            <div class="summaryCard">
                <span class="trendBadge" class:improving={careerSummary.trend === 'Improving'} class:declining={careerSummary.trend === 'Declining'} class:stable={careerSummary.trend === 'Stable'}>
                    {careerSummary.trend === 'Improving' ? '&#9650;' : careerSummary.trend === 'Declining' ? '&#9660;' : '&#9654;'}
                    {careerSummary.trend}
                </span>
                <div class="cardLabel" style="margin-top: 8px;">Career Trend</div>
            </div>
        </div>
    {/if}

    {#if seasonData.length > 0 && !compareAll}
        <h2 style="font-size: 1.2em; margin-top: 2em;">Season Bars</h2>
        <div class="trendChart">
            {#each seasonData as season, i}
                {@const pct = parseFloat(season.avgPoints) / maxAvg * 90}
                {@const colors = ['#4a90d9','#5bb974','#e8a838','#d94a4a','#9b59b6','#1abc9c','#e67e22','#3498db']}
                {@const delta = getSeasonDelta(seasonData, i)}
                <div class="trendRow">
                    <div class="trendLabel">{season.year}</div>
                    <div class="trendBarTrack">
                        <div class="trendBarFill" style="width: {pct}%; background: {colors[i % colors.length]};">
                            {season.avgPoints}
                        </div>
                    </div>
                    {#if delta !== null}
                        <div class="deltaIndicator" class:up={parseFloat(delta) > 0} class:down={parseFloat(delta) < 0} class:flat={parseFloat(delta) === 0}>
                            {parseFloat(delta) > 0 ? '&#9650;' : parseFloat(delta) < 0 ? '&#9660;' : '&#9654;'}
                            {parseFloat(delta) > 0 ? '+' : ''}{delta}
                        </div>
                    {:else}
                        <div class="deltaIndicator flat">&mdash;</div>
                    {/if}
                    <div class="trendValue">{season.gamesPlayed}g</div>
                </div>
            {/each}
        </div>

        <div class="tableHolder">
            <DataTable table$aria-label="Season Comparison">
                <Head>
                    <Row>
                        <Cell class="center">Season</Cell>
                        <Cell class="center">Games</Cell>
                        <Cell class="center">Avg Pts</Cell>
                        <Cell class="center">Total Pts</Cell>
                        <Cell class="center">Best Week</Cell>
                        <Cell class="center">Worst Week</Cell>
                        <Cell class="center">Std Dev</Cell>
                    </Row>
                </Head>
                <Body>
                    {#each seasonData as season}
                        <Row>
                            <Cell class="center">{season.year}</Cell>
                            <Cell class="center">{season.gamesPlayed}</Cell>
                            <Cell class="center">{season.avgPoints}</Cell>
                            <Cell class="center">{season.totalPoints}</Cell>
                            <Cell class="center">{season.bestWeek}</Cell>
                            <Cell class="center">{season.worstWeek}</Cell>
                            <Cell class="center">{season.stdDev}</Cell>
                        </Row>
                    {/each}
                </Body>
            </DataTable>
        </div>
    {/if}

    {#if !seasonData.length && !compareAll}
        <p style="text-align: center; color: #888;">Select a team to view season comparisons.</p>
    {/if}
</div>
