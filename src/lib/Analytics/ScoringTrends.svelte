<script>
    import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
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

    let rosterIDs = $derived(Object.keys(scoringTrends?.rosterTrends || {}));

    let selectedRoster = $state(null);

    let rosterWeekly = $derived.by(() => {
        if(!selectedRoster || !scoringTrends?.rosterTrends?.[selectedRoster]?.[selectedYear]) return [];
        return scoringTrends.rosterTrends[selectedRoster][selectedYear];
    });
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

    .chart {
        position: relative;
        margin: 2em auto;
        padding: 1em;
        max-width: 900px;
    }

    .chartRow {
        display: flex;
        align-items: center;
        margin: 3px 0;
        font-size: 0.85em;
    }

    .weekLabel {
        width: 60px;
        text-align: right;
        padding-right: 10px;
        font-weight: 500;
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

    .avgLine {
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
        display: flex;
        justify-content: space-between;
        width: 60px;
        padding-left: 8px;
        font-size: 0.75em;
        color: #888;
    }

    .legend {
        display: flex;
        justify-content: center;
        gap: 2em;
        margin: 1em 0;
        font-size: 0.85em;
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

    .statCards {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
        justify-content: center;
        margin: 2em 0;
    }

    .statCard {
        background: var(--f3f3f3);
        border-radius: 8px;
        padding: 1em 1.5em;
        text-align: center;
        min-width: 140px;
    }

    .statCard .value {
        font-size: 1.8em;
        font-weight: 700;
        color: #4a90d9;
    }

    .statCard .label {
        font-size: 0.8em;
        color: #888;
        margin-top: 4px;
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
            {#each rosterIDs as rID}
                {@const team = getTeamFromTeamManagers(leagueTeamManagers, rID)}
                <option value={rID}>{team?.name || `Roster ${rID}`}</option>
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
                <div class="value">{seasonAvg}</div>
                <div class="label">Season Avg</div>
            </div>
            <div class="statCard">
                <div class="value">{seasonHigh}</div>
                <div class="label">Season High</div>
            </div>
            <div class="statCard">
                <div class="value">{seasonLow}</div>
                <div class="label">Season Low</div>
            </div>
            <div class="statCard">
                <div class="value">{avgSpread}</div>
                <div class="label">Avg Spread</div>
            </div>
        </div>

        <div class="legend">
            <div class="legendItem">
                <div class="legendSwatch" style="background: rgba(74, 144, 217, 0.15); border: 1px solid #4a90d9;"></div>
                <span>Score Range (Low - High)</span>
            </div>
            <div class="legendItem">
                <div class="legendSwatch" style="background: #4a90d9;"></div>
                <span>League Average</span>
            </div>
            {#if selectedRoster}
                <div class="legendItem">
                    <div class="legendSwatch" style="background: #ff6b35; border-radius: 50%;"></div>
                    <span>Selected Team</span>
                </div>
            {/if}
        </div>

        <div class="chart">
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
                        <div class="avgLine" style="left: {avgPct}%"></div>
                        {#if rosterWeek}
                            <div class="rosterDot" style="left: {rosterPct}%"></div>
                        {/if}
                    </div>
                    <div class="chartValues">
                        <span>{week.avg}</span>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p style="text-align: center; color: #888;">No scoring data available for this season.</p>
    {/if}
</div>
