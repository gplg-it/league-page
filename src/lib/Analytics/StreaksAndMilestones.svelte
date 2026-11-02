<script>
    import { getTeamFromTeamManagers } from '$lib/utils/helper';

    let { streaksAndMilestones, leagueTeamManagers } = $props();

    let view = $state('records');

    const getManagerName = (rosterID) => {
        const team = getTeamFromTeamManagers(leagueTeamManagers, rosterID);
        return team?.team?.name || team?.team?.display_name || `Roster ${rosterID}`;
    };

    const getStreakLabel = (streak) => {
        if(!streak || !streak.type) return '-';
        return `${streak.type}${streak.count}`;
    };

    const getMilestonesSorted = () => {
        if(!streaksAndMilestones?.milestones) return [];
        return Object.entries(streaksAndMilestones.milestones)
            .map(([rid, data]) => ({ rosterID: rid, ...data }))
            .sort((a, b) => b.bestWinStreak - a.bestWinStreak);
    };
</script>

<style>
    .streaksWrapper {
        margin: 2em 0;
    }

    h2, h3 {
        text-align: center;
        margin: 0 0 0.5em;
    }

    h3 { margin-top: 1.5em; }

    .description {
        text-align: center;
        color: #888;
        font-size: 0.85em;
        margin: 0 0 1em;
    }

    .viewToggle {
        text-align: center;
        margin: 0 0 1.5em;
    }

    .viewToggle button {
        padding: 6px 16px;
        margin: 0 4px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        background: var(--fff);
        color: var(--g333);
        font-size: 0.85em;
    }

    .viewToggle button.active {
        background: #920505;
        color: #fff;
        border-color: #920505;
    }

    .recordsGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1em;
        margin: 0 0 2em;
    }

    .recordCard {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1em;
        text-align: center;
    }

    .recordCard .name {
        font-weight: 600;
        margin: 0 0 0.5em;
    }

    .streakBadge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1.2em;
        margin: 0.25em 0;
    }

    .streakBadge.win { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
    .streakBadge.loss { background: rgba(244, 67, 54, 0.15); color: #F44336; }
    .streakBadge.none { color: #888; }

    .detail {
        font-size: 0.8em;
        color: #888;
        margin-top: 0.25em;
    }

    .listTable {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85em;
    }

    .listTable th, .listTable td {
        border: 1px solid #ddd;
        padding: 8px 10px;
        text-align: center;
    }

    .listTable th {
        background: var(--f8f8f8);
        font-weight: 600;
    }

    .tableWrapper {
        overflow-x: auto;
    }

    .gold { color: #FFD700; font-weight: 700; }
    .silver { color: #C0C0C0; font-weight: 600; }
    .bronze { color: #CD7F32; font-weight: 600; }
</style>

<div class="streaksWrapper">
    <h2>Streaks & Milestones</h2>
    <p class="description">Win streaks, record performances, and league highlights</p>

    <div class="viewToggle">
        <button class:active={view === 'records'} onclick={() => view = 'records'}>Streaks</button>
        <button class:active={view === 'highScores'} onclick={() => view = 'highScores'}>Top Scores</button>
        <button class:active={view === 'blowouts'} onclick={() => view = 'blowouts'}>Blowouts</button>
        <button class:active={view === 'nailbiters'} onclick={() => view = 'nailbiters'}>Nail-Biters</button>
    </div>

    {#if view === 'records'}
        <h3>Current & Best Streaks</h3>
        <div class="recordsGrid">
            {#each getMilestonesSorted() as mgr}
                <div class="recordCard">
                    <div class="name">{getManagerName(mgr.rosterID)}</div>
                    <div class="streakBadge" class:win={mgr.currentStreak?.type === 'W'} class:loss={mgr.currentStreak?.type === 'L'} class:none={!mgr.currentStreak?.type}>
                        {getStreakLabel(mgr.currentStreak)}
                    </div>
                    <div class="detail">Best Win Streak: {mgr.bestWinStreak}</div>
                    <div class="detail">Worst Loss Streak: {mgr.bestLossStreak}</div>
                </div>
            {/each}
        </div>
    {:else if view === 'highScores'}
        <h3>Highest Single-Week Scores</h3>
        <div class="tableWrapper">
            <table class="listTable">
                <thead>
                    <tr><th>#</th><th>Manager</th><th>Points</th><th>Season</th><th>Week</th></tr>
                </thead>
                <tbody>
                    {#each streaksAndMilestones?.highScores || [] as score, i}
                        <tr>
                            <td class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>{i + 1}</td>
                            <td>{getManagerName(score.rosterID)}</td>
                            <td>{score.points.toFixed(1)}</td>
                            <td>{score.year}</td>
                            <td>{score.week}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else if view === 'blowouts'}
        <h3>Biggest Blowouts</h3>
        <div class="tableWrapper">
            <table class="listTable">
                <thead>
                    <tr><th>#</th><th>Winner</th><th>Score</th><th>Loser</th><th>Score</th><th>Margin</th><th>Season</th><th>Wk</th></tr>
                </thead>
                <tbody>
                    {#each streaksAndMilestones?.blowouts || [] as game, i}
                        <tr>
                            <td>{i + 1}</td>
                            <td>{getManagerName(game.winnerID)}</td>
                            <td>{game.winnerPts.toFixed(1)}</td>
                            <td>{getManagerName(game.loserID)}</td>
                            <td>{game.loserPts.toFixed(1)}</td>
                            <td style="font-weight:700;">{game.margin.toFixed(1)}</td>
                            <td>{game.year}</td>
                            <td>{game.week}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else if view === 'nailbiters'}
        <h3>Closest Games</h3>
        <div class="tableWrapper">
            <table class="listTable">
                <thead>
                    <tr><th>#</th><th>Winner</th><th>Score</th><th>Loser</th><th>Score</th><th>Margin</th><th>Season</th><th>Wk</th></tr>
                </thead>
                <tbody>
                    {#each streaksAndMilestones?.nailbiters || [] as game, i}
                        <tr>
                            <td>{i + 1}</td>
                            <td>{getManagerName(game.winnerID)}</td>
                            <td>{game.winnerPts.toFixed(1)}</td>
                            <td>{getManagerName(game.loserID)}</td>
                            <td>{game.loserPts.toFixed(1)}</td>
                            <td style="font-weight:700;">{game.margin.toFixed(1)}</td>
                            <td>{game.year}</td>
                            <td>{game.week}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
