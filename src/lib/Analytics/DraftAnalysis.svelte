<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromTeamManagers } from '$lib/utils/helper';

    let { draftAnalysis, leagueTeamManagers, allSeasons } = $props();

    let selectedSeason = $state(null);
    let sortKey = $state('value');
    let sortDir = $state(-1);

    $effect(() => {
        if(allSeasons && allSeasons.length > 0 && !selectedSeason) {
            selectedSeason = allSeasons[0].year;
        }
    });

    const getManagerName = (rosterID) => {
        const team = getTeamFromTeamManagers(leagueTeamManagers, rosterID);
        return team?.team?.name || team?.team?.display_name || `Roster ${rosterID}`;
    };

    const getDraftData = () => {
        if(!draftAnalysis || !selectedSeason || !draftAnalysis[selectedSeason]) return [];
        return draftAnalysis[selectedSeason];
    };

    const getSortedPicks = () => {
        const picks = getDraftData();
        if(!picks || picks.length === 0) return [];
        return [...picks].sort((a, b) => {
            let aVal = a[sortKey] ?? 0;
            let bVal = b[sortKey] ?? 0;
            if(typeof aVal === 'string') return sortDir * aVal.localeCompare(bVal);
            return sortDir * (aVal - bVal);
        });
    };

    const sort = (key) => {
        if(sortKey === key) {
            sortDir *= -1;
        } else {
            sortKey = key;
            sortDir = -1;
        }
    };

    const getValueColor = (value) => {
        if(value > 20) return 'color: #4CAF50; font-weight: 700;';
        if(value > 5) return 'color: #8BC34A;';
        if(value < -20) return 'color: #F44336; font-weight: 700;';
        if(value < -5) return 'color: #FF9800;';
        return '';
    };

    const getManagerSummary = () => {
        const picks = getDraftData();
        if(!picks || picks.length === 0) return [];
        const byManager = {};
        for(const pick of picks) {
            if(!byManager[pick.rosterID]) {
                byManager[pick.rosterID] = { rosterID: pick.rosterID, totalValue: 0, picks: 0, steals: 0, busts: 0 };
            }
            byManager[pick.rosterID].totalValue += pick.value || 0;
            byManager[pick.rosterID].picks++;
            if(pick.value > 10) byManager[pick.rosterID].steals++;
            if(pick.value < -10) byManager[pick.rosterID].busts++;
        }
        return Object.values(byManager).sort((a, b) => b.totalValue - a.totalValue);
    };
</script>

<style>
    .draftWrapper {
        margin: 2em 0;
    }

    h2 {
        text-align: center;
        margin: 0 0 0.5em;
    }

    .description {
        text-align: center;
        color: #888;
        font-size: 0.85em;
        margin: 0 0 1em;
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

    .summaryGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1em;
        margin: 0 0 2em;
    }

    .summaryCard {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1em;
        text-align: center;
    }

    .summaryCard .name {
        font-weight: 600;
        margin: 0 0 0.5em;
    }

    .summaryCard .stat {
        font-size: 1.4em;
        font-weight: 700;
    }

    .summaryCard .detail {
        font-size: 0.8em;
        color: #888;
        margin-top: 0.25em;
    }

    .positive { color: #4CAF50; }
    .negative { color: #F44336; }

    .tableWrapper {
        overflow-x: auto;
    }

    .sortable {
        cursor: pointer;
        user-select: none;
    }

    .sortable:hover {
        color: #920505;
    }

    h3 {
        text-align: center;
        margin: 1.5em 0 0.5em;
    }

    .noData {
        text-align: center;
        color: #888;
        margin: 2em 0;
    }
</style>

<div class="draftWrapper">
    <h2>Draft Value Analysis</h2>
    <p class="description">How well each manager drafted relative to average draft position value</p>

    <div class="selectorRow">
        <label for="draftSeasonSelect">Season: </label>
        <select id="draftSeasonSelect" bind:value={selectedSeason}>
            {#if allSeasons}
                {#each [...allSeasons].sort((a, b) => b.year - a.year) as season}
                    <option value={season.year}>{season.year}</option>
                {/each}
            {/if}
        </select>
    </div>

    {#if getDraftData().length > 0}
        <h3>Manager Draft Grades</h3>
        <div class="summaryGrid">
            {#each getManagerSummary() as mgr}
                <div class="summaryCard">
                    <div class="name">{getManagerName(mgr.rosterID)}</div>
                    <div class="stat" class:positive={mgr.totalValue > 0} class:negative={mgr.totalValue < 0}>
                        {mgr.totalValue > 0 ? '+' : ''}{mgr.totalValue.toFixed(1)}
                    </div>
                    <div class="detail">{mgr.steals} steal{mgr.steals !== 1 ? 's' : ''} / {mgr.busts} bust{mgr.busts !== 1 ? 's' : ''}</div>
                </div>
            {/each}
        </div>

        <h3>Individual Picks</h3>
        <div class="tableWrapper">
            <DataTable style="width: 100%;">
                <Head>
                    <Row>
                        <Cell class="sortable" on:click={() => sort('round')}>Rd</Cell>
                        <Cell class="sortable" on:click={() => sort('pick')}>Pick</Cell>
                        <Cell class="sortable" on:click={() => sort('playerName')}>Player</Cell>
                        <Cell>Pos</Cell>
                        <Cell>Manager</Cell>
                        <Cell class="sortable" on:click={() => sort('seasonPts')}>Season Pts</Cell>
                        <Cell class="sortable" on:click={() => sort('adpAvgPts')}>ADP Avg Pts</Cell>
                        <Cell class="sortable" on:click={() => sort('value')}>Value +/-</Cell>
                    </Row>
                </Head>
                <Body>
                    {#each getSortedPicks() as pick}
                        <Row>
                            <Cell>{pick.round}</Cell>
                            <Cell>{pick.pick}</Cell>
                            <Cell>{pick.playerName}</Cell>
                            <Cell>{pick.position}</Cell>
                            <Cell>{getManagerName(pick.rosterID)}</Cell>
                            <Cell>{pick.seasonPts?.toFixed(1) ?? '-'}</Cell>
                            <Cell>{pick.adpAvgPts?.toFixed(1) ?? '-'}</Cell>
                            <Cell style={getValueColor(pick.value)}>{pick.value > 0 ? '+' : ''}{pick.value?.toFixed(1) ?? '-'}</Cell>
                        </Row>
                    {/each}
                </Body>
            </DataTable>
        </div>
    {:else}
        <p class="noData">No draft data available for this season.</p>
    {/if}
</div>
