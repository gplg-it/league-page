<script>
    import Button, { Group, Label } from '@smui/button';
    import ManagerStats from './ManagerStats.svelte';
    import LuckAnalysis from './LuckAnalysis.svelte';
    import ScoringTrends from './ScoringTrends.svelte';
    import SeasonComparison from './SeasonComparison.svelte';
    import HeadToHead from './HeadToHead.svelte';
    import StreaksAndMilestones from './StreaksAndMilestones.svelte';
    import PowerIndex from './PowerIndex.svelte';
    import MediaWall from './MediaWall.svelte';
    import RulesEvolution from './RulesEvolution.svelte';
    import { getLeagueAnalytics } from '$lib/utils/helper';
    import { excludeFormerManagers } from '$lib/stores';

    let {analyticsData, leagueTeamManagers} = $props();

    let managerAnalytics = $state();
    let matchupInsights = $state();
    let scoringTrends = $state();
    let luckAnalysis = $state();
    let headToHead = $state();
    let streaksAndMilestones = $state();
    let powerIndex = $state();
    let closeGames = $state();
    let allSeasons = $state();
    let formerManagerIDs = $state([]);
    let stale = $state(false);
    let showFormer = $state(false);

    const refreshAnalytics = async () => {
        const newData = await getLeagueAnalytics(true);
        updateFromData(newData);
    };

    const updateFromData = (data) => {
        managerAnalytics = data.managerAnalytics;
        matchupInsights = data.matchupInsights;
        scoringTrends = data.scoringTrends;
        luckAnalysis = data.luckAnalysis;
        headToHead = data.headToHead;
        streaksAndMilestones = data.streaksAndMilestones;
        powerIndex = data.powerIndex;
        closeGames = data.closeGames;
        allSeasons = data.allSeasons;
        formerManagerIDs = data.formerManagerIDs || [];
    };

    $effect(() => {
        if(analyticsData) {
            updateFromData(analyticsData);
            if(analyticsData.stale) {
                stale = true;
                refreshAnalytics();
            }
        }
    });

    $effect(() => {
        excludeFormerManagers.set(!showFormer);
    });

    const filterObj = (obj, excluded) => {
        if(!obj || !excluded.length) return obj;
        const filtered = {};
        for(const key in obj) {
            if(excluded.indexOf(key) === -1) filtered[key] = obj[key];
        }
        return filtered;
    };

    const filterH2H = (h2h, excluded) => {
        if(!h2h || !excluded.length) return h2h;
        const filtered = {};
        for(const a in h2h) {
            if(excluded.indexOf(a) > -1) continue;
            filtered[a] = {};
            for(const b in h2h[a]) {
                if(excluded.indexOf(b) > -1) continue;
                filtered[a][b] = h2h[a][b];
            }
        }
        return filtered;
    };

    const filterStreaks = (streaks, excluded) => {
        if(!streaks || !excluded.length) return streaks;
        return {
            milestones: filterObj(streaks.milestones, excluded),
            highScores: (streaks.highScores || []).filter(s => excluded.indexOf(s.managerID) === -1),
            blowouts: (streaks.blowouts || []).filter(s => excluded.indexOf(s.winnerID) === -1 && excluded.indexOf(s.loserID) === -1),
            nailbiters: (streaks.nailbiters || []).filter(s => excluded.indexOf(s.winnerID) === -1 && excluded.indexOf(s.loserID) === -1),
        };
    };

    const filterTrends = (trends, excluded) => {
        if(!trends || !excluded.length) return trends;
        const filtered = { leagueAverageByWeek: trends.leagueAverageByWeek, rosterTrends: {} };
        for(const mID in trends.rosterTrends) {
            if(excluded.indexOf(mID) === -1) filtered.rosterTrends[mID] = trends.rosterTrends[mID];
        }
        return filtered;
    };

    let excluded = $derived(showFormer ? [] : formerManagerIDs);

    let filteredManagerAnalytics = $derived(filterObj(managerAnalytics, excluded));
    let filteredMatchupInsights = $derived.by(() => {
        if(!matchupInsights || !excluded.length) return matchupInsights;
        return { weeklyMedians: matchupInsights.weeklyMedians, allPlayRecords: filterObj(matchupInsights.allPlayRecords, excluded) };
    });
    let filteredLuckAnalysis = $derived(filterObj(luckAnalysis, excluded));
    let filteredHeadToHead = $derived(filterH2H(headToHead, excluded));
    let filteredStreaks = $derived(filterStreaks(streaksAndMilestones, excluded));
    let filteredPowerIndex = $derived(filterObj(powerIndex, excluded));
    let filteredCloseGames = $derived(filterObj(closeGames, excluded));
    let filteredScoringTrends = $derived(filterTrends(scoringTrends, excluded));

    let display = $state("manager");

    const tabs = [
        { key: 'rules', label: 'Rules Evolution' },
        { key: 'manager', label: 'Performance' },
        { key: 'power', label: 'Power Index' },
        { key: 'h2h', label: 'Head-to-Head' },
        { key: 'streaks', label: 'Records' },
        { key: 'luck', label: 'Luck Analysis' },
        { key: 'trends', label: 'Scoring Trends' },
        { key: 'comparison', label: 'Seasons' },
        { key: 'media', label: 'Memory Wall' },
    ];
</script>

<style>
    .analyticsWrapper {
        margin: 0 auto;
        width: 100%;
        max-width: 1200px;
        padding: 0 1em;
    }

    .headerSection {
        text-align: center;
        margin: 1.5em 0 0;
    }

    .accentLine {
        width: 60px;
        height: 3px;
        background: linear-gradient(90deg, #920505, #d44);
        margin: 0 auto 1em;
        border-radius: 2px;
    }

    h1 {
        font-size: 2em;
        text-align: center;
        margin: 0 0 0.3em;
        letter-spacing: -0.5px;
    }

    .subtitle {
        text-align: center;
        color: #888;
        margin: 0 0 1.5em;
        font-size: 0.88em;
    }

    .buttonHolder {
        text-align: center;
        margin: 0 0 0;
    }

    .tabRow {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
        margin: 0;
    }

    .tabBtn {
        padding: 8px 16px;
        border: 1px solid var(--eee);
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.8em;
        background: var(--fff);
        color: var(--g333);
        white-space: nowrap;
        transition: all 0.2s ease;
    }

    .tabBtn.active {
        background: #920505;
        color: #fff;
        border-color: #920505;
        box-shadow: 0 2px 8px rgba(146, 5, 5, 0.25);
    }

    .tabBtn:hover:not(.active) {
        border-color: #920505;
        color: #920505;
        background: rgba(146, 5, 5, 0.04);
    }

    .toggleRow {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin: 1em 0;
        font-size: 0.85em;
    }

    .toggleSwitch {
        position: relative;
        width: 42px;
        height: 22px;
    }

    .toggleSwitch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        border-radius: 22px;
        transition: 0.3s;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: 0.3s;
    }

    .toggleSwitch input:checked + .slider {
        background-color: #920505;
    }

    .toggleSwitch input:checked + .slider:before {
        transform: translateX(20px);
    }

    .toggleLabel {
        color: #666;
    }

    .empty {
        margin: 10em 0 4em;
        text-align: center;
    }

    @media (max-width: 540px) {
        .tabBtn {
            font-size: 0.7em;
            padding: 6px 10px;
        }
    }
</style>

<div class="analyticsWrapper">
    <div class="headerSection">
        <div class="accentLine"></div>
        <h1>League Analytics</h1>
        <p class="subtitle">Advanced statistical queries and performance analysis</p>
    </div>

    <div class="buttonHolder">
        <div class="tabRow">
            {#each tabs as tab}
                <button class="tabBtn" class:active={display === tab.key} onclick={() => display = tab.key}>
                    {tab.label}
                </button>
            {/each}
        </div>
    </div>

    {#if formerManagerIDs.length > 0}
        <div class="toggleRow">
            <span class="toggleLabel">Include former Yahoo participants (Adam Hersh, Chico)</span>
            <label class="toggleSwitch">
                <input type="checkbox" bind:checked={showFormer} />
                <span class="slider"></span>
            </label>
        </div>
    {/if}

    {#if display === "rules"}
        <RulesEvolution {allSeasons} />
    {:else if display === "media"}
        <MediaWall />
    {:else if filteredManagerAnalytics && Object.keys(filteredManagerAnalytics).length > 0}
        {#if display === "manager"}
            <ManagerStats managerAnalytics={filteredManagerAnalytics} {leagueTeamManagers} luckAnalysis={filteredLuckAnalysis} />
        {:else if display === "power"}
            <PowerIndex powerIndex={filteredPowerIndex} closeGames={filteredCloseGames} {leagueTeamManagers} />
        {:else if display === "h2h"}
            <HeadToHead headToHead={filteredHeadToHead} {leagueTeamManagers} {allSeasons} />
        {:else if display === "streaks"}
            <StreaksAndMilestones streaksAndMilestones={filteredStreaks} {leagueTeamManagers} />
        {:else if display === "luck"}
            <LuckAnalysis luckAnalysis={filteredLuckAnalysis} {leagueTeamManagers} allPlayRecords={filteredMatchupInsights?.allPlayRecords} />
        {:else if display === "trends"}
            <ScoringTrends scoringTrends={filteredScoringTrends} {leagueTeamManagers} {allSeasons} />
        {:else if display === "comparison"}
            <SeasonComparison managerAnalytics={filteredManagerAnalytics} {leagueTeamManagers} {allSeasons} />
        {/if}
    {:else}
        <p class="empty">No analytics data available <i>yet</i>... Check back after the season starts.</p>
    {/if}
</div>
