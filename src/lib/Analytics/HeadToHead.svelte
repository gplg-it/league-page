<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromManagerID } from '$lib/utils/helper';

    let { headToHead, leagueTeamManagers, allSeasons } = $props();

    let selectedSeason = $state('all');
    let tooltip = $state({ show: false, x: 0, y: 0, text: '', sub: '' });
    let heatmapEl = $state(null);

    const getManagerName = (managerID) => {
        const team = getTeamFromManagerID(leagueTeamManagers, managerID);
        return team?.name || `Manager ${managerID}`;
    };

    const getShortName = (managerID) => {
        const name = getManagerName(managerID);
        if (name.length <= 10) return name;
        const parts = name.split(' ');
        if (parts.length > 1) return parts[0][0] + '. ' + parts.slice(1).join(' ');
        return name.slice(0, 9) + '.';
    };

    let managerIDs = $derived(headToHead ? Object.keys(headToHead) : []);

    const getRecord = (rosterA, rosterB) => {
        if(!headToHead || !headToHead[rosterA] || !headToHead[rosterA][rosterB]) {
            return { wins: 0, losses: 0, ties: 0, totalPtsFor: 0, totalPtsAgainst: 0 };
        }
        const data = headToHead[rosterA][rosterB];
        if(selectedSeason === 'all') {
            return data.allTime;
        }
        return data.bySeason[selectedSeason] || { wins: 0, losses: 0, ties: 0, totalPtsFor: 0, totalPtsAgainst: 0 };
    };

    const formatRecord = (record) => {
        if(!record || (record.wins === 0 && record.losses === 0 && record.ties === 0)) return '-';
        let str = `${record.wins}-${record.losses}`;
        if(record.ties > 0) str += `-${record.ties}`;
        return str;
    };

    const getCellColor = (record) => {
        if(!record || (record.wins === 0 && record.losses === 0)) return '';
        const total = record.wins + record.losses + record.ties;
        const winPct = record.wins / total;
        if(winPct > 0.6) return 'background-color: rgba(76, 175, 80, 0.15);';
        if(winPct < 0.4) return 'background-color: rgba(244, 67, 54, 0.15);';
        return '';
    };

    const getHeatColor = (record) => {
        if (!record || (record.wins === 0 && record.losses === 0 && record.ties === 0)) {
            return 'rgba(200, 200, 200, 0.2)';
        }
        const total = record.wins + record.losses + record.ties;
        const winPct = record.wins / total;
        if (winPct > 0.5) {
            const intensity = (winPct - 0.5) * 2;
            const alpha = 0.15 + intensity * 0.55;
            return `rgba(46, 160, 67, ${alpha})`;
        } else if (winPct < 0.5) {
            const intensity = (0.5 - winPct) * 2;
            const alpha = 0.15 + intensity * 0.55;
            return `rgba(178, 34, 34, ${alpha})`;
        }
        return 'rgba(200, 180, 60, 0.3)';
    };

    const CELL = 52;
    const LABEL_W = 100;
    const LABEL_H = 80;

    let svgWidth = $derived(LABEL_W + managerIDs.length * CELL + 4);
    let svgHeight = $derived(LABEL_H + managerIDs.length * CELL + 4);

    const showTooltip = (e, rowID, colID) => {
        const record = getRecord(rowID, colID);
        const ptDiff = (record.totalPtsFor || 0) - (record.totalPtsAgainst || 0);
        const sign = ptDiff >= 0 ? '+' : '';
        tooltip = {
            show: true,
            x: e.clientX,
            y: e.clientY,
            text: `${getManagerName(rowID)} vs ${getManagerName(colID)}`,
            sub: `${formatRecord(record)}  |  Pt Diff: ${sign}${ptDiff.toFixed(1)}`
        };
    };

    const hideTooltip = () => {
        tooltip = { ...tooltip, show: false };
    };

    let rivalries = $derived.by(() => {
        if (!headToHead) return [];
        const pairs = [];
        const seen = new Set();
        for (const a of managerIDs) {
            for (const b of managerIDs) {
                if (a === b) continue;
                const key = [a, b].sort().join('-');
                if (seen.has(key)) continue;
                seen.add(key);
                const recA = headToHead[a]?.[b]?.allTime;
                const recB = headToHead[b]?.[a]?.allTime;
                if (!recA && !recB) continue;
                const totalGames = (recA?.wins || 0) + (recA?.losses || 0) + (recA?.ties || 0);
                if (totalGames === 0) continue;
                pairs.push({
                    a, b,
                    aWins: recA?.wins || 0,
                    bWins: recB?.wins || 0,
                    ties: recA?.ties || 0,
                    totalGames,
                    aPts: recA?.totalPtsFor || 0,
                    bPts: recB?.totalPtsFor || 0,
                });
            }
        }
        pairs.sort((x, y) => y.totalGames - x.totalGames);
        return pairs.slice(0, 5);
    });

    let winRateSummary = $derived.by(() => {
        if (!headToHead) return [];
        return managerIDs.map(mID => {
            let totalW = 0, totalL = 0, totalT = 0;
            for (const opp of managerIDs) {
                if (opp === mID) continue;
                const rec = getRecord(mID, opp);
                totalW += rec.wins;
                totalL += rec.losses;
                totalT += rec.ties;
            }
            const total = totalW + totalL + totalT;
            return { managerID: mID, wins: totalW, losses: totalL, ties: totalT, total, pct: total ? (totalW / total * 100).toFixed(1) : '0.0' };
        }).sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));
    });
</script>

<style>
    .h2hWrapper {
        margin: 2em 0;
    }

    h2 {
        text-align: center;
        margin: 0 0 0.5em;
    }

    .selectorRow {
        text-align: center;
        margin: 0 0 1.5em;
    }

    select {
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid #ccc;
        font-size: 0.9em;
        background: var(--fff);
        color: var(--g333);
    }

    /* --- Heatmap --- */
    .heatmapSection {
        margin: 0 0 2.5em;
    }

    .heatmapScroll {
        overflow-x: auto;
        margin: 0 auto;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
    }

    .heatmapSvg {
        display: block;
        margin: 0 auto;
    }

    .heatmapSvg text {
        font-family: inherit;
    }

    .heatCell {
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .heatCell:hover {
        opacity: 0.8;
        stroke: var(--g333, #333);
        stroke-width: 2;
    }

    .heatTooltip {
        position: fixed;
        pointer-events: none;
        z-index: 100;
        background: rgba(20, 20, 20, 0.92);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.8em;
        line-height: 1.5;
        max-width: 280px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        transform: translate(-50%, -110%);
    }

    .heatTooltip .ttTitle {
        font-weight: 600;
        margin-bottom: 2px;
    }

    .heatTooltip .ttSub {
        color: #bbb;
        font-size: 0.9em;
    }

    /* --- Legend --- */
    .heatLegend {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin: 1em 0;
        font-size: 0.75em;
        color: #888;
    }

    .legendGradient {
        width: 160px;
        height: 12px;
        border-radius: 3px;
        background: linear-gradient(90deg, rgba(178,34,34,0.65), rgba(200,200,200,0.3), rgba(46,160,67,0.65));
    }

    /* --- Rivalries --- */
    .rivalriesSection {
        margin: 2.5em 0;
    }

    h3 {
        text-align: center;
        margin: 0 0 0.5em;
        font-size: 1.15em;
    }

    .subDescription {
        text-align: center;
        color: #888;
        font-size: 0.8em;
        margin: 0 0 1.25em;
    }

    .rivalryCards {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
        justify-content: center;
    }

    .rivalryCard {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 1em 1.2em;
        min-width: 260px;
        max-width: 340px;
        flex: 1 1 260px;
    }

    .rivalryHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 0.6em;
    }

    .rivalryName {
        font-weight: 600;
        font-size: 0.9em;
        flex: 1;
        text-align: center;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .vsLabel {
        font-size: 0.75em;
        font-weight: 700;
        color: #920505;
        flex-shrink: 0;
    }

    .rivalryRecord {
        text-align: center;
        font-size: 0.8em;
        color: #666;
        margin-bottom: 0.5em;
    }

    .splitBar {
        display: flex;
        height: 10px;
        border-radius: 5px;
        overflow: hidden;
        background: #eee;
    }

    .splitWin {
        background: #2ea043;
        transition: width 0.3s ease;
    }

    .splitTie {
        background: #c8b83c;
        transition: width 0.3s ease;
    }

    .splitLoss {
        background: #b22222;
        transition: width 0.3s ease;
    }

    .splitLabels {
        display: flex;
        justify-content: space-between;
        font-size: 0.7em;
        color: #888;
        margin-top: 3px;
    }

    /* --- Win Rate Summary --- */
    .winRateSection {
        margin: 2.5em 0;
    }

    .winRateBar {
        display: flex;
        align-items: center;
        margin: 5px 0;
        font-size: 0.85em;
    }

    .wrLabel {
        width: 120px;
        text-align: right;
        padding-right: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }

    .wrTrack {
        flex: 1;
        height: 24px;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        background: var(--eee, #eee);
    }

    .wrWin {
        background: #2ea043;
        height: 100%;
        transition: width 0.4s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 0.75em;
        font-weight: 600;
        min-width: 0;
    }

    .wrTie {
        background: #c8b83c;
        height: 100%;
        transition: width 0.4s ease;
    }

    .wrLoss {
        background: #b22222;
        height: 100%;
        transition: width 0.4s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 0.75em;
        font-weight: 600;
        min-width: 0;
    }

    .wrPct {
        width: 56px;
        text-align: right;
        padding-left: 8px;
        font-weight: 600;
        font-size: 0.85em;
    }

    /* --- Existing table --- */
    .matrixContainer {
        overflow-x: auto;
        margin: 0 auto;
    }

    .tableSection {
        margin: 2.5em 0 0;
    }

    .tableToggle {
        text-align: center;
        margin-bottom: 1em;
    }

    .tableToggle button {
        padding: 5px 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
        background: var(--fff, #fff);
        color: var(--g333, #333);
    }

    .tableToggle button:hover {
        border-color: #920505;
        color: #920505;
    }

    table {
        border-collapse: collapse;
        font-size: 0.8em;
        width: 100%;
    }

    th, td {
        border: 1px solid #ddd;
        padding: 6px 8px;
        text-align: center;
        white-space: nowrap;
    }

    th {
        background-color: var(--f8f8f8);
        font-weight: 600;
        font-size: 0.85em;
    }

    .stickyCol {
        position: sticky;
        left: 0;
        background-color: var(--f8f8f8);
        z-index: 1;
        font-weight: 600;
        text-align: left;
    }

    .diagonal {
        background-color: var(--g999);
        color: var(--g999);
    }

    .description {
        text-align: center;
        color: #888;
        font-size: 0.85em;
        margin: 0.5em 0 1em;
    }

    @media (max-width: 540px) {
        .wrLabel { width: 80px; font-size: 0.75em; }
        .rivalryCard { min-width: 200px; padding: 0.75em; }
        .rivalryName { font-size: 0.8em; }
    }
</style>

<div class="h2hWrapper">
    <h2>Head-to-Head Matrix</h2>
    <p class="description">All-time and per-season win-loss records between every pair of managers</p>

    <div class="selectorRow">
        <label for="seasonSelect">Season: </label>
        <select id="seasonSelect" bind:value={selectedSeason}>
            <option value="all">All-Time</option>
            {#if allSeasons}
                {#each [...allSeasons].sort((a, b) => b.year - a.year) as season}
                    <option value={season.year}>{season.year}</option>
                {/each}
            {/if}
        </select>
    </div>

    <!-- SVG Heatmap -->
    {#if managerIDs.length > 0}
        <div class="heatmapSection">
            <div class="heatmapScroll" bind:this={heatmapEl}>
                <svg class="heatmapSvg" viewBox="0 0 {svgWidth} {svgHeight}" width={svgWidth} height={svgHeight}>
                    <!-- Top axis labels (rotated) -->
                    {#each managerIDs as mID, ci}
                        <text
                            x={LABEL_W + ci * CELL + CELL / 2}
                            y={LABEL_H - 6}
                            text-anchor="end"
                            font-size="10"
                            fill="var(--g333, #333)"
                            transform="rotate(-45 {LABEL_W + ci * CELL + CELL / 2} {LABEL_H - 6})"
                        >{getShortName(mID)}</text>
                    {/each}

                    <!-- Left axis labels -->
                    {#each managerIDs as mID, ri}
                        <text
                            x={LABEL_W - 6}
                            y={LABEL_H + ri * CELL + CELL / 2 + 4}
                            text-anchor="end"
                            font-size="10"
                            fill="var(--g333, #333)"
                        >{getShortName(mID)}</text>
                    {/each}

                    <!-- Cells -->
                    {#each managerIDs as rowID, ri}
                        {#each managerIDs as colID, ci}
                            {#if rowID === colID}
                                <rect
                                    x={LABEL_W + ci * CELL}
                                    y={LABEL_H + ri * CELL}
                                    width={CELL}
                                    height={CELL}
                                    fill="var(--eee, #e0e0e0)"
                                    stroke="#ddd"
                                    stroke-width="0.5"
                                />
                                <line
                                    x1={LABEL_W + ci * CELL}
                                    y1={LABEL_H + ri * CELL}
                                    x2={LABEL_W + ci * CELL + CELL}
                                    y2={LABEL_H + ri * CELL + CELL}
                                    stroke="#bbb"
                                    stroke-width="1"
                                />
                            {:else}
                                {@const record = getRecord(rowID, colID)}
                                <rect
                                    class="heatCell"
                                    x={LABEL_W + ci * CELL}
                                    y={LABEL_H + ri * CELL}
                                    width={CELL}
                                    height={CELL}
                                    fill={getHeatColor(record)}
                                    stroke="#ddd"
                                    stroke-width="0.5"
                                    onmouseenter={(e) => showTooltip(e, rowID, colID)}
                                    onmouseleave={hideTooltip}
                                />
                                <text
                                    x={LABEL_W + ci * CELL + CELL / 2}
                                    y={LABEL_H + ri * CELL + CELL / 2 + 4}
                                    text-anchor="middle"
                                    font-size="10"
                                    font-weight="600"
                                    fill="var(--g333, #333)"
                                    pointer-events="none"
                                >{formatRecord(record)}</text>
                            {/if}
                        {/each}
                    {/each}

                    <!-- Border -->
                    <rect
                        x={LABEL_W}
                        y={LABEL_H}
                        width={managerIDs.length * CELL}
                        height={managerIDs.length * CELL}
                        fill="none"
                        stroke="#aaa"
                        stroke-width="1"
                    />
                </svg>
            </div>

            <div class="heatLegend">
                <span>Losing</span>
                <div class="legendGradient"></div>
                <span>Winning</span>
            </div>
        </div>

        <!-- Win Rate Summary -->
        <div class="winRateSection">
            <h3>Overall H2H Win Rate</h3>
            <p class="subDescription">Combined record against all opponents ({selectedSeason === 'all' ? 'All-Time' : selectedSeason})</p>

            {#each winRateSummary as mgr}
                {@const wPct = mgr.total ? (mgr.wins / mgr.total * 100) : 0}
                {@const tPct = mgr.total ? (mgr.ties / mgr.total * 100) : 0}
                {@const lPct = mgr.total ? (mgr.losses / mgr.total * 100) : 0}
                <div class="winRateBar">
                    <div class="wrLabel">{getShortName(mgr.managerID)}</div>
                    <div class="wrTrack">
                        {#if wPct > 0}
                            <div class="wrWin" style="width:{wPct}%">{#if wPct > 12}{mgr.wins}W{/if}</div>
                        {/if}
                        {#if tPct > 0}
                            <div class="wrTie" style="width:{tPct}%"></div>
                        {/if}
                        {#if lPct > 0}
                            <div class="wrLoss" style="width:{lPct}%">{#if lPct > 12}{mgr.losses}L{/if}</div>
                        {/if}
                    </div>
                    <div class="wrPct">{mgr.pct}%</div>
                </div>
            {/each}
        </div>

        <!-- Rivalry Spotlight -->
        {#if rivalries.length > 0}
            <div class="rivalriesSection">
                <h3>Biggest Rivalries</h3>
                <p class="subDescription">The 5 most-played matchups across all seasons</p>

                <div class="rivalryCards">
                    {#each rivalries as r}
                        {@const wPct = r.totalGames ? (r.aWins / r.totalGames * 100) : 0}
                        {@const tPct = r.totalGames ? (r.ties / r.totalGames * 100) : 0}
                        {@const lPct = r.totalGames ? (r.bWins / r.totalGames * 100) : 0}
                        <div class="rivalryCard">
                            <div class="rivalryHeader">
                                <div class="rivalryName">{getShortName(r.a)}</div>
                                <div class="vsLabel">VS</div>
                                <div class="rivalryName">{getShortName(r.b)}</div>
                            </div>
                            <div class="rivalryRecord">
                                {r.aWins}W - {r.ties}T - {r.bWins}L &nbsp; ({r.totalGames} games)
                            </div>
                            <div class="splitBar">
                                <div class="splitWin" style="width:{wPct}%"></div>
                                {#if tPct > 0}
                                    <div class="splitTie" style="width:{tPct}%"></div>
                                {/if}
                                <div class="splitLoss" style="width:{lPct}%"></div>
                            </div>
                            <div class="splitLabels">
                                <span>{getShortName(r.a)}</span>
                                <span>{getShortName(r.b)}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}

    <!-- Existing table (collapsible) -->
    <div class="tableSection">
        <div class="tableToggle">
            <button onclick={() => { const el = document.getElementById('h2hTableDetail'); if(el) el.hidden = !el.hidden; }}>
                Show / Hide Detailed Table
            </button>
        </div>

        <div id="h2hTableDetail" hidden>
            <div class="matrixContainer">
                <table>
                    <thead>
                        <tr>
                            <th class="stickyCol">Manager</th>
                            {#each managerIDs as mID}
                                <th>{getManagerName(mID)}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each managerIDs as rowID}
                            <tr>
                                <td class="stickyCol">{getManagerName(rowID)}</td>
                                {#each managerIDs as colID}
                                    {#if rowID === colID}
                                        <td class="diagonal">-</td>
                                    {:else}
                                        {@const record = getRecord(rowID, colID)}
                                        <td style={getCellColor(record)} title="{getManagerName(rowID)} vs {getManagerName(colID)}: PF {record.totalPtsFor?.toFixed(1) || 0} PA {record.totalPtsAgainst?.toFixed(1) || 0}">
                                            {formatRecord(record)}
                                        </td>
                                    {/if}
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Floating tooltip -->
{#if tooltip.show}
    <div class="heatTooltip" style="left:{tooltip.x}px; top:{tooltip.y}px;">
        <div class="ttTitle">{tooltip.text}</div>
        <div class="ttSub">{tooltip.sub}</div>
    </div>
{/if}
