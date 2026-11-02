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
    import { getLeagueAnalytics } from '$lib/utils/helper';

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
    let stale = $state(false);

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

    let display = $state("manager");

    const tabs = [
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

    h1 {
        font-size: 2em;
        text-align: center;
        margin: 1em 0 0.5em;
    }

    .subtitle {
        text-align: center;
        color: #888;
        margin: 0 0 1.5em;
        font-size: 0.9em;
    }

    .buttonHolder {
        text-align: center;
        margin: 1em 0 0;
    }

    .tabRow {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
        margin: 1em 0 0;
    }

    .tabBtn {
        padding: 8px 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
        background: var(--fff);
        color: var(--g333);
        white-space: nowrap;
    }

    .tabBtn.active {
        background: #920505;
        color: #fff;
        border-color: #920505;
    }

    .tabBtn:hover:not(.active) {
        border-color: #920505;
        color: #920505;
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
    <h1>League Analytics</h1>
    <p class="subtitle">Advanced statistical queries and performance analysis</p>

    <div class="buttonHolder">
        <div class="tabRow">
            {#each tabs as tab}
                <button class="tabBtn" class:active={display === tab.key} onclick={() => display = tab.key}>
                    {tab.label}
                </button>
            {/each}
        </div>
    </div>

    {#if managerAnalytics && Object.keys(managerAnalytics).length > 0}
        {#if display === "manager"}
            <ManagerStats {managerAnalytics} {leagueTeamManagers} {luckAnalysis} />
        {:else if display === "power"}
            <PowerIndex {powerIndex} {closeGames} {leagueTeamManagers} />
        {:else if display === "h2h"}
            <HeadToHead {headToHead} {leagueTeamManagers} {allSeasons} />
        {:else if display === "streaks"}
            <StreaksAndMilestones {streaksAndMilestones} {leagueTeamManagers} />
        {:else if display === "luck"}
            <LuckAnalysis {luckAnalysis} {leagueTeamManagers} allPlayRecords={matchupInsights?.allPlayRecords} />
        {:else if display === "trends"}
            <ScoringTrends {scoringTrends} {leagueTeamManagers} {allSeasons} />
        {:else if display === "comparison"}
            <SeasonComparison {managerAnalytics} {leagueTeamManagers} {allSeasons} />
        {:else if display === "media"}
            <MediaWall />
        {/if}
    {:else if display === "media"}
        <MediaWall />
    {:else}
        <p class="empty">No analytics data available <i>yet</i>... Check back after the season starts.</p>
    {/if}
</div>
