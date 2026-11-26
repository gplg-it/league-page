<script>
	import { evaluateHypotheticalTrade } from '$lib/utils/helperFunctions/tradeEvaluator';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let rostersData, playersInfo, leagueTeamManagers;

	let teamA = '';
	let teamB = '';
	let selectedA = {};
	let selectedB = {};
	let result = null;
	let evaluating = false;
	let errorMsg = null;

	$: rosterIDs = rostersData?.rosters ? Object.keys(rostersData.rosters).sort((a, b) => a - b) : [];

	$: teamAPlayers = teamA && rostersData?.rosters?.[teamA]?.players
		? rostersData.rosters[teamA].players.filter(id => id && id !== '0')
		: [];

	$: teamBPlayers = teamB && rostersData?.rosters?.[teamB]?.players
		? rostersData.rosters[teamB].players.filter(id => id && id !== '0')
		: [];

	$: selectedACount = Object.values(selectedA).filter(Boolean).length;
	$: selectedBCount = Object.values(selectedB).filter(Boolean).length;
	$: canEvaluate = teamA && teamB && teamA !== teamB && selectedACount > 0 && selectedBCount > 0;

	function getTeamName(rosterID) {
		try {
			return getTeamFromTeamManagers(leagueTeamManagers, rosterID)?.name || `Team ${rosterID}`;
		} catch { return `Team ${rosterID}`; }
	}

	function getTeamAvatar(rosterID) {
		try {
			return getTeamFromTeamManagers(leagueTeamManagers, rosterID)?.avatar || '';
		} catch { return ''; }
	}

	function getPlayerName(pid) {
		const p = playersInfo?.[pid];
		return p?.fn && p?.ln ? `${p.fn} ${p.ln}` : pid;
	}

	function getPlayerPos(pid) {
		return playersInfo?.[pid]?.pos || '';
	}

	function getPlayerTeam(pid) {
		return playersInfo?.[pid]?.t || '';
	}

	function sortPlayers(playerList) {
		const posOrder = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6 };
		return [...playerList].sort((a, b) => {
			const posA = posOrder[getPlayerPos(a)] || 99;
			const posB = posOrder[getPlayerPos(b)] || 99;
			if (posA !== posB) return posA - posB;
			return getPlayerName(a).localeCompare(getPlayerName(b));
		});
	}

	function togglePlayerA(pid) {
		selectedA = { ...selectedA, [pid]: !selectedA[pid] };
	}

	function togglePlayerB(pid) {
		selectedB = { ...selectedB, [pid]: !selectedB[pid] };
	}

	function resetTeamA() {
		selectedA = {};
		result = null;
	}

	function resetTeamB() {
		selectedB = {};
		result = null;
	}

	async function evaluate() {
		if (!canEvaluate) return;
		evaluating = true;
		errorMsg = null;
		result = null;

		try {
			const sideA = {
				rosterID: parseInt(teamA),
				playerIDs: Object.entries(selectedA).filter(([, v]) => v).map(([k]) => k),
			};
			const sideB = {
				rosterID: parseInt(teamB),
				playerIDs: Object.entries(selectedB).filter(([, v]) => v).map(([k]) => k),
			};

			result = await evaluateHypotheticalTrade({ sideA, sideB, playersInfo });
		} catch (e) {
			errorMsg = e.message;
		}

		evaluating = false;
	}

	const posColors = {
		QB: '#e53935',
		RB: '#43a047',
		WR: '#1e88e5',
		TE: '#fb8c00',
		K: '#8e24aa',
		DEF: '#546e7a',
	};
</script>

<style>
	.simulator { width: 100%; }

	.builder {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 12px;
		align-items: start;
	}

	@media (max-width: 700px) {
		.builder {
			grid-template-columns: 1fr;
		}
		.middle-col { order: -1; }
	}

	.roster-panel {
		background: var(--fff);
		border: 1px solid var(--ddd);
		border-radius: 10px;
		overflow: hidden;
	}

	.panel-header {
		padding: 12px 14px;
		border-bottom: 1px solid var(--eee);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.panel-header select {
		flex: 1;
		padding: 6px 8px;
		border: 1px solid var(--ddd);
		border-radius: 6px;
		background: var(--f3f3f3);
		color: var(--g333);
		font-size: 0.85em;
	}

	.panel-header img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.player-list {
		max-height: 400px;
		overflow-y: auto;
		padding: 4px 0;
	}

	.player-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		cursor: pointer;
		transition: background 0.15s;
		font-size: 0.82em;
	}

	.player-item:hover { background: var(--f3f3f3); }
	.player-item.selected { background: rgba(146, 5, 5, 0.06); }

	.player-item input[type="checkbox"] {
		accent-color: #920505;
		flex-shrink: 0;
	}

	.pos-tag {
		display: inline-block;
		padding: 1px 5px;
		border-radius: 3px;
		font-size: 0.75em;
		font-weight: 600;
		color: #fff;
		min-width: 28px;
		text-align: center;
	}

	.p-name { flex: 1; color: var(--g333); }
	.p-team { color: var(--g999); font-size: 0.85em; }

	.middle-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-top: 60px;
		gap: 12px;
	}

	.swap-arrows {
		font-size: 1.8em;
		color: var(--g999);
	}

	.eval-btn {
		padding: 10px 24px;
		background: #920505;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.85em;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.eval-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.eval-btn:not(:disabled):hover { opacity: 0.85; }

	.selected-count {
		font-size: 0.72em;
		color: var(--g999);
		text-align: center;
		padding: 6px 14px;
		border-top: 1px solid var(--eee);
	}

	.results {
		margin-top: 24px;
		background: var(--fff);
		border: 1px solid var(--ddd);
		border-radius: 10px;
		padding: 20px;
	}

	.results-header {
		text-align: center;
		margin-bottom: 16px;
	}

	.results-header h3 {
		font-size: 1.1em;
		margin: 0 0 4px;
		color: var(--g333);
	}

	.results-verdict {
		font-size: 0.85em;
		color: var(--g999);
	}

	.results-verdict .favored { color: #2e7d32; font-weight: 600; }
	.results-verdict .even { color: #f0ad4e; font-weight: 600; }

	.results-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 600px) {
		.results-grid { grid-template-columns: 1fr; }
	}

	.result-side {
		background: var(--f3f3f3);
		border-radius: 8px;
		padding: 12px;
	}

	.result-side-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--ddd);
	}

	.result-side-header img {
		width: 24px;
		height: 24px;
		border-radius: 50%;
	}

	.result-side-header .r-name { font-weight: 600; font-size: 0.85em; }
	.result-side-header .r-total { margin-left: auto; font-weight: 700; font-size: 0.9em; }

	.result-player {
		display: flex;
		justify-content: space-between;
		padding: 5px 0;
		font-size: 0.82em;
		border-bottom: 1px solid var(--eee);
	}

	.result-player:last-child { border-bottom: none; }

	.rp-actual { color: var(--g333); font-weight: 500; }
	.rp-proj { color: #1565c0; font-size: 0.85em; }

	.bar-visual {
		margin-top: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.bar-track {
		flex: 1;
		height: 20px;
		background: var(--eee);
		border-radius: 10px;
		overflow: hidden;
		display: flex;
	}

	.bar-fill-a {
		height: 100%;
		background: #2e7d32;
		transition: width 0.4s;
	}

	.bar-fill-b {
		height: 100%;
		background: #920505;
		transition: width 0.4s;
	}

	.bar-label {
		font-size: 0.72em;
		color: var(--g999);
		min-width: 50px;
	}

	.bar-label.left { text-align: right; }
	.bar-label.right { text-align: left; }

	.error-msg {
		text-align: center;
		color: #920505;
		padding: 12px;
		font-size: 0.85em;
	}

	.note {
		margin-top: 8px;
		font-size: 0.72em;
		color: var(--g999);
		text-align: center;
	}
</style>

<div class="simulator">
	<div class="builder">
		<div class="roster-panel">
			<div class="panel-header">
				{#if teamA}
					<img src={getTeamAvatar(teamA)} alt="" />
				{/if}
				<select bind:value={teamA} on:change={resetTeamA}>
					<option value="">Select Team A</option>
					{#each rosterIDs as rid}
						<option value={rid}>{getTeamName(rid)}</option>
					{/each}
				</select>
			</div>
			{#if teamA}
				<div class="player-list">
					{#each sortPlayers(teamAPlayers) as pid}
						<div class="player-item" class:selected={selectedA[pid]} on:click={() => togglePlayerA(pid)}>
							<input type="checkbox" checked={selectedA[pid] || false} tabindex="-1" />
							<span class="pos-tag" style="background:{posColors[getPlayerPos(pid)] || '#888'}">
								{getPlayerPos(pid)}
							</span>
							<span class="p-name">{getPlayerName(pid)}</span>
							<span class="p-team">{getPlayerTeam(pid)}</span>
						</div>
					{/each}
				</div>
				<div class="selected-count">{selectedACount} player{selectedACount !== 1 ? 's' : ''} selected</div>
			{/if}
		</div>

		<div class="middle-col">
			<div class="swap-arrows">&#8644;</div>
			<button class="eval-btn" disabled={!canEvaluate || evaluating} on:click={evaluate}>
				{evaluating ? 'Evaluating...' : 'Evaluate Trade'}
			</button>
		</div>

		<div class="roster-panel">
			<div class="panel-header">
				{#if teamB}
					<img src={getTeamAvatar(teamB)} alt="" />
				{/if}
				<select bind:value={teamB} on:change={resetTeamB}>
					<option value="">Select Team B</option>
					{#each rosterIDs as rid}
						<option value={rid}>{getTeamName(rid)}</option>
					{/each}
				</select>
			</div>
			{#if teamB}
				<div class="player-list">
					{#each sortPlayers(teamBPlayers) as pid}
						<div class="player-item" class:selected={selectedB[pid]} on:click={() => togglePlayerB(pid)}>
							<input type="checkbox" checked={selectedB[pid] || false} tabindex="-1" />
							<span class="pos-tag" style="background:{posColors[getPlayerPos(pid)] || '#888'}">
								{getPlayerPos(pid)}
							</span>
							<span class="p-name">{getPlayerName(pid)}</span>
							<span class="p-team">{getPlayerTeam(pid)}</span>
						</div>
					{/each}
				</div>
				<div class="selected-count">{selectedBCount} player{selectedBCount !== 1 ? 's' : ''} selected</div>
			{/if}
		</div>
	</div>

	{#if errorMsg}
		<div class="error-msg">{errorMsg}</div>
	{/if}

	{#if result}
		{@const totalBoth = result.sideA.totalValue + result.sideB.totalValue}
		{@const pctA = totalBoth > 0 ? (result.sideA.totalValue / totalBoth) * 100 : 50}
		<div class="results">
			<div class="results-header">
				<h3>Trade Evaluation</h3>
				<div class="results-verdict">
					{#if result.favoredSide === 'A'}
						<span class="favored">{getTeamName(result.sideA.rosterID)}</span> gets the better deal by {result.diff} pts
					{:else if result.favoredSide === 'B'}
						<span class="favored">{getTeamName(result.sideB.rosterID)}</span> gets the better deal by {result.diff} pts
					{:else}
						<span class="even">Fair trade</span> &mdash; within 2 points
					{/if}
				</div>
			</div>

			<div class="bar-visual">
				<span class="bar-label left">{result.sideA.totalValue}</span>
				<div class="bar-track">
					<div class="bar-fill-a" style="width:{pctA}%"></div>
					<div class="bar-fill-b" style="width:{100 - pctA}%"></div>
				</div>
				<span class="bar-label right">{result.sideB.totalValue}</span>
			</div>

			<div class="results-grid" style="margin-top:16px;">
				<div class="result-side">
					<div class="result-side-header">
						<img src={getTeamAvatar(result.sideA.rosterID)} alt="" />
						<span class="r-name">{getTeamName(result.sideA.rosterID)} receives</span>
						<span class="r-total" style="color:{result.favoredSide === 'A' ? '#2e7d32' : result.favoredSide === 'B' ? '#920505' : 'var(--g333)'}">
							{result.sideA.totalValue} pts
						</span>
					</div>
					{#each result.sideA.players as p}
						<div class="result-player">
							<span>
								<span class="pos-tag" style="background:{posColors[p.position] || '#888'};font-size:0.7em;padding:0 4px;">
									{p.position}
								</span>
								{p.name}
							</span>
							<span>
								<span class="rp-actual">{p.totalActual}</span>
								{#if p.totalProjected > 0}
									<span class="rp-proj">+{p.totalProjected} proj</span>
								{/if}
							</span>
						</div>
					{/each}
				</div>
				<div class="result-side">
					<div class="result-side-header">
						<img src={getTeamAvatar(result.sideB.rosterID)} alt="" />
						<span class="r-name">{getTeamName(result.sideB.rosterID)} receives</span>
						<span class="r-total" style="color:{result.favoredSide === 'B' ? '#2e7d32' : result.favoredSide === 'A' ? '#920505' : 'var(--g333)'}">
							{result.sideB.totalValue} pts
						</span>
					</div>
					{#each result.sideB.players as p}
						<div class="result-player">
							<span>
								<span class="pos-tag" style="background:{posColors[p.position] || '#888'};font-size:0.7em;padding:0 4px;">
									{p.position}
								</span>
								{p.name}
							</span>
							<span>
								<span class="rp-actual">{p.totalActual}</span>
								{#if p.totalProjected > 0}
									<span class="rp-proj">+{p.totalProjected} proj</span>
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="note">
				Based on actual scores through Week {result.currentWeek}
				{#if result.currentWeek < result.maxWeek}
					+ projections for Weeks {result.currentWeek + 1}&ndash;{result.maxWeek}
				{/if}
			</div>
		</div>
	{/if}
</div>
