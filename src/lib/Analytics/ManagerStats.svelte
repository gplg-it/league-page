<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromManagerID } from '$lib/utils/helperFunctions/universalFunctions';

    let {managerAnalytics, leagueTeamManagers, luckAnalysis} = $props();

    let sortField = $state("avgPoints");
    let sortDir = $state("desc");

    let managers = $derived.by(() => {
        if(!managerAnalytics) return [];
        return Object.values(managerAnalytics)
            .sort((a, b) => sortDir === "desc" ? parseFloat(b[sortField]) - parseFloat(a[sortField]) : parseFloat(a[sortField]) - parseFloat(b[sortField]));
    });

    const toggleSort = (field) => {
        if(sortField === field) {
            sortDir = sortDir === "desc" ? "asc" : "desc";
        } else {
            sortField = field;
            sortDir = "desc";
        }
    };

    const getName = (mID) => {
        const team = getTeamFromManagerID(leagueTeamManagers, mID);
        return team?.name || `Manager ${mID}`;
    };

    const columns = [
        { name: "Avg Pts", field: "avgPoints" },
        { name: "Std Dev", field: "stdDev" },
        { name: "Consistency", field: "consistency" },
        { name: "Efficiency %", field: "efficiency" },
        { name: "Best Week", field: "bestWeek" },
        { name: "Worst Week", field: "worstWeek" },
        { name: "Win %", field: "winRate" },
        { name: "Avg Margin", field: "avgMargin" },
    ];

    let leagueStats = $derived.by(() => {
        if(!managers.length) return null;
        const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
        const pts = managers.map(m => parseFloat(m.avgPoints));
        const wins = managers.reduce((s, m) => s + parseInt(m.wins), 0);
        const games = managers.reduce((s, m) => s + parseInt(m.gamesPlayed), 0);
        const topScorer = managers.reduce((best, m) => parseFloat(m.avgPoints) > parseFloat(best.avgPoints) ? m : best, managers[0]);
        const bestWinRate = managers.reduce((best, m) => parseFloat(m.winRate) > parseFloat(best.winRate) ? m : best, managers[0]);
        const mostConsistent = managers.reduce((best, m) => parseFloat(m.consistency) > parseFloat(best.consistency) ? m : best, managers[0]);
        const bestBoom = managers.reduce((best, m) => parseFloat(m.bestWeek) > parseFloat(best.bestWeek) ? m : best, managers[0]);
        return {
            leagueAvg: avg(pts).toFixed(1),
            totalGames: games,
            topScorer: { name: getName(topScorer.managerID), val: topScorer.avgPoints },
            bestWinRate: { name: getName(bestWinRate.managerID), val: bestWinRate.winRate },
            mostConsistent: { name: getName(mostConsistent.managerID), val: mostConsistent.consistency },
            bestBoom: { name: getName(bestBoom.managerID), val: bestBoom.bestWeek },
        };
    });

    let podiumMetric = $state("avgPoints");
    const podiumOptions = [
        { field: "avgPoints", label: "Avg Points" },
        { field: "winRate", label: "Win %" },
        { field: "consistency", label: "Consistency" },
        { field: "efficiency", label: "Efficiency" },
    ];

    let podiumManagers = $derived.by(() => {
        if(!managers.length) return [];
        return [...Object.values(managerAnalytics)]
            .sort((a, b) => parseFloat(b[podiumMetric]) - parseFloat(a[podiumMetric]))
            .slice(0, 3);
    });

    let consistencyGraph = $derived.by(() => {
        if(!managers.length) return null;
        const sorted = [...managers].sort((a, b) => parseFloat(b.consistency) - parseFloat(a.consistency));
        return {
            stats: sorted.map(m => parseFloat(m.consistency)),
            labels: sorted.map(m => getName(m.managerID)),
            ids: sorted.map(m => m.managerID),
        };
    });

    let efficiencyGraph = $derived.by(() => {
        if(!managers.length) return null;
        const sorted = [...managers].sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));
        return {
            stats: sorted.map(m => parseFloat(m.efficiency)),
            labels: sorted.map(m => getName(m.managerID)),
            ids: sorted.map(m => m.managerID),
        };
    });

    const getMedalColor = (i) => {
        if(i === 0) return '#D4AF37';
        if(i === 1) return '#A8A9AD';
        if(i === 2) return '#CD7F32';
        return null;
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

    /* ---- Highlight Cards ---- */
    .highlightRow {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin: 0 0 2em;
    }

    .highlightCard {
        border: 1px solid var(--eee);
        border-radius: 10px;
        padding: 1em;
        text-align: center;
        position: relative;
        overflow: hidden;
        background: var(--fff);
    }

    .highlightCard::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #920505, #d44);
    }

    .highlightCard .cardIcon {
        font-size: 1.6em;
        margin-bottom: 4px;
        opacity: 0.8;
    }

    .highlightCard .cardValue {
        font-size: 1.5em;
        font-weight: 700;
        color: #920505;
    }

    .highlightCard .cardLabel {
        font-size: 0.72em;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
    }

    .highlightCard .cardName {
        font-size: 0.78em;
        font-weight: 600;
        margin-top: 4px;
        color: var(--g333);
    }

    /* ---- Podium ---- */
    .podiumSection {
        margin: 2em 0;
    }

    .podiumControls {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin: 0 0 1.5em;
        flex-wrap: wrap;
    }

    .podiumBtn {
        padding: 6px 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
        background: var(--fff);
        color: var(--g333);
    }

    .podiumBtn.active {
        background: #920505;
        color: #fff;
        border-color: #920505;
    }

    .podiumDisplay {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 12px;
        max-width: 600px;
        margin: 0 auto 2em;
        padding: 0 1em;
    }

    .podiumStep {
        flex: 1;
        max-width: 180px;
        text-align: center;
    }

    .podiumInfo {
        margin-bottom: 8px;
    }

    .podiumName {
        font-weight: 600;
        font-size: 0.9em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .podiumScore {
        font-size: 1.3em;
        font-weight: 700;
    }

    .podiumBlock {
        border-radius: 6px 6px 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2em;
        font-weight: 800;
        color: rgba(255,255,255,0.9);
        position: relative;
        overflow: hidden;
    }

    .podiumBlock::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%);
    }

    .podiumBlock.p1 {
        height: 120px;
        background: linear-gradient(180deg, #D4AF37, #B8941F);
    }

    .podiumBlock.p2 {
        height: 90px;
        background: linear-gradient(180deg, #A8A9AD, #8E8F93);
    }

    .podiumBlock.p3 {
        height: 65px;
        background: linear-gradient(180deg, #CD7F32, #A66525);
    }

    /* ---- Table ---- */
    .tableHolder {
        max-width: 100%;
        overflow-x: auto;
        margin: 1em 0 2em;
    }

    :global(.sortable) {
        cursor: pointer;
        user-select: none;
    }

    :global(.sortable:hover) {
        text-decoration: underline;
    }

    /* ---- Bar Charts ---- */
    .graphRow {
        display: flex;
        flex-wrap: wrap;
        gap: 2em;
        justify-content: center;
        margin: 2em 0;
    }

    .graphCard {
        flex: 1;
        min-width: 300px;
        max-width: 560px;
        border: 1px solid var(--eee);
        border-radius: 10px;
        padding: 1.2em;
        background: var(--fff);
    }

    .graphHeader {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 1em;
    }

    .graphDot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .graphTitle {
        font-weight: 600;
        font-size: 0.95em;
    }

    .barWrapper {
        display: flex;
        align-items: center;
        margin: 5px 0;
        font-size: 0.85em;
    }

    .barRank {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7em;
        font-weight: 700;
        margin-right: 6px;
        flex-shrink: 0;
        color: #fff;
    }

    .barLabel {
        width: 110px;
        text-align: right;
        padding-right: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.9em;
    }

    .barTrack {
        flex: 1;
        height: 24px;
        background: var(--eee);
        border-radius: 6px;
        overflow: hidden;
        position: relative;
    }

    .barFill {
        height: 100%;
        border-radius: 6px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
    }

    .barFill.blue {
        background: linear-gradient(90deg, #4a90d9, #6ba8e8);
    }

    .barFill.green {
        background: linear-gradient(90deg, #5bb974, #7dd99a);
    }

    .barValue {
        width: 50px;
        text-align: right;
        padding-left: 6px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    /* ---- Donut Charts ---- */
    .donutRow {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 1em;
        margin: 2em 0;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
    }

    .donutCard {
        text-align: center;
    }

    .donutSvg {
        width: 100px;
        height: 100px;
    }

    .donutTrack {
        fill: none;
        stroke: var(--eee);
        stroke-width: 6;
    }

    .donutFill {
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
        transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .donutLabel {
        font-size: 0.72em;
        color: #888;
        margin-top: 4px;
    }

    .donutValue {
        font-size: 0.85em;
        font-weight: 700;
    }

    @media (max-width: 540px) {
        .highlightRow {
            grid-template-columns: repeat(2, 1fr);
        }
        .podiumDisplay {
            gap: 6px;
        }
        .podiumName {
            font-size: 0.75em;
        }
        .podiumScore {
            font-size: 1em;
        }
        .podiumBlock.p1 { height: 80px; }
        .podiumBlock.p2 { height: 60px; }
        .podiumBlock.p3 { height: 45px; }
        .barLabel { width: 80px; font-size: 0.78em; }
    }
</style>

<div class="statsSection">
    <h2>Manager Performance Analytics</h2>
    <p class="description">Advanced statistical breakdown of each manager's performance across all seasons</p>

    {#if leagueStats}
        <div class="highlightRow">
            <div class="highlightCard">
                <div class="cardIcon">&#x1F3C8;</div>
                <div class="cardValue">{leagueStats.totalGames}</div>
                <div class="cardLabel">Total Games</div>
            </div>
            <div class="highlightCard">
                <div class="cardValue">{leagueStats.leagueAvg}</div>
                <div class="cardLabel">League Avg PPG</div>
            </div>
            <div class="highlightCard">
                <div class="cardValue">{leagueStats.topScorer.val}</div>
                <div class="cardLabel">Highest Avg PPG</div>
                <div class="cardName">{leagueStats.topScorer.name}</div>
            </div>
            <div class="highlightCard">
                <div class="cardValue">{leagueStats.bestBoom.val}</div>
                <div class="cardLabel">Single-Week Best</div>
                <div class="cardName">{leagueStats.bestBoom.name}</div>
            </div>
        </div>
    {/if}

    <div class="podiumSection">
        <h2>Leaderboard</h2>
        <div class="podiumControls">
            {#each podiumOptions as opt}
                <button class="podiumBtn" class:active={podiumMetric === opt.field} onclick={() => podiumMetric = opt.field}>
                    {opt.label}
                </button>
            {/each}
        </div>
        {#if podiumManagers.length >= 3}
            <div class="podiumDisplay">
                <div class="podiumStep">
                    <div class="podiumInfo">
                        <div class="podiumName">{getName(podiumManagers[1].managerID)}</div>
                        <div class="podiumScore" style="color: #A8A9AD">{podiumManagers[1][podiumMetric]}</div>
                    </div>
                    <div class="podiumBlock p2">2</div>
                </div>
                <div class="podiumStep">
                    <div class="podiumInfo">
                        <div class="podiumName">{getName(podiumManagers[0].managerID)}</div>
                        <div class="podiumScore" style="color: #D4AF37">{podiumManagers[0][podiumMetric]}</div>
                    </div>
                    <div class="podiumBlock p1">1</div>
                </div>
                <div class="podiumStep">
                    <div class="podiumInfo">
                        <div class="podiumName">{getName(podiumManagers[2].managerID)}</div>
                        <div class="podiumScore" style="color: #CD7F32">{podiumManagers[2][podiumMetric]}</div>
                    </div>
                    <div class="podiumBlock p3">3</div>
                </div>
            </div>
        {/if}
    </div>

    {#if managers.length > 0}
        <div class="donutRow">
            {#each managers.slice(0, 6) as mgr, i}
                {@const wr = parseFloat(mgr.winRate)}
                {@const r = 42}
                {@const circ = 2 * Math.PI * r}
                {@const offset = circ * (1 - wr / 100)}
                <div class="donutCard">
                    <svg class="donutSvg" viewBox="0 0 100 100">
                        <circle class="donutTrack" cx="50" cy="50" r={r} />
                        <circle class="donutFill" cx="50" cy="50" r={r}
                            stroke="#920505"
                            stroke-dasharray={circ}
                            stroke-dashoffset={offset}
                            transform="rotate(-90 50 50)" />
                        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
                            font-size="14" font-weight="700" fill="var(--g333)">
                            {mgr.winRate}%
                        </text>
                    </svg>
                    <div class="donutLabel">{getName(mgr.managerID)}</div>
                    <div class="donutValue">{mgr.wins}W-{mgr.losses}L</div>
                </div>
            {/each}
        </div>
    {/if}

    <div class="tableHolder">
        <DataTable table$aria-label="Manager Analytics">
            <Head>
                <Row>
                    <Cell class="center">Team</Cell>
                    <Cell class="center">W</Cell>
                    <Cell class="center">L</Cell>
                    <Cell class="center">Games</Cell>
                    {#each columns as col}
                        <Cell class="center sortable" onclick={() => toggleSort(col.field)}>
                            {col.name}{sortField === col.field ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
                        </Cell>
                    {/each}
                </Row>
            </Head>
            <Body>
                {#each managers as mgr}
                    <Row>
                        <Cell>{getName(mgr.managerID)}</Cell>
                        <Cell class="center">{mgr.wins}</Cell>
                        <Cell class="center">{mgr.losses}</Cell>
                        <Cell class="center">{mgr.gamesPlayed}</Cell>
                        {#each columns as col}
                            <Cell class="center">{mgr[col.field]}</Cell>
                        {/each}
                    </Row>
                {/each}
            </Body>
        </DataTable>
    </div>

    <div class="graphRow">
        {#if consistencyGraph}
            <div class="graphCard">
                <div class="graphHeader">
                    <div class="graphDot" style="background: #4a90d9"></div>
                    <div class="graphTitle">Scoring Consistency Index</div>
                </div>
                {#each consistencyGraph.labels as label, i}
                    {@const medal = getMedalColor(i)}
                    <div class="barWrapper">
                        {#if medal}
                            <div class="barRank" style="background: {medal}">{i + 1}</div>
                        {:else}
                            <div class="barRank" style="background: #aaa">{i + 1}</div>
                        {/if}
                        <div class="barLabel">{label}</div>
                        <div class="barTrack">
                            <div class="barFill blue" style="width: {consistencyGraph.stats[i]}%"></div>
                        </div>
                        <div class="barValue">{consistencyGraph.stats[i]}%</div>
                    </div>
                {/each}
            </div>
        {/if}
        {#if efficiencyGraph}
            <div class="graphCard">
                <div class="graphHeader">
                    <div class="graphDot" style="background: #5bb974"></div>
                    <div class="graphTitle">Lineup Efficiency (Actual vs Optimal)</div>
                </div>
                {#each efficiencyGraph.labels as label, i}
                    {@const medal = getMedalColor(i)}
                    <div class="barWrapper">
                        {#if medal}
                            <div class="barRank" style="background: {medal}">{i + 1}</div>
                        {:else}
                            <div class="barRank" style="background: #aaa">{i + 1}</div>
                        {/if}
                        <div class="barLabel">{label}</div>
                        <div class="barTrack">
                            <div class="barFill green" style="width: {efficiencyGraph.stats[i]}%"></div>
                        </div>
                        <div class="barValue">{efficiencyGraph.stats[i]}%</div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
