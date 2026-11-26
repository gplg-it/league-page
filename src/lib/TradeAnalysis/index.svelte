<script>
	import TradeAssessor from './TradeAssessor.svelte';
	import TradeSimulator from './TradeSimulator.svelte';

	export let transactions, playersInfo, leagueTeamManagers, rostersData;

	let activeTab = 'assessor';
</script>

<style>
	.trade-analysis { width: 100%; }

	.page-title {
		font-size: 1.6em;
		font-weight: 700;
		color: var(--g333);
		margin: 0 0 4px;
	}

	.page-subtitle {
		font-size: 0.85em;
		color: var(--g999);
		margin: 0 0 20px;
	}

	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--eee);
		margin-bottom: 20px;
	}

	.tab-btn {
		padding: 10px 20px;
		border: none;
		background: none;
		font-size: 0.9em;
		font-weight: 500;
		color: var(--g999);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		transition: color 0.2s, border-color 0.2s;
	}

	.tab-btn:hover { color: var(--g333); }

	.tab-btn.active {
		color: #920505;
		border-bottom-color: #920505;
		font-weight: 600;
	}

	.tab-desc {
		font-size: 0.78em;
		color: var(--g999);
		margin-bottom: 16px;
		line-height: 1.4;
	}
</style>

<div class="trade-analysis">
	<h1 class="page-title">Trade Lab</h1>
	<p class="page-subtitle">Evaluate completed trades and simulate hypothetical deals</p>

	<div class="tab-bar">
		<button class="tab-btn" class:active={activeTab === 'assessor'} on:click={() => activeTab = 'assessor'}>
			Trade Assessor
		</button>
		<button class="tab-btn" class:active={activeTab === 'simulator'} on:click={() => activeTab = 'simulator'}>
			Trade Simulator
		</button>
	</div>

	{#if activeTab === 'assessor'}
		<p class="tab-desc">
			Every completed trade graded by post-trade player performance. See who won each deal based on actual fantasy points scored after the trade.
		</p>
		<TradeAssessor {transactions} {playersInfo} {leagueTeamManagers} />
	{:else}
		<p class="tab-desc">
			Build a hypothetical trade and evaluate it using actual game scores and remaining-season projections.
		</p>
		<TradeSimulator {rostersData} {playersInfo} {leagueTeamManagers} />
	{/if}
</div>
