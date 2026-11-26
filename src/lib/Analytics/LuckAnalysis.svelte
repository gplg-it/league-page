<script>
    import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
    import { getTeamFromManagerID } from '$lib/utils/helperFunctions/universalFunctions';

    let {luckAnalysis, leagueTeamManagers, allPlayRecords} = $props();

    let sortField = $state("luckIndex");
    let sortDir = $state("desc");

    let teams = $derived.by(() => {
        if(!luckAnalysis) return [];
        return Object.entries(luckAnalysis)
            .map(([managerID, data]) => ({managerID, ...data}))
            .sort((a, b) => sortDir === "desc" ? parseFloat(b[sortField]) - parseFloat(a[sortField]) : parseFloat(a[sortField]) - parseFloat(b[sortField]));
    });

    let allPlayTeams = $derived.by(() => {
        if(!allPlayRecords) return [];
        return Object.entries(allPlayRecords)
            .map(([managerID, data]) => ({managerID, ...data}))
            .sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct));
    });

    const getName = (mID) => {
        const team = getTeamFromManagerID(leagueTeamManagers, mID);
        return team?.name || `Manager ${mID}`;
    };

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

    let luckiest = $derived(teams.length ? teams[0] : null);
    let unluckiest = $derived(teams.length ? teams[teams.length - 1] : null);
    let maxAbsLuck = $derived(Math.max(...teams.map(t => Math.abs(parseFloat(t.luckIndex))), 1));

    let showTable = $state(false);
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

    /* ---- Spotlight Cards ---- */
    .spotlightRow {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1em;
        max-width: 600px;
        margin: 0 auto 2em;
    }

    .spotlightCard {
        border-radius: 10px;
        padding: 1.2em;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .spotlightCard.lucky {
        border: 1px solid rgba(76, 175, 80, 0.3);
        background: rgba(76, 175, 80, 0.04);
    }

    .spotlightCard.unlucky {
        border: 1px solid rgba(244, 67, 54, 0.3);
        background: rgba(244, 67, 54, 0.04);
    }

    .spotlightTag {
        font-size: 0.7em;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 6px;
        font-weight: 600;
    }

    .spotlightTag.lucky { color: #4caf50; }
    .spotlightTag.unlucky { color: #f44336; }

    .spotlightName {
        font-size: 1.1em;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .spotlightValue {
        font-size: 2em;
        font-weight: 800;
    }

    .spotlightValue.lucky { color: #4caf50; }
    .spotlightValue.unlucky { color: #f44336; }

    .spotlightDetail {
        font-size: 0.78em;
        color: #888;
        margin-top: 4px;
    }

    /* ---- Gauge Chart ---- */
    .gaugeGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
        margin: 2em 0;
    }

    .gaugeCard {
        text-align: center;
        padding: 0.8em 0.5em;
        border: 1px solid var(--eee);
        border-radius: 8px;
        background: var(--fff);
    }

    .gaugeSvg {
        width: 100px;
        height: 60px;
        display: block;
        margin: 0 auto;
    }

    .gaugeTrack {
        fill: none;
        stroke: var(--eee);
        stroke-width: 8;
        stroke-linecap: round;
    }

    .gaugeFill {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .gaugeName {
        font-size: 0.75em;
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .gaugeVal {
        font-size: 0.85em;
        font-weight: 700;
    }

    /* ---- Diverging Bar Chart ---- */
    .graphSection {
        margin: 2em 0;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
    }

    .graphTitle {
        text-align: center;
        font-weight: 600;
        margin-bottom: 1em;
        font-size: 1em;
    }

    .luckBar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 7px 0;
        font-size: 0.85em;
    }

    .luckLabel {
        width: 120px;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.9em;
    }

    .luckTrack {
        flex: 1;
        height: 28px;
        background: var(--eee);
        border-radius: 6px;
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
        top: 3px;
        bottom: 3px;
        border-radius: 4px;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .luckFill.lucky {
        background: linear-gradient(90deg, #4caf50, #66bb6a);
        left: 50%;
    }

    .luckFill.unlucky {
        background: linear-gradient(270deg, #f44336, #ef5350);
        right: 50%;
    }

    .luckValue {
        width: 50px;
        text-align: right;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    :global(.positive) { color: #4caf50; font-weight: 600; }
    :global(.negative) { color: #f44336; font-weight: 600; }

    /* ---- Win Diff Bars ---- */
    .diffSection {
        max-width: 700px;
        margin: 2em auto;
    }

    .diffBar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 5px 0;
        font-size: 0.85em;
    }

    .diffName {
        width: 120px;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .diffTrack {
        flex: 1;
        height: 20px;
        display: flex;
        border-radius: 4px;
        overflow: hidden;
        background: var(--eee);
    }

    .diffActual {
        height: 100%;
        background: #4a90d9;
        transition: width 0.5s ease;
    }

    .diffExpected {
        height: 100%;
        background: rgba(74, 144, 217, 0.25);
        transition: width 0.5s ease;
    }

    .diffVals {
        width: 90px;
        font-size: 0.8em;
        font-variant-numeric: tabular-nums;
    }

    /* ---- Table ---- */
    .tableToggle {
        text-align: center;
        margin: 1.5em 0 0.5em;
    }

    .toggleBtn {
        padding: 6px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.82em;
        background: var(--fff);
        color: var(--g333);
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

    /* ---- All-Play Bars ---- */
    .allPlayBar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 5px 0;
        font-size: 0.85em;
    }

    .allPlayName {
        width: 120px;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .allPlayTrack {
        flex: 1;
        height: 24px;
        background: var(--eee);
        border-radius: 6px;
        overflow: hidden;
    }

    .allPlayFill {
        height: 100%;
        border-radius: 6px;
        background: linear-gradient(90deg, #920505, #c44);
        transition: width 0.5s ease;
    }

    .allPlayPct {
        width: 50px;
        text-align: right;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    @media (max-width: 540px) {
        .spotlightRow { grid-template-columns: 1fr; }
        .gaugeGrid { grid-template-columns: repeat(3, 1fr); }
        .luckLabel, .diffName, .allPlayName { width: 80px; font-size: 0.78em; }
    }
</style>

<div class="statsSection">
    <h2>Luck Analysis</h2>
    <p class="description">Lucky wins = won despite scoring below weekly median. Unlucky losses = lost despite scoring above. Luck Index measures overall schedule fortune.</p>

    {#if luckiest && unluckiest}
        <div class="spotlightRow">
            <div class="spotlightCard lucky">
                <div class="spotlightTag lucky">Luckiest Manager</div>
                <div class="spotlightName">{getName(luckiest.managerID)}</div>
                <div class="spotlightValue lucky">+{luckiest.luckIndex}</div>
                <div class="spotlightDetail">{luckiest.luckyWins} lucky wins</div>
            </div>
            <div class="spotlightCard unlucky">
                <div class="spotlightTag unlucky">Unluckiest Manager</div>
                <div class="spotlightName">{getName(unluckiest.managerID)}</div>
                <div class="spotlightValue unlucky">{unluckiest.luckIndex}</div>
                <div class="spotlightDetail">{unluckiest.unluckyLosses} unlucky losses</div>
            </div>
        </div>
    {/if}

    <div class="gaugeGrid">
        {#each teams as team}
            {@const luck = parseFloat(team.luckIndex)}
            {@const normalized = (luck + maxAbsLuck) / (2 * maxAbsLuck)}
            {@const r = 35}
            {@const halfCirc = Math.PI * r}
            {@const offset = halfCirc * (1 - normalized)}
            {@const color = luck >= 0 ? '#4caf50' : '#f44336'}
            <div class="gaugeCard">
                <svg class="gaugeSvg" viewBox="0 0 100 55">
                    <path class="gaugeTrack" d="M 10 50 A 35 35 0 0 1 90 50" />
                    <path class="gaugeFill" d="M 10 50 A 35 35 0 0 1 90 50"
                        stroke={color}
                        stroke-dasharray={halfCirc}
                        stroke-dashoffset={offset} />
                    <text x="50" y="48" text-anchor="middle" font-size="13" font-weight="700" fill={color}>
                        {luck > 0 ? '+' : ''}{team.luckIndex}
                    </text>
                </svg>
                <div class="gaugeName">{getName(team.managerID)}</div>
            </div>
        {/each}
    </div>

    <div class="graphSection">
        <div class="graphTitle">Luck Index by Team</div>
        {#each teams as team}
            {@const pct = Math.abs(parseFloat(team.luckIndex)) / maxAbsLuck * 45}
            <div class="luckBar">
                <div class="luckLabel">{getName(team.managerID)}</div>
                <div class="luckTrack">
                    <div class="luckCenter"></div>
                    {#if parseFloat(team.luckIndex) >= 0}
                        <div class="luckFill lucky" style="width: {pct}%"></div>
                    {:else}
                        <div class="luckFill unlucky" style="width: {pct}%"></div>
                    {/if}
                </div>
                <div class="luckValue" class:positive={parseFloat(team.luckIndex) > 0} class:negative={parseFloat(team.luckIndex) < 0}>
                    {parseFloat(team.luckIndex) > 0 ? "+" : ""}{team.luckIndex}
                </div>
            </div>
        {/each}
    </div>

    <div class="diffSection">
        <div class="graphTitle">Actual vs Expected Wins</div>
        {#each teams as team}
            {@const actual = parseInt(team.actualWins)}
            {@const expected = parseFloat(team.expectedWins)}
            {@const total = actual + parseInt(team.actualLosses)}
            {@const actualPct = total > 0 ? (actual / total * 100) : 0}
            {@const expectedPct = total > 0 ? (expected / total * 100) : 0}
            <div class="diffBar">
                <div class="diffName">{getName(team.managerID)}</div>
                <div class="diffTrack">
                    <div class="diffActual" style="width: {actualPct}%"></div>
                </div>
                <div class="diffVals">
                    {actual}W <span style="color: #888; font-size: 0.85em">/ {expected}exp</span>
                </div>
            </div>
        {/each}
    </div>

    <div class="tableToggle">
        <button class="toggleBtn" onclick={() => showTable = !showTable}>
            {showTable ? 'Hide' : 'Show'} Detailed Table
        </button>
    </div>

    {#if showTable}
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
                        <Row>
                            <Cell>{getName(team.managerID)}</Cell>
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
    {/if}

    {#if allPlayTeams.length > 0}
        <h2>All-Play Records</h2>
        <p class="description">What each team's record would be if they played every team every week</p>

        <div class="graphSection">
            {#each allPlayTeams as team}
                <div class="allPlayBar">
                    <div class="allPlayName">{getName(team.managerID)}</div>
                    <div class="allPlayTrack">
                        <div class="allPlayFill" style="width: {team.winPct}%"></div>
                    </div>
                    <div class="allPlayPct">{team.winPct}%</div>
                </div>
            {/each}
        </div>
    {/if}
</div>
