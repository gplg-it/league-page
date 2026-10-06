<script>
    import { getTeamFromTeamManagers } from '$lib/utils/helper';

    let { powerIndex, closeGames, leagueTeamManagers } = $props();

    let sortKey = $state('dominance');
    let sortDir = $state(-1);

    const getManagerName = (rosterID) => {
        const team = getTeamFromTeamManagers(leagueTeamManagers, rosterID);
        return team?.team?.name || team?.team?.display_name || `Roster ${rosterID}`;
    };

    const getSorted = () => {
        if(!powerIndex) return [];
        return Object.values(powerIndex).sort((a, b) => {
            let aVal = a[sortKey] ?? 0;
            let bVal = b[sortKey] ?? 0;
            return sortDir * (aVal - bVal);
        });
    };

    const sort = (key) => {
        if(sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = -1; }
    };

    const getRankColor = (index) => {
        if(index === 0) return 'color: #FFD700; font-weight: 700;';
        if(index === 1) return 'color: #C0C0C0; font-weight: 600;';
        if(index === 2) return 'color: #CD7F32; font-weight: 600;';
        return '';
    };

    const getDominanceBar = (val) => {
        return `width: ${Math.min(val, 100)}%; background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 8px; border-radius: 4px;`;
    };

    const getCloseRecord = (rosterID) => {
        if(!closeGames || !closeGames[rosterID]) return { closeWins: 0, closeLosses: 0, blowoutWins: 0, blowoutLosses: 0 };
        return closeGames[rosterID];
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

    .rankingsList {
        max-width: 900px;
        margin: 0 auto;
    }

    .rankCard {
        display: grid;
        grid-template-columns: 40px 1fr 120px;
        gap: 1em;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1em;
        margin: 0 0 0.75em;
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

    @media (max-width: 600px) {
        .rankCard {
            grid-template-columns: 30px 1fr 80px;
            padding: 0.75em;
        }
        .scoreBox .score { font-size: 1.3em; }
    }
</style>

<div class="powerWrapper">
    <h2>Power Index</h2>
    <p class="description">Composite dominance ranking based on win rate, all-play, consistency, and lineup efficiency</p>

    <div class="rankingsList">
        {#each getSorted() as mgr, i}
            {@const close = getCloseRecord(mgr.rosterID)}
            <div class="rankCard">
                <div class="rankNum" style={getRankColor(i)}>{i + 1}</div>
                <div class="rankDetails">
                    <div class="name">{getManagerName(mgr.rosterID)}</div>
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
