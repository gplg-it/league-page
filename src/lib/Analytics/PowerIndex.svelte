<script>
    import { getTeamFromManagerID } from '$lib/utils/helper';
    import RadarChart from './RadarChart.svelte';

    let { powerIndex, closeGames, leagueTeamManagers } = $props();

    let sortKey = $state('dominance');
    let sortDir = $state(-1);
    let compareA = $state(null);
    let compareB = $state(null);
    let showCompare = $state(false);

    const getManagerName = (managerID) => {
        const team = getTeamFromManagerID(leagueTeamManagers, managerID);
        return team?.name || `Manager ${managerID}`;
    };

    let sorted = $derived.by(() => {
        if(!powerIndex) return [];
        return Object.values(powerIndex).sort((a, b) => {
            let aVal = a[sortKey] ?? 0;
            let bVal = b[sortKey] ?? 0;
            return sortDir * (aVal - bVal);
        });
    });

    let managerIDs = $derived(sorted.map(m => m.managerID));

    $effect(() => {
        if (managerIDs.length >= 2 && !compareA) {
            compareA = managerIDs[0];
            compareB = managerIDs[1];
        }
    });

    const sort = (key) => {
        if(sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = -1; }
    };

    const radarLabels = ['Win %', 'All-Play %', 'Consistency', 'Efficiency', 'Avg Pts'];

    const buildRadarData = (mgr) => {
        if (!mgr) return [];
        const maxAvg = Math.max(...sorted.map(m => parseFloat(m.avgPoints) || 0), 1);
        return [
            { value: parseFloat(mgr.winPct) || 0, max: 100 },
            { value: parseFloat(mgr.allPlayPct) || 0, max: 100 },
            { value: parseFloat(mgr.consistency) || 0, max: 100 },
            { value: parseFloat(mgr.efficiency) || 0, max: 100 },
            { value: parseFloat(mgr.avgPoints) || 0, max: Math.ceil(maxAvg * 1.1) },
        ];
    };

    let radarDatasets = $derived.by(() => {
        if (!powerIndex) return [];
        const mgrA = powerIndex[compareA];
        const mgrB = powerIndex[compareB];
        const sets = [];
        if (mgrA) sets.push({ label: getManagerName(compareA), color: '#920505', data: buildRadarData(mgrA) });
        if (mgrB && compareB !== compareA) sets.push({ label: getManagerName(compareB), color: '#4a90d9', data: buildRadarData(mgrB) });
        return sets;
    });

    const getRankColor = (index) => {
        if(index === 0) return 'color: #FFD700; font-weight: 700;';
        if(index === 1) return 'color: #C0C0C0; font-weight: 600;';
        if(index === 2) return 'color: #CD7F32; font-weight: 600;';
        return '';
    };

    const getRankCardStyle = (index) => {
        if (index === 0) return 'border-color: #FFD700; background: linear-gradient(135deg, rgba(255,215,0,0.06) 0%, transparent 60%);';
        if (index === 1) return 'border-color: #C0C0C0; background: linear-gradient(135deg, rgba(192,192,192,0.06) 0%, transparent 60%);';
        if (index === 2) return 'border-color: #CD7F32; background: linear-gradient(135deg, rgba(205,127,50,0.06) 0%, transparent 60%);';
        return '';
    };

    const getDominanceBar = (val) => {
        return `width: ${Math.min(val, 100)}%; background: linear-gradient(90deg, #920505, #c0392b); height: 8px; border-radius: 4px;`;
    };

    const getCloseRecord = (managerID) => {
        if(!closeGames || !closeGames[managerID]) return { closeWins: 0, closeLosses: 0, blowoutWins: 0, blowoutLosses: 0 };
        return closeGames[managerID];
    };
</script>

<style>
    .powerWrapper {
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
        margin: 0 0 1.5em;
    }

    .viewToggle {
        display: flex;
        justify-content: center;
        gap: 4px;
        margin: 0 0 1.5em;
    }

    .viewBtn {
        padding: 8px 18px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85em;
        background: var(--fff);
        color: var(--g333);
    }

    .viewBtn.active {
        background: #920505;
        color: #fff;
        border-color: #920505;
    }

    .viewBtn:hover:not(.active) {
        border-color: #920505;
        color: #920505;
    }

    .compareSection {
        max-width: 900px;
        margin: 0 auto 2em;
    }

    .compareControls {
        display: flex;
        justify-content: center;
        gap: 1em;
        margin: 0 0 1em;
        flex-wrap: wrap;
        align-items: center;
    }

    .compareControls select {
        padding: 8px 12px;
        border: 1px solid var(--eee, #ddd);
        border-radius: 6px;
        font-size: 0.9em;
        background: var(--f3f3f3, #f3f3f3);
        color: inherit;
    }

    .vsLabel {
        font-weight: 700;
        font-size: 1.1em;
        color: #888;
    }

    .compareLegend {
        display: flex;
        justify-content: center;
        gap: 2em;
        margin: 0.5em 0;
        font-size: 0.85em;
    }

    .legendItem {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .legendDot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .compareStats {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 0;
        max-width: 700px;
        margin: 1.5em auto 0;
        font-size: 0.85em;
    }

    .compareStat {
        display: contents;
    }

    .compareStat .valA, .compareStat .valB {
        padding: 6px 12px;
        font-weight: 600;
    }

    .compareStat .valA {
        text-align: right;
        color: #920505;
    }

    .compareStat .valB {
        text-align: left;
        color: #4a90d9;
    }

    .compareStat .statLabel {
        text-align: center;
        padding: 6px 16px;
        color: #888;
        border-left: 1px solid var(--eee, #eee);
        border-right: 1px solid var(--eee, #eee);
        white-space: nowrap;
    }

    .winner {
        font-weight: 700;
    }

    .rankingsList {
        max-width: 900px;
        margin: 0 auto;
    }

    .rankCard {
        display: grid;
        grid-template-columns: 40px 1fr 100px;
        gap: 1em;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1em;
        margin: 0 0 0.75em;
        transition: transform 0.15s, box-shadow 0.15s;
    }

    .rankCard:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .rankNum {
        font-size: 1.5em;
        font-weight: 700;
        text-align: center;
    }

    .rankDetails .name {
        font-weight: 600;
        font-size: 1.05em;
        margin: 0 0 0.35em;
    }

    .statRow {
        display: flex;
        gap: 1em;
        font-size: 0.8em;
        color: #666;
        flex-wrap: wrap;
    }

    .statRow span {
        white-space: nowrap;
    }

    .barWrapper {
        width: 100%;
        background: #eee;
        border-radius: 4px;
        margin-top: 0.35em;
        height: 8px;
    }

    .scoreBox {
        text-align: center;
    }

    .scoreBox .score {
        font-size: 1.8em;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .scoreBox .label {
        font-size: 0.7em;
        color: #888;
        text-transform: uppercase;
    }

    .formula {
        text-align: center;
        font-size: 0.75em;
        color: #999;
        margin: 1.5em 0 0;
    }

    .sectionLabel {
        text-align: center;
        font-size: 0.75em;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #999;
        margin: 2em 0 1em;
    }

    @media (max-width: 540px) {
        .rankCard {
            grid-template-columns: 30px 1fr 70px;
            padding: 0.75em;
        }
        .scoreBox .score { font-size: 1.3em; }
        .compareStats {
            font-size: 0.8em;
        }
        .compareStat .statLabel {
            padding: 6px 8px;
        }
    }
</style>

<div class="powerWrapper">
    <h2>Power Index</h2>
    <p class="description">Composite dominance ranking based on win rate, all-play, consistency, and lineup efficiency</p>

    <div class="viewToggle">
        <button class="viewBtn" class:active={!showCompare} onclick={() => showCompare = false}>Rankings</button>
        <button class="viewBtn" class:active={showCompare} onclick={() => showCompare = true}>Compare</button>
    </div>

    {#if showCompare && sorted.length >= 2}
        <div class="compareSection">
            <div class="compareControls">
                <select bind:value={compareA}>
                    {#each managerIDs as mID}
                        <option value={mID}>{getManagerName(mID)}</option>
                    {/each}
                </select>
                <span class="vsLabel">vs</span>
                <select bind:value={compareB}>
                    {#each managerIDs as mID}
                        <option value={mID}>{getManagerName(mID)}</option>
                    {/each}
                </select>
            </div>

            <div class="compareLegend">
                <div class="legendItem">
                    <div class="legendDot" style="background: #920505;"></div>
                    <span>{getManagerName(compareA)}</span>
                </div>
                {#if compareA !== compareB}
                    <div class="legendItem">
                        <div class="legendDot" style="background: #4a90d9;"></div>
                        <span>{getManagerName(compareB)}</span>
                    </div>
                {/if}
            </div>

            <RadarChart datasets={radarDatasets} labels={radarLabels} size={340} />

            {#if compareA !== compareB && powerIndex[compareA] && powerIndex[compareB]}
                {@const a = powerIndex[compareA]}
                {@const b = powerIndex[compareB]}
                {@const stats = [
                    { label: 'Power', a: a.dominance, b: b.dominance },
                    { label: 'Win %', a: a.winPct, b: b.winPct },
                    { label: 'All-Play %', a: a.allPlayPct, b: b.allPlayPct },
                    { label: 'Consistency', a: a.consistency, b: b.consistency },
                    { label: 'Efficiency', a: a.efficiency, b: b.efficiency },
                    { label: 'Avg Pts', a: a.avgPoints, b: b.avgPoints },
                ]}
                <div class="compareStats">
                    {#each stats as stat}
                        {@const aVal = parseFloat(stat.a)}
                        {@const bVal = parseFloat(stat.b)}
                        <div class="compareStat">
                            <div class="valA" class:winner={aVal > bVal}>{stat.a}</div>
                            <div class="statLabel">{stat.label}</div>
                            <div class="valB" class:winner={bVal > aVal}>{stat.b}</div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <div class="sectionLabel">{showCompare ? 'Full Rankings' : ''}</div>

    <div class="rankingsList">
        {#each sorted as mgr, i}
            {@const close = getCloseRecord(mgr.managerID)}
            <div class="rankCard" style={getRankCardStyle(i)}>
                <div class="rankNum" style={getRankColor(i)}>{i + 1}</div>
                <div class="rankDetails">
                    <div class="name">{getManagerName(mgr.managerID)}</div>
                    <div class="statRow">
                        <span>Win: {mgr.winPct}%</span>
                        <span>All-Play: {mgr.allPlayPct}%</span>
                        <span>Consistency: {mgr.consistency}%</span>
                        <span>Efficiency: {mgr.efficiency}%</span>
                    </div>
                    <div class="statRow">
                        <span>Avg: {mgr.avgPoints}</span>
                        <span>Close: {close.closeWins}W-{close.closeLosses}L</span>
                        <span>Blowout: {close.blowoutWins}W-{close.blowoutLosses}L</span>
                    </div>
                    <div class="barWrapper">
                        <div style={getDominanceBar(mgr.dominance)}></div>
                    </div>
                </div>
                <div class="scoreBox">
                    <div class="score">{mgr.dominance}</div>
                    <div class="label">Power</div>
                </div>
            </div>
        {/each}
    </div>

    <p class="formula">Formula: 35% Win Rate + 30% All-Play Win% + 20% Consistency + 15% Lineup Efficiency</p>
</div>
