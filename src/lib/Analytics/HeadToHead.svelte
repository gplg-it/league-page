<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromTeamManagers } from '$lib/utils/helper';

    let { headToHead, leagueTeamManagers, allSeasons } = $props();

    let selectedSeason = $state('all');

    const getManagerName = (rosterID) => {
        const team = getTeamFromTeamManagers(leagueTeamManagers, rosterID);
        return team?.team?.name || team?.team?.display_name || `Roster ${rosterID}`;
    };

    const getRosterIDs = () => {
        if(!headToHead) return [];
        return Object.keys(headToHead).sort((a, b) => parseInt(a) - parseInt(b));
    };

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

    .matrixContainer {
        overflow-x: auto;
        margin: 0 auto;
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

    <div class="matrixContainer">
        <table>
            <thead>
                <tr>
                    <th class="stickyCol">Manager</th>
                    {#each getRosterIDs() as rosterID}
                        <th>{getManagerName(rosterID)}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each getRosterIDs() as rowRoster}
                    <tr>
                        <td class="stickyCol">{getManagerName(rowRoster)}</td>
                        {#each getRosterIDs() as colRoster}
                            {#if rowRoster === colRoster}
                                <td class="diagonal">-</td>
                            {:else}
                                {@const record = getRecord(rowRoster, colRoster)}
                                <td style={getCellColor(record)} title="{getManagerName(rowRoster)} vs {getManagerName(colRoster)}: PF {record.totalPtsFor?.toFixed(1) || 0} PA {record.totalPtsAgainst?.toFixed(1) || 0}">
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
