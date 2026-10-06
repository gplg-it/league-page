<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
    import { BarChart } from '$lib/components';

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

    let consistencyGraph = $derived.by(() => {
        if(!managers.length) return null;
        return {
            stats: managers.map(m => parseFloat(m.consistency)),
            labels: managers.map(m => {
                const team = getTeamFromTeamManagers(leagueTeamManagers, m.rosterID);
                return team?.name || `Roster ${m.rosterID}`;
            }),
            header: "Scoring Consistency Index",
            field: "Consistency %",
        };
    });

    let efficiencyGraph = $derived.by(() => {
        if(!managers.length) return null;
        return {
            stats: managers.map(m => parseFloat(m.efficiency)),
            labels: managers.map(m => {
                const team = getTeamFromTeamManagers(leagueTeamManagers, m.rosterID);
                return team?.name || `Roster ${m.rosterID}`;
            }),
            header: "Lineup Efficiency (Actual vs Optimal)",
            field: "Efficiency %",
        };
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
        background: var(--f3f3f3);
        border-radius: 8px;
        padding: 1em;
    }

    .graphTitle {
        text-align: center;
        font-weight: 600;
        margin-bottom: 0.5em;
        font-size: 0.95em;
    }

    .barWrapper {
        display: flex;
        align-items: center;
        margin: 4px 0;
        font-size: 0.85em;
    }

    .barLabel {
        width: 120px;
        text-align: right;
        padding-right: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .barTrack {
        flex: 1;
        height: 22px;
        background: var(--eee);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }

    .barFill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .barFill.blue { background: #4a90d9; }
    .barFill.green { background: #5bb974; }

    .barValue {
        width: 50px;
        text-align: right;
        padding-left: 6px;
        font-weight: 500;
    }

    .description {
        text-align: center;
        font-size: 0.85em;
        color: #888;
        margin: 0 0 1.5em;
        font-style: italic;
    }
</style>

<div class="statsSection">
    <h2>Manager Performance Analytics</h2>
    <p class="description">Advanced statistical breakdown of each manager's performance across all seasons</p>

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
                    {@const team = getTeamFromTeamManagers(leagueTeamManagers, mgr.rosterID)}
                    <Row>
                        <Cell>{team?.name || `Roster ${mgr.rosterID}`}</Cell>
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
                <div class="graphTitle">{consistencyGraph.header}</div>
                {#each consistencyGraph.labels as label, i}
                    <div class="barWrapper">
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
                <div class="graphTitle">{efficiencyGraph.header}</div>
                {#each efficiencyGraph.labels as label, i}
                    <div class="barWrapper">
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
