<script>
	import LinearProgress from '@smui/linear-progress';
	import { Analytics } from '$lib/components';

    export let data;
    const analyticsInfo = data.analyticsInfo;
</script>

<style>
    #main {
        position: relative;
        z-index: 1;
    }
    .loading {
        display: block;
        width: 85%;
        max-width: 500px;
        margin: 80px auto;
    }
</style>

<div id="main">
    {#await analyticsInfo}
        <div class="loading">
            <p>Computing league analytics...</p>
            <LinearProgress indeterminate />
        </div>
    {:then [analyticsData, leagueTeamManagers]}
        <Analytics {analyticsData} {leagueTeamManagers} />
    {:catch error}
        <p>Something went wrong: {error.message}</p>
    {/await}
</div>
