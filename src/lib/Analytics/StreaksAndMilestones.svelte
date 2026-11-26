<script>
    import { getTeamFromManagerID } from '$lib/utils/helper';

    let { streaksAndMilestones, leagueTeamManagers } = $props();

    let view = $state('records');

    const getManagerName = (managerID) => {
        const team = getTeamFromManagerID(leagueTeamManagers, managerID);
        return team?.name || `Manager ${managerID}`;
    };

    const getStreakLabel = (streak) => {
        if(!streak || !streak.type) return '-';
        return `${streak.type}${streak.count}`;
    };

    const getMilestonesSorted = () => {
        if(!streaksAndMilestones?.milestones) return [];
        return Object.entries(streaksAndMilestones.milestones)
            .map(([mID, data]) => ({ managerID: mID, ...data }))
            .sort((a, b) => b.bestWinStreak - a.bestWinStreak);
    };

    let summaryStats = $derived.by(() => {
        const s = streaksAndMilestones;
        if(!s) return null;
        const milestones = s.milestones ? Object.values(s.milestones) : [];
        const longestWinStreak = Math.max(...milestones.map(m => m.bestWinStreak || 0), 0);
        const longestWinHolder = milestones.find(m => m.bestWinStreak === longestWinStreak);
        const longestWinID = longestWinHolder ? Object.entries(s.milestones).find(([, v]) => v === longestWinHolder)?.[0] : null;
        const totalGames = (s.highScores?.length || 0) + (s.blowouts?.length || 0) + (s.nailbiters?.length || 0);
        const biggestBlowout = s.blowouts?.[0];
        const closestGame = s.nailbiters?.[0];
        const topScore = s.highScores?.[0];
        return { longestWinStreak, longestWinID, totalGames, biggestBlowout, closestGame, topScore };
    });

    let blowoutMaxMargin = $derived(
        Math.max(...(streaksAndMilestones?.blowouts || []).map(g => g.margin), 1)
    );
    let nailbiterMaxMargin = $derived(
        Math.max(...(streaksAndMilestones?.nailbiters || []).map(g => g.margin), 1)
    );
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

    /* Summary stats row */
    .summaryRow {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1em;
        margin: 0 0 2em;
    }

    .summaryCard {
        background: var(--f3f3f3);
        border-radius: 10px;
        padding: 1em 1.5em;
        text-align: center;
        min-width: 140px;
        flex: 1;
        max-width: 200px;
        border: 1px solid var(--eee);
        animation: fadeSlideUp 0.5s ease forwards;
        opacity: 0;
    }

    .summaryCard:nth-child(1) { animation-delay: 0s; }
    .summaryCard:nth-child(2) { animation-delay: 0.1s; }
    .summaryCard:nth-child(3) { animation-delay: 0.2s; }
    .summaryCard:nth-child(4) { animation-delay: 0.3s; }

    @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .summaryCard .statValue {
        font-size: 1.8em;
        font-weight: 800;
        color: #920505;
        line-height: 1.1;
    }

    .summaryCard .statLabel {
        font-size: 0.72em;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
    }

    .summaryCard .statSub {
        font-size: 0.75em;
        color: #666;
        margin-top: 2px;
    }

    /* View toggle */
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
        transition: all 0.2s;
    }

    .viewToggle button.active {
        background: #920505;
        color: #fff;
        border-color: #920505;
    }

    .viewToggle button:hover:not(.active) {
        border-color: #920505;
        color: #920505;
    }

    /* Achievement cards for streaks */
    .recordsGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1em;
        margin: 0 0 2em;
    }

    .achievementCard {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 1.2em;
        text-align: center;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .achievementCard:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    }

    .achievementCard.hotStreak {
        border-color: #4CAF50;
        box-shadow: 0 0 0 1px rgba(76, 175, 80, 0.2);
    }

    .achievementCard.coldStreak {
        border-color: #f44336;
        box-shadow: 0 0 0 1px rgba(244, 67, 54, 0.1);
    }

    .cardHeader {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 0.6em;
    }

    .cardHeader .name {
        font-weight: 700;
        font-size: 1em;
    }

    .fireIcon {
        display: inline-block;
        animation: flicker 0.6s ease-in-out infinite alternate;
    }

    @keyframes flicker {
        from { transform: scale(1) rotate(-3deg); opacity: 0.9; }
        to { transform: scale(1.1) rotate(3deg); opacity: 1; }
    }

    .streakBadge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 16px;
        border-radius: 20px;
        font-weight: 800;
        font-size: 1.3em;
        margin: 0.3em 0;
        gap: 4px;
    }

    .streakBadge.win { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
    .streakBadge.loss { background: rgba(244, 67, 54, 0.15); color: #F44336; }
    .streakBadge.none { color: #aaa; font-size: 1em; }

    .streakBadge.pulsing {
        animation: pulseGlow 1.5s ease-in-out infinite;
    }

    @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.3); }
        50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
    }

    .progressSection {
        margin-top: 0.6em;
    }

    .progressLabel {
        font-size: 0.72em;
        color: #999;
        margin-bottom: 4px;
    }

    .progressTrack {
        height: 6px;
        background: var(--eee);
        border-radius: 3px;
        overflow: hidden;
    }

    .progressFill {
        height: 100%;
        border-radius: 3px;
        background: linear-gradient(90deg, #920505, #d94a4a);
        transition: width 0.5s ease;
    }

    .detail {
        font-size: 0.8em;
        color: #888;
        margin-top: 0.3em;
    }

    /* Podium display */
    .podiumSection {
        margin: 1em 0 2em;
    }

    .podium {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 0;
        max-width: 600px;
        margin: 0 auto 2em;
    }

    .podiumStep {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        max-width: 180px;
        animation: podiumRise 0.6s ease forwards;
        opacity: 0;
    }

    .podiumStep:nth-child(1) { animation-delay: 0.3s; }
    .podiumStep:nth-child(2) { animation-delay: 0.1s; }
    .podiumStep:nth-child(3) { animation-delay: 0.5s; }

    @keyframes podiumRise {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .podiumInfo {
        text-align: center;
        margin-bottom: 8px;
    }

    .podiumName {
        font-weight: 700;
        font-size: 0.85em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
    }

    .podiumScore {
        font-size: 1.2em;
        font-weight: 800;
    }

    .podiumMeta {
        font-size: 0.7em;
        color: #888;
    }

    .podiumBlock {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px 6px 0 0;
        font-size: 2em;
        font-weight: 900;
        color: rgba(255,255,255,0.9);
    }

    .podiumBlock.first {
        height: 120px;
        background: linear-gradient(180deg, #FFD700, #DAA520);
    }

    .podiumBlock.second {
        height: 85px;
        background: linear-gradient(180deg, #C0C0C0, #A0A0A0);
    }

    .podiumBlock.third {
        height: 60px;
        background: linear-gradient(180deg, #CD7F32, #A0622E);
    }

    .trophySvg {
        display: block;
        margin: 0 auto 4px;
    }

    /* Matchup cards */
    .matchupCards {
        display: flex;
        flex-direction: column;
        gap: 0.75em;
        max-width: 700px;
        margin: 1em auto 2em;
    }

    .matchupCard {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 0.5em;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 1em;
        transition: transform 0.15s;
        animation: fadeSlideUp 0.4s ease forwards;
        opacity: 0;
    }

    .matchupCard:nth-child(1) { animation-delay: 0s; }
    .matchupCard:nth-child(2) { animation-delay: 0.08s; }
    .matchupCard:nth-child(3) { animation-delay: 0.16s; }
    .matchupCard:nth-child(4) { animation-delay: 0.24s; }
    .matchupCard:nth-child(5) { animation-delay: 0.32s; }

    .matchupCard:hover {
        transform: scale(1.01);
    }

    .matchupSide {
        text-align: center;
    }

    .matchupSide .teamName {
        font-size: 0.82em;
        font-weight: 600;
        margin-bottom: 2px;
    }

    .matchupSide .teamScore {
        font-size: 1.5em;
        font-weight: 800;
    }

    .matchupSide.winner .teamScore { color: #4CAF50; }
    .matchupSide.loser .teamScore { color: #999; }

    .matchupCenter {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 0 0.5em;
    }

    .vsLabel {
        font-size: 0.65em;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #aaa;
    }

    .marginBadge {
        font-size: 0.85em;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 12px;
        white-space: nowrap;
    }

    .marginMeter {
        width: 60px;
        height: 4px;
        border-radius: 2px;
        background: var(--eee);
        overflow: hidden;
    }

    .marginMeterFill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease;
    }

    .matchupMeta {
        font-size: 0.65em;
        color: #999;
    }

    .rankBadge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 0.7em;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
    }

    .rankBadge.r1 { background: #FFD700; color: #333; }
    .rankBadge.r2 { background: #C0C0C0; color: #333; }
    .rankBadge.r3 { background: #CD7F32; }
    .rankBadge.r4, .rankBadge.r5 { background: #888; }

    /* Full data table */
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

    .tableLabel {
        text-align: center;
        font-size: 0.8em;
        color: #999;
        margin: 2em 0 0.5em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .gold { color: #FFD700; font-weight: 700; }
    .silver { color: #C0C0C0; font-weight: 600; }
    .bronze { color: #CD7F32; font-weight: 600; }

    @media (max-width: 540px) {
        .viewToggle button {
            font-size: 0.7em;
            padding: 5px 10px;
            margin: 2px;
        }

        .summaryRow {
            gap: 0.5em;
        }

        .summaryCard {
            min-width: 100px;
            padding: 0.8em 1em;
        }

        .summaryCard .statValue {
            font-size: 1.4em;
        }

        .podium {
            gap: 0;
        }

        .podiumBlock.first { height: 90px; }
        .podiumBlock.second { height: 65px; }
        .podiumBlock.third { height: 45px; }

        .podiumName {
            font-size: 0.72em;
            max-width: 100px;
        }

        .podiumScore {
            font-size: 1em;
        }

        .matchupCard {
            padding: 0.75em;
        }

        .matchupSide .teamScore {
            font-size: 1.2em;
        }

        .matchupSide .teamName {
            font-size: 0.72em;
        }

        .recordsGrid {
            grid-template-columns: 1fr 1fr;
            gap: 0.5em;
        }

        .achievementCard {
            padding: 0.8em;
        }
    }
</style>

<div class="streaksWrapper">
    <h2>Records & Milestones</h2>
    <p class="description">Win streaks, record performances, and league highlights</p>

    {#if summaryStats}
        <div class="summaryRow">
            <div class="summaryCard">
                <div class="statValue">{summaryStats.longestWinStreak}</div>
                <div class="statLabel">Longest Win Streak</div>
                {#if summaryStats.longestWinID}
                    <div class="statSub">{getManagerName(summaryStats.longestWinID)}</div>
                {/if}
            </div>
            {#if summaryStats.topScore}
                <div class="summaryCard">
                    <div class="statValue">{summaryStats.topScore.points.toFixed(1)}</div>
                    <div class="statLabel">All-Time High Score</div>
                    <div class="statSub">{getManagerName(summaryStats.topScore.managerID)}</div>
                </div>
            {/if}
            {#if summaryStats.biggestBlowout}
                <div class="summaryCard">
                    <div class="statValue">{summaryStats.biggestBlowout.margin.toFixed(1)}</div>
                    <div class="statLabel">Biggest Blowout</div>
                    <div class="statSub">{summaryStats.biggestBlowout.year} Wk {summaryStats.biggestBlowout.week}</div>
                </div>
            {/if}
            {#if summaryStats.closestGame}
                <div class="summaryCard">
                    <div class="statValue">{summaryStats.closestGame.margin.toFixed(1)}</div>
                    <div class="statLabel">Closest Game</div>
                    <div class="statSub">{summaryStats.closestGame.year} Wk {summaryStats.closestGame.week}</div>
                </div>
            {/if}
        </div>
    {/if}

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
                {@const isHot = mgr.currentStreak?.type === 'W' && mgr.currentStreak?.count >= 3}
                {@const isCold = mgr.currentStreak?.type === 'L' && mgr.currentStreak?.count >= 3}
                {@const progressPct = mgr.bestWinStreak > 0 && mgr.currentStreak?.type === 'W' ? Math.min(mgr.currentStreak.count / mgr.bestWinStreak * 100, 100) : 0}
                <div class="achievementCard" class:hotStreak={isHot} class:coldStreak={isCold}>
                    <div class="cardHeader">
                        {#if isHot}
                            <span class="fireIcon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 23C6.5 23 2 18.5 2 13c0-3.5 2-6.5 4-8.5C7 3.5 8 2 8 2s1 2 1.5 3c.3.6.5 1.2.5 1.2S11 4 13 2c0 0 1 3 1 5 0 1-.5 2-.5 2s1.5-1 2.5-1c1.5 0 3 1.5 4 3.5 1 2 1 4 1 4s0 7.5-9 7.5z" fill="#FF6B35"/>
                                    <path d="M12 23c-3 0-5.5-2.5-5.5-5.5S9 12 12 10c3 2 5.5 4 5.5 7.5S15 23 12 23z" fill="#FFD700"/>
                                </svg>
                            </span>
                        {/if}
                        <span class="name">{getManagerName(mgr.managerID)}</span>
                        {#if isHot}
                            <span class="fireIcon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 23C6.5 23 2 18.5 2 13c0-3.5 2-6.5 4-8.5C7 3.5 8 2 8 2s1 2 1.5 3c.3.6.5 1.2.5 1.2S11 4 13 2c0 0 1 3 1 5 0 1-.5 2-.5 2s1.5-1 2.5-1c1.5 0 3 1.5 4 3.5 1 2 1 4 1 4s0 7.5-9 7.5z" fill="#FF6B35"/>
                                    <path d="M12 23c-3 0-5.5-2.5-5.5-5.5S9 12 12 10c3 2 5.5 4 5.5 7.5S15 23 12 23z" fill="#FFD700"/>
                                </svg>
                            </span>
                        {/if}
                    </div>

                    <div class="streakBadge"
                        class:win={mgr.currentStreak?.type === 'W'}
                        class:loss={mgr.currentStreak?.type === 'L'}
                        class:none={!mgr.currentStreak?.type}
                        class:pulsing={isHot}>
                        {getStreakLabel(mgr.currentStreak)}
                    </div>

                    {#if mgr.currentStreak?.type === 'W' && mgr.bestWinStreak > 0}
                        <div class="progressSection">
                            <div class="progressLabel">{mgr.currentStreak.count} / {mgr.bestWinStreak} personal best</div>
                            <div class="progressTrack">
                                <div class="progressFill" style="width: {progressPct}%"></div>
                            </div>
                        </div>
                    {/if}

                    <div class="detail">Best Win Streak: {mgr.bestWinStreak}</div>
                    <div class="detail">Worst Loss Streak: {mgr.bestLossStreak}</div>
                </div>
            {/each}
        </div>

    {:else if view === 'highScores'}
        <div class="podiumSection">
            <h3>Highest Single-Week Scores</h3>
            {#if (streaksAndMilestones?.highScores || []).length >= 3}
                {@const scores = streaksAndMilestones.highScores}
                <div class="podium">
                    <!-- 2nd place -->
                    <div class="podiumStep">
                        <svg class="trophySvg" width="32" height="32" viewBox="0 0 32 32">
                            <circle cx="16" cy="12" r="10" fill="#C0C0C0" opacity="0.2"/>
                            <path d="M16 4l3 6h7l-5.5 4.5 2 7L16 17l-6.5 4.5 2-7L6 10h7z" fill="#C0C0C0"/>
                        </svg>
                        <div class="podiumInfo">
                            <div class="podiumName">{getManagerName(scores[1].managerID)}</div>
                            <div class="podiumScore" style="color: #A0A0A0">{scores[1].points.toFixed(1)}</div>
                            <div class="podiumMeta">{scores[1].year} Wk {scores[1].week}</div>
                        </div>
                        <div class="podiumBlock second">2</div>
                    </div>

                    <!-- 1st place -->
                    <div class="podiumStep">
                        <svg class="trophySvg" width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="20" cy="15" r="13" fill="#FFD700" opacity="0.15"/>
                            <path d="M20 3l4.5 9h10l-8 6.5 3 10L20 22l-9.5 6.5 3-10-8-6.5h10z" fill="#FFD700"/>
                            <path d="M14 32h12v3H14z" fill="#DAA520" rx="1"/>
                        </svg>
                        <div class="podiumInfo">
                            <div class="podiumName">{getManagerName(scores[0].managerID)}</div>
                            <div class="podiumScore" style="color: #DAA520">{scores[0].points.toFixed(1)}</div>
                            <div class="podiumMeta">{scores[0].year} Wk {scores[0].week}</div>
                        </div>
                        <div class="podiumBlock first">1</div>
                    </div>

                    <!-- 3rd place -->
                    <div class="podiumStep">
                        <svg class="trophySvg" width="28" height="28" viewBox="0 0 32 32">
                            <circle cx="16" cy="12" r="9" fill="#CD7F32" opacity="0.15"/>
                            <path d="M16 5l2.5 5h6l-4.5 3.5 1.5 6L16 16l-5.5 3.5 1.5-6L7.5 10h6z" fill="#CD7F32"/>
                        </svg>
                        <div class="podiumInfo">
                            <div class="podiumName">{getManagerName(scores[2].managerID)}</div>
                            <div class="podiumScore" style="color: #CD7F32">{scores[2].points.toFixed(1)}</div>
                            <div class="podiumMeta">{scores[2].year} Wk {scores[2].week}</div>
                        </div>
                        <div class="podiumBlock third">3</div>
                    </div>
                </div>
            {/if}

            <p class="tableLabel">Complete Leaderboard</p>
            <div class="tableWrapper">
                <table class="listTable">
                    <thead>
                        <tr><th>#</th><th>Manager</th><th>Points</th><th>Season</th><th>Week</th></tr>
                    </thead>
                    <tbody>
                        {#each streaksAndMilestones?.highScores || [] as score, i}
                            <tr>
                                <td class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>{i + 1}</td>
                                <td>{getManagerName(score.managerID)}</td>
                                <td>{score.points.toFixed(1)}</td>
                                <td>{score.year}</td>
                                <td>{score.week}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

    {:else if view === 'blowouts'}
        <h3>Biggest Blowouts</h3>

        <div class="matchupCards">
            {#each (streaksAndMilestones?.blowouts || []).slice(0, 5) as game, i}
                {@const meterPct = game.margin / blowoutMaxMargin * 100}
                <div class="matchupCard">
                    <div class="matchupSide winner">
                        <div class="teamName">{getManagerName(game.winnerID)}</div>
                        <div class="teamScore">{game.winnerPts.toFixed(1)}</div>
                    </div>
                    <div class="matchupCenter">
                        <div class="rankBadge" class:r1={i === 0} class:r2={i === 1} class:r3={i === 2} class:r4={i === 3} class:r5={i === 4}>{i + 1}</div>
                        <div class="vsLabel">vs</div>
                        <div class="marginBadge" style="background: rgba(76, 175, 80, 0.12); color: #4CAF50;">+{game.margin.toFixed(1)}</div>
                        <div class="marginMeter">
                            <div class="marginMeterFill" style="width: {meterPct}%; background: linear-gradient(90deg, #81C784, #2E7D32);"></div>
                        </div>
                        <div class="matchupMeta">{game.year} Wk {game.week}</div>
                    </div>
                    <div class="matchupSide loser">
                        <div class="teamName">{getManagerName(game.loserID)}</div>
                        <div class="teamScore">{game.loserPts.toFixed(1)}</div>
                    </div>
                </div>
            {/each}
        </div>

        {#if (streaksAndMilestones?.blowouts || []).length > 5}
            <p class="tableLabel">All Blowouts</p>
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
                                <td style="font-weight:700; color: #4CAF50;">+{game.margin.toFixed(1)}</td>
                                <td>{game.year}</td>
                                <td>{game.week}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

    {:else if view === 'nailbiters'}
        <h3>Closest Games</h3>

        <div class="matchupCards">
            {#each (streaksAndMilestones?.nailbiters || []).slice(0, 5) as game, i}
                {@const meterPct = (1 - game.margin / nailbiterMaxMargin) * 100}
                <div class="matchupCard">
                    <div class="matchupSide winner">
                        <div class="teamName">{getManagerName(game.winnerID)}</div>
                        <div class="teamScore">{game.winnerPts.toFixed(1)}</div>
                    </div>
                    <div class="matchupCenter">
                        <div class="rankBadge" class:r1={i === 0} class:r2={i === 1} class:r3={i === 2} class:r4={i === 3} class:r5={i === 4}>{i + 1}</div>
                        <div class="vsLabel">vs</div>
                        <div class="marginBadge" style="background: rgba(244, 67, 54, 0.12); color: #f44336;">{game.margin.toFixed(1)}</div>
                        <div class="marginMeter">
                            <div class="marginMeterFill" style="width: {meterPct}%; background: linear-gradient(90deg, #ef5350, #920505);"></div>
                        </div>
                        <div class="matchupMeta">{game.year} Wk {game.week}</div>
                    </div>
                    <div class="matchupSide loser">
                        <div class="teamName">{getManagerName(game.loserID)}</div>
                        <div class="teamScore">{game.loserPts.toFixed(1)}</div>
                    </div>
                </div>
            {/each}
        </div>

        {#if (streaksAndMilestones?.nailbiters || []).length > 5}
            <p class="tableLabel">All Close Games</p>
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
                                <td style="font-weight:700; color: #f44336;">{game.margin.toFixed(1)}</td>
                                <td>{game.year}</td>
                                <td>{game.week}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    {/if}
</div>
