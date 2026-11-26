<script>
	import { evaluateAllTrades, extractTradeAssets } from '$lib/utils/helperFunctions/tradeEvaluator';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let transactions, playersInfo, leagueTeamManagers;

	let evaluations = [];
	let loading = true;
	let error = null;
	let expandedId = null;
	let sortBy = 'date';
	let filterSeason = 'all';

	async function loadEvaluations() {
		try {
			loading = true;
			evaluations = await evaluateAllTrades(transactions, playersInfo);
			loading = false;
		} catch (e) {
			error = e.message;
			loading = false;
		}
	}

	loadEvaluations();

	$: seasons = [...new Set(evaluations.map(e => e.trade.season))].sort((a, b) => b - a);

	$: filtered = evaluations
		.filter(e => filterSeason === 'all' || e.trade.season == filterSeason)
		.sort((a, b) => {
			if (sortBy === 'grade') return b.pointDiff - a.pointDiff;
			return 0;
		});

	function toggleExpand(id) {
		expandedId = expandedId === id ? null : id;
	}

	function getTeamName(rosterID, season) {
		try {
			return getTeamFromTeamManagers(leagueTeamManagers, rosterID, season)?.name || `Team ${rosterID}`;
		} catch { return `Team ${rosterID}`; }
	}

	function getTeamAvatar(rosterID, season) {
		try {
			return getTeamFromTeamManagers(leagueTeamManagers, rosterID, season)?.avatar || '';
		} catch { return ''; }
	}

	function getPlayerName(playerID) {
		const p = playersInfo?.[playerID];
		if (p?.fn && p?.ln) return `${p.fn} ${p.ln}`;
		return playerID;
	}

	function getPlayerPos(playerID) {
		return playersInfo?.[playerID]?.pos || '';
	}

	function buildBarChart(evaluation) {
		const maxWeek = Math.max(
			...evaluation.sides.flatMap(s =>
				Object.values(s.playerScores).flatMap(ps => Object.keys(ps.weekly).map(Number))
			),
			0
		);
		const minWeek = evaluation.tradeWeek + 1;
		if (maxWeek < minWeek) return null;

		const weeks = [];
		for (let w = minWeek; w <= maxWeek; w++) weeks.push(w);

		const weekTotals = weeks.map(w => {
			const side0 = evaluation.sides[0];
			const side1 = evaluation.sides[1];
			let s0Total = 0, s1Total = 0;
			for (const ps of Object.values(side0.playerScores)) s0Total += (ps.weekly[w] || 0);
			for (const ps of Object.values(side1.playerScores)) s1Total += (ps.weekly[w] || 0);
			return { week: w, s0: Math.round(s0Total * 10) / 10, s1: Math.round(s1Total * 10) / 10 };
		});

		return weekTotals;
	}
</script>

<style>
	.assessor { width: 100%; }

	.controls {
		display: flex;
		gap: 12px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		align-items: center;
	}

	.controls select {
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid var(--ddd);
		background: var(--fff);
		color: var(--g333);
		font-size: 0.85em;
	}

	.controls label {
		font-size: 0.8em;
		color: var(--g999);
		margin-right: 4px;
	}

	.trade-card {
		background: var(--fff);
		border: 1px solid var(--ddd);
		border-radius: 10px;
		margin-bottom: 16px;
		overflow: hidden;
		transition: box-shadow 0.2s;
	}

	.trade-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		cursor: pointer;
		gap: 12px;
		flex-wrap: wrap;
	}

	.trade-parties {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}

	.team-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--f3f3f3);
		border-radius: 20px;
		padding: 4px 12px 4px 4px;
	}

	.team-pill img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.team-pill span {
		font-size: 0.82em;
		font-weight: 500;
		color: var(--g333);
		white-space: nowrap;
	}

	.swap-icon {
		color: var(--g999);
		font-size: 1.1em;
	}

	.verdict {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.grade-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.95em;
		color: #fff;
	}

	.verdict-label {
		font-size: 0.75em;
		color: var(--g999);
		text-align: right;
	}

	.verdict-label .winner { font-weight: 600; color: var(--g333); }
	.verdict-label .diff { color: #920505; font-weight: 500; }

	.meta-line {
		font-size: 0.72em;
		color: var(--g999);
		padding: 0 18px 4px;
	}

	.detail-panel {
		border-top: 1px solid var(--eee);
		padding: 16px 18px;
	}

	.sides-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 600px) {
		.sides-grid { grid-template-columns: 1fr; }
	}

	.side-col {
		background: var(--f3f3f3);
		border-radius: 8px;
		padding: 12px;
	}

	.side-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--ddd);
	}

	.side-header img {
		width: 24px;
		height: 24px;
		border-radius: 50%;
	}

	.side-header .team-name { font-weight: 600; font-size: 0.85em; color: var(--g333); }

	.side-header .side-total {
		margin-left: auto;
		font-weight: 700;
		font-size: 0.9em;
	}

	.player-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 5px 0;
		font-size: 0.82em;
		border-bottom: 1px solid var(--eee);
	}

	.player-row:last-child { border-bottom: none; }

	.player-name { color: var(--g333); }
	.player-pos { color: var(--g999); font-size: 0.85em; margin-left: 4px; }
	.player-pts { font-weight: 600; }

	.pick-row {
		padding: 5px 0;
		font-size: 0.8em;
		color: var(--g999);
		font-style: italic;
	}

	.chart-section {
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--eee);
	}

	.chart-title {
		font-size: 0.78em;
		font-weight: 600;
		color: var(--g333);
		margin-bottom: 8px;
	}

	.chart-container {
		overflow-x: auto;
	}

	.loading-state, .error-state, .empty-state {
		text-align: center;
		padding: 40px 20px;
		color: var(--g999);
	}

	.error-state { color: #920505; }

	.expand-arrow {
		font-size: 0.7em;
		color: var(--g999);
		transition: transform 0.2s;
	}

	.expand-arrow.open { transform: rotate(180deg); }
</style>

<div class="assessor">
	{#if loading}
		<div class="loading-state">
			<p>Evaluating completed trades...</p>
			<p style="font-size:0.8em">Fetching matchup data for post-trade player performance</p>
		</div>
	{:else if error}
		<div class="error-state">Failed to evaluate trades: {error}</div>
	{:else if evaluations.length === 0}
		<div class="empty-state">No completed trades found</div>
	{:else}
		<div class="controls">
			<div>
				<label>Season</label>
				<select bind:value={filterSeason}>
					<option value="all">All Seasons</option>
					{#each seasons as s}
						<option value={s}>{s}</option>
					{/each}
				</select>
			</div>
			<div>
				<label>Sort</label>
				<select bind:value={sortBy}>
					<option value="date">Most Recent</option>
					<option value="grade">Biggest Impact</option>
				</select>
			</div>
			<div style="margin-left:auto; font-size:0.78em; color:var(--g999);">
				{filtered.length} trade{filtered.length !== 1 ? 's' : ''} evaluated
			</div>
		</div>

		{#each filtered as ev (ev.trade.id)}
			{@const winner = ev.winnerIdx >= 0 ? ev.sides[ev.winnerIdx] : null}
			{@const chartData = buildBarChart(ev)}
			<div class="trade-card">
				<div class="card-header" on:click={() => toggleExpand(ev.trade.id)}>
					<div class="trade-parties">
						<div class="team-pill">
							<img src={getTeamAvatar(ev.trade.rosters[0], ev.trade.season)} alt="" />
							<span>{getTeamName(ev.trade.rosters[0], ev.trade.season)}</span>
						</div>
						<span class="swap-icon">&#8644;</span>
						<div class="team-pill">
							<img src={getTeamAvatar(ev.trade.rosters[1], ev.trade.season)} alt="" />
							<span>{getTeamName(ev.trade.rosters[1], ev.trade.season)}</span>
						</div>
					</div>
					<div class="verdict">
						<div class="verdict-label">
							{#if ev.winnerIdx >= 0}
								<div class="winner">{getTeamName(winner.rosterID, ev.trade.season)}</div>
								<div class="diff">+{ev.pointDiff} pts</div>
							{:else}
								<div>Even trade</div>
							{/if}
						</div>
						<div class="grade-badge" style="background:{ev.grade.color}">
							{ev.grade.letter}
						</div>
						<span class="expand-arrow" class:open={expandedId === ev.trade.id}>&#9660;</span>
					</div>
				</div>
				<div class="meta-line">
					{ev.trade.date} &middot; {ev.trade.season} Season &middot;
					{ev.weeksRemaining} week{ev.weeksRemaining !== 1 ? 's' : ''} evaluated &middot;
					{ev.grade.label}
				</div>

				{#if expandedId === ev.trade.id}
					<div class="detail-panel">
						<div class="sides-grid">
							{#each ev.sides as side, idx}
								<div class="side-col">
									<div class="side-header">
										<img src={getTeamAvatar(side.rosterID, ev.trade.season)} alt="" />
										<span class="team-name">{getTeamName(side.rosterID, ev.trade.season)}</span>
										<span class="side-total" style="color:{ev.winnerIdx === idx ? '#2e7d32' : ev.winnerIdx >= 0 ? '#920505' : 'var(--g333)'}">
											{side.totalPoints} pts
										</span>
									</div>
									{#each side.playersReceived as pid}
										{@const ps = side.playerScores[pid]}
										<div class="player-row">
											<span>
												<span class="player-name">{ps.name}</span>
												<span class="player-pos">{ps.position}</span>
											</span>
											<span class="player-pts" style="color:{ps.total > 0 ? 'var(--g333)' : 'var(--g999)'}">
												{ps.total} pts
												{#if ps.gamesScored > 0}
													<span style="font-weight:400;color:var(--g999);font-size:0.85em">
														({Math.round(ps.total / ps.gamesScored * 10) / 10}/g)
													</span>
												{/if}
											</span>
										</div>
									{/each}
									{#each side.picksReceived as pick}
										<div class="pick-row">
											{pick.season} Round {pick.round} Pick
											{#if pick.original_owner}
												(via Team {pick.original_owner})
											{/if}
										</div>
									{/each}
									{#if side.faabReceived > 0}
										<div class="pick-row">${side.faabReceived} FAAB</div>
									{/if}
								</div>
							{/each}
						</div>

						{#if chartData && chartData.length > 0}
							{@const maxVal = Math.max(...chartData.flatMap(d => [d.s0, d.s1]), 1)}
							{@const barW = Math.max(600, chartData.length * 60)}
							<div class="chart-section">
								<div class="chart-title">Weekly Fantasy Points (Post-Trade)</div>
								<div class="chart-container">
									<svg viewBox="0 0 {barW} 180" width="100%" style="min-width:{barW}px;max-width:100%;">
										{#each chartData as d, i}
											{@const x = i * (barW / chartData.length) + 8}
											{@const groupW = (barW / chartData.length) - 16}
											{@const half = groupW / 2 - 2}
											{@const h0 = (d.s0 / maxVal) * 130}
											{@const h1 = (d.s1 / maxVal) * 130}
											<rect x={x} y={150 - h0} width={half} height={h0} rx="2"
												fill={ev.winnerIdx === 0 ? '#2e7d32' : ev.winnerIdx === 1 ? '#920505' : '#888'}
												opacity="0.7" />
											<rect x={x + half + 4} y={150 - h1} width={half} height={h1} rx="2"
												fill={ev.winnerIdx === 1 ? '#2e7d32' : ev.winnerIdx === 0 ? '#920505' : '#888'}
												opacity="0.7" />
											<text x={x + groupW / 2} y="168" text-anchor="middle"
												fill="var(--g999)" font-size="10">Wk {d.week}</text>
											{#if d.s0 > 0}
												<text x={x + half / 2} y={148 - h0} text-anchor="middle"
													fill="var(--g333)" font-size="8">{d.s0}</text>
											{/if}
											{#if d.s1 > 0}
												<text x={x + half + 4 + half / 2} y={148 - h1} text-anchor="middle"
													fill="var(--g333)" font-size="8">{d.s1}</text>
											{/if}
										{/each}
									</svg>
								</div>
								<div style="display:flex;gap:16px;justify-content:center;font-size:0.72em;color:var(--g999);margin-top:6px;">
									<span>
										<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:{ev.winnerIdx === 0 ? '#2e7d32' : ev.winnerIdx === 1 ? '#920505' : '#888'};vertical-align:middle;margin-right:4px;"></span>
										{getTeamName(ev.trade.rosters[0], ev.trade.season)}
									</span>
									<span>
										<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:{ev.winnerIdx === 1 ? '#2e7d32' : ev.winnerIdx === 0 ? '#920505' : '#888'};vertical-align:middle;margin-right:4px;"></span>
										{getTeamName(ev.trade.rosters[1], ev.trade.season)}
									</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
