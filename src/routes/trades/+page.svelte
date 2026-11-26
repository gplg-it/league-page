<script>
	import LinearProgress from '@smui/linear-progress';
	import { TradeAnalysis } from '$lib/components';
	import { waitForAll } from '$lib/utils/helper';

	export let data;
	const { playersData, transactionsData, leagueTeamManagersData, rostersData } = data;
</script>

<style>
	#main {
		position: relative;
		z-index: 1;
		display: block;
		margin: 30px auto;
		width: 95%;
		max-width: 1100px;
		overflow-y: hidden;
	}

	.loading {
		display: block;
		position: relative;
		z-index: 1;
		width: 85%;
		max-width: 500px;
		margin: 80px auto;
	}
</style>

<div id="main">
	{#await waitForAll(transactionsData, playersData, leagueTeamManagersData, rostersData)}
		<div class="loading">
			<p>Loading trade analysis data...</p>
			<LinearProgress indeterminate />
		</div>
	{:then [{transactions, stale}, playersInfo, leagueTeamManagers, rostersResult]}
		<TradeAnalysis {transactions} {playersInfo} {leagueTeamManagers} rostersData={rostersResult} />
	{:catch error}
		<p class="center">Something went wrong: {error.message}</p>
	{/await}
</div>
