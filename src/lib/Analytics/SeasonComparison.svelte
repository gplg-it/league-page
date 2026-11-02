<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

    let {managerAnalytics, leagueTeamManagers, allSeasons} = $props();

    let selectedRoster = $state(null);

    let rosterIDs = $derived(Object.keys(managerAnalytics || {}));

    $effect(() => {
        if(rosterIDs.length && !selectedRoster) {
            selectedRoster = rosterIDs[0];
        }
    });

    let seasonData = $derived.by(() => {
        if(!selectedRoster || !managerAnalytics?.[selectedRoster]?.seasonBreakdowns) return [];
        const breakdowns = managerAnalytics[selectedRoster].seasonBreakdowns;
        return Object.entries(breakdowns)
            .map(([year, data]) => ({year: parseInt(year), ...data}))
            .sort((a, b) => b.year - a.year);
    });

    let maxAvg = $derived(Math.max(...seasonData.map(s => parseFloat(s.avgPoints)), 1));
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
    }

    select {
        padding: 8px 12px;
        border: 1px solid var(--eee);
        border-radius: 6px;
        font-size: 0.9em;
        background: var(--f3f3f3);
        color: inherit;
    }

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

    .rangeIndicator {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        height: 60%;
        width: 2px;
        background: rgba(255,255,255,0.7);
    }

    .trendValue {
        width: 60px;
        text-align: right;
        padding-left: 8px;
        font-weight: 500;
    }

    .colors {
        --c1: #4a90d9;
        --c2: #5bb974;
        --c3: #e8a838;
        --c4: #d94a4a;
        --c5: #9b59b6;
        --c6: #1abc9c;
        --c7: #e67e22;
        --c8: #3498db;
    }
</style>

<div class="statsSection colors">
    <h2>Season-over-Season Comparison</h2>
    <p class="description">Track how each team's performance has evolved across seasons</p>

    <div class="controls">
        <select bind:value={selectedRoster}>
            {#each rosterIDs as rID}
                {@const team = getTeamFromTeamManagers(leagueTeamManagers, rID)}
                <option value={rID}>{team?.name || `Roster ${rID}`}</option>
            {/each}
        </select>
    </div>

    {#if seasonData.length > 0}
        <div class="trendChart">
            {#each seasonData as season, i}
                {@const pct = parseFloat(season.avgPoints) / maxAvg * 90}
                {@const colors = ['#4a90d9', '#5bb974', '#e8a838', '#d94a4a', '#9b59b6', '#1abc9c', '#e67e22', '#3498db']}
                <div class="trendRow">
                    <div class="trendLabel">{season.year}</div>
                    <div class="trendBarTrack">
                        <div class="trendBarFill" style="width: {pct}%; background: {colors[i % colors.length]};">
                            {season.avgPoints}
                        </div>
                    </div>
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
    {:else}
        <p style="text-align: center; color: #888;">Select a team to view season comparisons.</p>
    {/if}
</div>
