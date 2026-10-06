<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

    let {luckAnalysis, leagueTeamManagers, allPlayRecords} = $props();

    let sortField = $state("luckIndex");
    let sortDir = $state("desc");

    let teams = $derived.by(() => {
        if(!luckAnalysis) return [];
        return Object.entries(luckAnalysis)
            .map(([rosterID, data]) => ({rosterID, ...data}))
            .sort((a, b) => sortDir === "desc" ? parseFloat(b[sortField]) - parseFloat(a[sortField]) : parseFloat(a[sortField]) - parseFloat(b[sortField]));
    });

    let allPlayTeams = $derived.by(() => {
        if(!allPlayRecords) return [];
        return Object.entries(allPlayRecords)
            .map(([rosterID, data]) => ({rosterID, ...data}))
            .sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct));
    });

    const toggleSort = (field) => {
        if(sortField === field) {
            sortDir = sortDir === "desc" ? "asc" : "desc";
        } else {
            sortField = field;
            sortDir = "desc";
        }
    };

    const luckColumns = [
        { name: "Actual W", field: "actualWins" },
        { name: "Actual L", field: "actualLosses" },
        { name: "Expected W", field: "expectedWins" },
        { name: "Expected L", field: "expectedLosses" },
        { name: "Lucky W", field: "luckyWins" },
        { name: "Unlucky L", field: "unluckyLosses" },
        { name: "W Diff", field: "winDifferential" },
        { name: "Luck Index", field: "luckIndex" },
    ];
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

    :global(.positive) { color: #4caf50; font-weight: 600; }
    :global(.negative) { color: #f44336; font-weight: 600; }

    .luckBar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 6px 0;
        font-size: 0.85em;
    }

    .luckLabel {
        width: 130px;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .luckTrack {
        flex: 1;
        height: 24px;
        background: var(--eee);
        border-radius: 4px;
        position: relative;
        overflow: hidden;
    }

    .luckCenter {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #999;
    }

    .luckFill {
        position: absolute;
        top: 2px;
        bottom: 2px;
        border-radius: 3px;
        transition: all 0.3s ease;
    }

    .luckFill.lucky {
        background: #4caf50;
        left: 50%;
    }

    .luckFill.unlucky {
        background: #f44336;
        right: 50%;
    }

    .luckValue {
        width: 50px;
        text-align: right;
        font-weight: 500;
    }

    .graphSection {
        margin: 2em 0;
    }

    .graphTitle {
        text-align: center;
        font-weight: 600;
        margin-bottom: 1em;
    }
</style>

<div class="statsSection">
    <h2>Luck Analysis</h2>
    <p class="description">Lucky wins = won despite scoring below weekly median. Unlucky losses = lost despite scoring above. Luck Index measures overall schedule fortune.</p>

    <div class="graphSection">
        <div class="graphTitle">Luck Index by Team</div>
        {#each teams as team}
            {@const teamData = getTeamFromTeamManagers(leagueTeamManagers, team.rosterID)}
            {@const maxAbs = Math.max(...teams.map(t => Math.abs(parseFloat(t.luckIndex))))}
            {@const pct = Math.abs(parseFloat(team.luckIndex)) / maxAbs * 45}
            <div class="luckBar">
                <div class="luckLabel">{teamData?.name || `Roster ${team.rosterID}`}</div>
                <div class="luckTrack">
                    <div class="luckCenter"></div>
                    {#if parseFloat(team.luckIndex) >= 0}
                        <div class="luckFill lucky" style="width: {pct}%"></div>
                    {:else}
                        <div class="luckFill unlucky" style="width: {pct}%"></div>
                    {/if}
                </div>
                <div class="luckValue" class:positive={parseFloat(team.luckIndex) > 0} class:negative={parseFloat(team.luckIndex) < 0}>
                    {team.luckIndex > 0 ? "+" : ""}{team.luckIndex}
                </div>
            </div>
        {/each}
    </div>

    <div class="tableHolder">
        <DataTable table$aria-label="Luck Analysis">
            <Head>
                <Row>
                    <Cell class="center">Team</Cell>
                    {#each luckColumns as col}
                        <Cell class="center sortable" onclick={() => toggleSort(col.field)}>
                            {col.name}{sortField === col.field ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
                        </Cell>
                    {/each}
                </Row>
            </Head>
            <Body>
                {#each teams as team}
                    {@const teamData = getTeamFromTeamManagers(leagueTeamManagers, team.rosterID)}
                    <Row>
                        <Cell>{teamData?.name || `Roster ${team.rosterID}`}</Cell>
                        {#each luckColumns as col}
                            {@const isLuck = col.field === "luckIndex"}
                            {@const val = parseFloat(team[col.field])}
                            {@const cellClass = isLuck ? (val > 0 ? "center positive" : val < 0 ? "center negative" : "center") : "center"}
                            <Cell class={cellClass}>
                                {#if col.field === "winDifferential" || col.field === "luckIndex"}
                                    {val > 0 ? "+" : ""}{team[col.field]}
                                {:else}
                                    {team[col.field]}
                                {/if}
                            </Cell>
                        {/each}
                    </Row>
                {/each}
            </Body>
        </DataTable>
    </div>

    {#if allPlayTeams.length > 0}
        <h2>All-Play Records</h2>
        <p class="description">What each team's record would be if they played every team every week (true strength of schedule adjusted performance)</p>

        <div class="tableHolder">
            <DataTable table$aria-label="All-Play Records">
                <Head>
                    <Row>
                        <Cell class="center">Team</Cell>
                        <Cell class="center">All-Play W</Cell>
                        <Cell class="center">All-Play L</Cell>
                        <Cell class="center">All-Play T</Cell>
                        <Cell class="center">Win %</Cell>
                    </Row>
                </Head>
                <Body>
                    {#each allPlayTeams as team}
                        {@const teamData = getTeamFromTeamManagers(leagueTeamManagers, team.rosterID)}
                        <Row>
                            <Cell>{teamData?.name || `Roster ${team.rosterID}`}</Cell>
                            <Cell class="center">{team.wins}</Cell>
                            <Cell class="center">{team.losses}</Cell>
                            <Cell class="center">{team.ties}</Cell>
                            <Cell class="center">{team.winPct}%</Cell>
                        </Row>
                    {/each}
                </Body>
            </DataTable>
        </div>
    {/if}
</div>
