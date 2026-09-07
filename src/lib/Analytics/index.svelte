<script>
    import Button, { Group, Label } from '@smui/button';
    import ManagerStats from './ManagerStats.svelte';
    import LuckAnalysis from './LuckAnalysis.svelte';
    import ScoringTrends from './ScoringTrends.svelte';
    import SeasonComparison from './SeasonComparison.svelte';
    import { getLeagueAnalytics } from '$lib/utils/helper';

    let {analyticsData, leagueTeamManagers} = $props();

    let managerAnalytics = $state();
    let matchupInsights = $state();
    let scoringTrends = $state();
    let luckAnalysis = $state();
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

    .empty {
        margin: 10em 0 4em;
        text-align: center;
    }

    @media (max-width: 540px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.6em;
        }
    }

    @media (max-width: 415px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.5em;
            padding: 0 6px;
        }
    }
</style>

<div class="analyticsWrapper">
    <h1>League Analytics</h1>
    <p class="subtitle">Advanced statistical queries and performance analysis</p>

    <div class="buttonHolder">
        <Group variant="outlined">
            <Button class="selectionButtons" onclick={() => display = "manager"} variant="{display == "manager" ? "raised" : "outlined"}">
                <Label>Performance</Label>
            </Button>
            <Button class="selectionButtons" onclick={() => display = "luck"} variant="{display == "luck" ? "raised" : "outlined"}">
                <Label>Luck Analysis</Label>
            </Button>
            <Button class="selectionButtons" onclick={() => display = "trends"} variant="{display == "trends" ? "raised" : "outlined"}">
                <Label>Scoring Trends</Label>
            </Button>
            <Button class="selectionButtons" onclick={() => display = "comparison"} variant="{display == "comparison" ? "raised" : "outlined"}">
                <Label>Season Comparison</Label>
            </Button>
        </Group>
    </div>

    {#if managerAnalytics && Object.keys(managerAnalytics).length > 0}
        {#if display === "manager"}
            <ManagerStats {managerAnalytics} {leagueTeamManagers} {luckAnalysis} />
        {:else if display === "luck"}
            <LuckAnalysis {luckAnalysis} {leagueTeamManagers} allPlayRecords={matchupInsights?.allPlayRecords} />
        {:else if display === "trends"}
            <ScoringTrends {scoringTrends} {leagueTeamManagers} {allSeasons} />
        {:else if display === "comparison"}
            <SeasonComparison {managerAnalytics} {leagueTeamManagers} {allSeasons} />
        {/if}
    {:else}
        <p class="empty">No analytics data available <i>yet</i>... Check back after the season starts.</p>
    {/if}
</div>
