<script>
	import { onMount } from 'svelte';
	import LinearProgress from '@smui/linear-progress';
	import { loadPlayers, managers } from '$lib/utils/helper';
	import { loadWeeklyRoastData } from '$lib/utils/helperFunctions/weeklyRoastData';
	import { buildRoastWeek, buildHistory, availableWeeks, fmt } from '$lib/utils/helperFunctions/weeklyRoastEngine';
	import { loadRoastHeadlines } from '$lib/utils/helperFunctions/roastHeadlines';

	let loading = $state(true);
	let error = $state(null);
	let data = $state.raw(null);
	let players = $state.raw({});
	let headlines = $state.raw([]);
	let week = $state(null);
	let avatarCaps = $state({});
	let avatarFailed = $state({});

	const weeks = $derived(data ? availableWeeks(data) : []);
	// Headlines are this week's news, so they only belong on the most recent final week.
	const isLatestWeek = $derived(weeks.length > 0 && week === weeks[weeks.length - 1]);
	const roasts = $derived(data && week ? buildRoastWeek(data, players, week, managers, isLatestWeek ? headlines : []) : []);
	const history = $derived(data ? buildHistory(data) : null);
	const weekIdx = $derived(weeks.indexOf(week));
	const hasProjections = $derived(data && String(data.nflState.league_season) === String(data.roastSeason?.year));
	const nextWeekPending = $derived(
		data?.roastSeason && week === weeks[weeks.length - 1]
		&& String(data.nflState.league_season) === String(data.roastSeason.year)
		&& data.nflState.season_type === 'regular'
	);

	const ordinal = (n) => {
		if (n == null) return '—';
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};
	const recordText = (r) => `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}`;
	const slotLabel = (s) => ({ FLEX: 'FLX', SUPER_FLEX: 'SF', WRRB_FLEX: 'W/R', REC_FLEX: 'W/T', DEF: 'DEF' }[s] || s);

	// Never stretch an avatar past its native resolution (accounting for screen density).
	const onAvatarLoad = (id, e) => {
		const img = e.currentTarget;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		avatarCaps[id] = Math.floor(img.naturalWidth / dpr);
	};
	const onAvatarError = (m, e) => {
		const img = e.currentTarget;
		if (m.avatarFallback && img.src !== m.avatarFallback) {
			img.src = m.avatarFallback;
		} else {
			avatarFailed[m.managerID] = true;
		}
	};

	const cellTitle = (y, cell) => {
		if (!cell) {
			return history && y < history.sleeperRange[0]
				? `${y} (Yahoo): results not imported yet`
				: `${y}: no season on record for this manager`;
		}
		const base = `${y} (${cell.platform === 'yahoo' ? 'Yahoo' : 'Sleeper'}): ${cell.wins}-${cell.losses}${cell.ties ? `-${cell.ties}` : ''}, ${fmt(cell.fpts)} pts`;
		const finish = cell.rank ? `, ${ordinal(cell.rank)} by record` : '';
		return `${base}${finish}${cell.champion ? ', champion' : ''}${cell.inProgress ? ' (in progress)' : ''}`;
	};

	onMount(async () => {
		loadRoastHeadlines().then(h => { headlines = h; }).catch(() => {});
		try {
			const [d, p] = await Promise.all([
				loadWeeklyRoastData(),
				loadPlayers(null).catch(() => ({ players: {} })),
			]);
			players = p?.players || {};
			data = d;
			const ws = availableWeeks(d);
			week = ws[ws.length - 1] ?? null;
		} catch (e) {
			error = e?.message || 'Unknown error';
		}
		loading = false;
	});
</script>

<div class="roast">
	{#if loading}
		<div class="state">
			<p>Reviewing the tape…</p>
			<LinearProgress indeterminate />
		</div>
	{:else if error}
		<div class="state">The roast generator tripped over its own feet: {error}</div>
	{:else if !data?.roastSeason || !week}
		<div class="state">No completed weeks yet. Everyone is undefeated and equally unqualified.</div>
	{:else}
		<header class="bar">
			<div class="weekNav">
				<button class="navBtn" aria-label="Previous week" disabled={weekIdx <= 0} onclick={() => (week = weeks[weekIdx - 1])}>‹</button>
				<label class="weekPick">
					<span class="sr">Week</span>
					<select bind:value={week}>
						{#each weeks as w}
							<option value={w}>Week {w}</option>
						{/each}
					</select>
				</label>
				<button class="navBtn" aria-label="Next week" disabled={weekIdx >= weeks.length - 1} onclick={() => (week = weeks[weekIdx + 1])}>›</button>
				<span class="season">{data.roastSeason.year} season</span>
			</div>
			<p class="meta">
				Built from the final Week {week} box scores{hasProjections ? ' and Sleeper projections' : ''}. Ranked from most humiliated to least.
				{#if nextWeekPending}Week {week + 1} is added once its games are final.{/if}
			</p>
		</header>

		<div class="cards">
			{#each roasts as r (r.manager.managerID)}
				{@const mid = r.manager.managerID}
				<article class="card {r.tier}">
					<div class="top">
						<div class="avatarWrap">
							{#if r.manager.avatar && !avatarFailed[mid]}
								<img
									class="avatar"
									src={r.manager.avatar}
									alt="{r.manager.name} avatar"
									decoding="async"
									loading="lazy"
									style:max-width={avatarCaps[mid] ? `${avatarCaps[mid]}px` : null}
									onload={(e) => onAvatarLoad(mid, e)}
									onerror={(e) => onAvatarError(r.manager, e)}
								/>
							{:else}
								<div class="avatar initials" aria-hidden="true">{r.manager.name.slice(0, 1).toUpperCase()}</div>
							{/if}
							<span class="grade" title="Weekly grade">{r.grade}</span>
						</div>
						<div class="ident">
							<h3 class="name">{r.manager.name}</h3>
							{#if r.manager.teamName}<div class="team">{r.manager.teamName}</div>{/if}
							<div class="result">
								{#if r.opp}
									<span class="res {r.result}">{r.result}</span>
									<span class="score">{fmt(r.score)}–{fmt(r.opp.score)}</span>
									<span class="vs">vs {r.opp.name}</span>
								{:else}
									<span class="score">{fmt(r.score)}</span><span class="vs">no matchup</span>
								{/if}
							</div>
							<div class="sub">
								{recordText(r.record)} · {ordinal(r.standing)} place · {ordinal(r.weekRank)} of {r.numTeams} this week
							</div>
						</div>
					</div>

					<p class="headline">{r.headline}</p>
					{#each r.paragraphs as para}
						<p class="para">{para}</p>
					{/each}
					{#if r.topical}
						<p class="para topical">
							{r.topical.before}<a href={r.topical.url} target="_blank" rel="noopener noreferrer">{r.topical.headline}</a>{r.topical.after}
							<span class="src">via {r.topical.source}</span>
						</p>
					{/if}

					<dl class="receipts">
						<div><dt>Left on bench</dt><dd>{fmt(r.benchLeft)}</dd></div>
						<div><dt>Lineup efficiency</dt><dd>{r.efficiency}%</dd></div>
						<div><dt>All-play</dt><dd>{r.allPlayW}-{r.allPlayL}</dd></div>
						<div><dt>Season avg</dt><dd>{fmt(r.seasonAvg)}</dd></div>
						<div><dt>PF rank</dt><dd>{ordinal(r.pfRank)}</dd></div>
					</dl>

					<details class="box">
						<summary>Box score receipts</summary>
						<div class="tableWrap">
							<table>
								<thead>
									<tr><th>Slot</th><th>Player</th><th class="num">Proj</th><th class="num">Pts</th></tr>
								</thead>
								<tbody>
									{#each r.starters as st}
										<tr>
											<td class="slot">{slotLabel(st.slot)}</td>
											<td>{st.empty ? 'EMPTY SLOT' : st.label}</td>
											<td class="num">{st.proj === undefined ? '—' : fmt(st.proj)}</td>
											<td class="num strong">{fmt(st.pts)}</td>
										</tr>
									{/each}
									{#each r.bench as b}
										<tr class="benchRow">
											<td class="slot">BN</td>
											<td>{b.label}</td>
											<td class="num">{b.proj === undefined ? '—' : fmt(b.proj)}</td>
											<td class="num">{fmt(b.pts)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<p class="boxNote">Optimal lineup: {fmt(r.optimal)} · Actual: {fmt(r.score)}</p>
					</details>

					{#if history}
						{@const career = history.careers[mid]}
						<div class="history">
							<div class="histHead">
								<span>{history.years[0]}–{history.years[history.years.length - 1]} history</span>
								{#if career}
									<span class="career">
										On record: {career.wins}-{career.losses}{career.ties ? `-${career.ties}` : ''}
										over {career.seasons} season{career.seasons === 1 ? '' : 's'}{career.titles ? ` · ${career.titles} title${career.titles === 1 ? '' : 's'}` : ''}
									</span>
								{/if}
							</div>
							<ol class="strip">
								{#each history.years as y}
									{@const cell = history.byManager[mid]?.[y]}
									<li
										class="yr"
										class:sleeper={cell?.platform === 'sleeper'}
										class:yahoo={cell?.platform === 'yahoo'}
										class:missing={!cell && y < history.sleeperRange[0]}
										class:champ={cell?.champion}
										class:live={cell?.inProgress}
										title={cellTitle(y, cell)}
									>
										<span class="yrLabel">’{String(y).slice(2)}</span>
										<span class="yrVal">{cell ? `${cell.wins}-${cell.losses}` : '—'}</span>
										<span class="yrRank">{cell?.champion ? '★' : cell?.rank ? ordinal(cell.rank) : ''}</span>
									</li>
								{/each}
							</ol>
						</div>
					{/if}
				</article>
			{/each}
		</div>

		{#if history}
			<footer class="legend">
				<span><i class="key sleeperKey"></i>Sleeper season ({history.sleeperRange[0]}–{history.sleeperRange[1]}), loaded live</span>
				<span><i class="key liveKey"></i>Season in progress</span>
				<span><i class="key champKey"></i>★ Champion</span>
				{#if !history.yahooImported}
					<span><i class="key missingKey"></i>Yahoo season (2011–{history.sleeperRange[0] - 1}): results not imported yet, nothing estimated</span>
				{/if}
			</footer>
		{/if}
	{/if}
</div>

<style>
	.roast {
		--ink: #f4f1ea;
		--ink-2: rgba(244, 241, 234, 0.72);
		--ink-3: rgba(244, 241, 234, 0.48);
		--line: rgba(255, 255, 255, 0.08);
		--panel: rgba(255, 255, 255, 0.035);
		--panel-2: rgba(255, 255, 255, 0.06);
		--red: #e0473b;
		--gold: #c9a84c;
		--green: #4caf7a;
		--amber: #d9912b;
		max-width: 920px;
		margin: 0 auto;
		color: var(--ink);
		text-align: left;
	}

	.state {
		text-align: center;
		padding: 3em 1em;
		color: var(--ink-3);
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	.bar {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 1.5em;
	}

	.weekNav {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.navBtn {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--panel);
		color: var(--ink);
		font-size: 1.3em;
		line-height: 1;
		cursor: pointer;
	}

	.navBtn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.weekPick select {
		height: 36px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: #15151d;
		color: var(--ink);
		font-size: 0.95em;
		font-weight: 700;
		color-scheme: dark;
	}

	.season {
		margin-left: 4px;
		font-size: 0.75em;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: var(--gold);
		font-weight: 700;
	}

	.meta {
		margin: 0;
		font-size: 0.8em;
		color: var(--ink-3);
		line-height: 1.5;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.card {
		background: var(--panel);
		border: 1px solid var(--line);
		border-left: 4px solid var(--ink-3);
		border-radius: 4px 12px 12px 4px;
		padding: 20px 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.card.terrible { border-left-color: var(--red); }
	.card.bad { border-left-color: var(--amber); }
	.card.meh { border-left-color: rgba(244, 241, 234, 0.35); }
	.card.good { border-left-color: var(--green); }
	.card.elite { border-left-color: var(--gold); }

	.top {
		display: flex;
		gap: 18px;
		align-items: center;
	}

	.avatarWrap {
		position: relative;
		flex-shrink: 0;
		width: clamp(96px, 22vw, 144px);
		display: flex;
		justify-content: center;
	}

	.avatar {
		width: 100%;
		height: auto;
		aspect-ratio: 1 / 1;
		object-fit: cover;
		border-radius: 50%;
		border: 3px solid var(--line);
		background: #1b1b24;
		display: block;
	}

	.initials {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.6em;
		font-weight: 900;
		color: var(--ink-3);
	}

	.grade {
		position: absolute;
		right: 0;
		bottom: 2px;
		min-width: 40px;
		height: 40px;
		padding: 0 6px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 1em;
		background: #0d0d13;
		border: 2px solid var(--ink-3);
		color: var(--ink);
	}

	.terrible .grade { border-color: var(--red); color: var(--red); }
	.bad .grade { border-color: var(--amber); color: var(--amber); }
	.good .grade { border-color: var(--green); color: var(--green); }
	.elite .grade { border-color: var(--gold); color: var(--gold); }

	.ident {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.name {
		margin: 0;
		font-size: 1.35em;
		font-weight: 800;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.team {
		font-size: 0.82em;
		color: var(--ink-3);
		overflow-wrap: anywhere;
	}

	.result {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.res {
		font-weight: 900;
		font-size: 0.8em;
		padding: 2px 8px;
		border-radius: 4px;
		background: var(--panel-2);
	}

	.res.W { color: var(--green); }
	.res.L { color: var(--red); }

	.score {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.vs, .sub {
		font-size: 0.82em;
		color: var(--ink-2);
	}

	.sub {
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}

	.headline {
		margin: 6px 0 0;
		font-size: 1.15em;
		font-weight: 800;
		font-style: italic;
		color: var(--gold);
		text-wrap: balance;
	}

	.para {
		margin: 0;
		font-size: 0.92em;
		line-height: 1.65;
		color: var(--ink-2);
		max-width: 70ch;
	}

	.topical {
		padding-left: 12px;
		border-left: 2px solid var(--gold);
	}

	.topical a {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--gold);
		text-underline-offset: 2px;
	}

	.topical .src {
		font-size: 0.78em;
		color: var(--ink-3);
		white-space: nowrap;
	}

	.receipts {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
		margin: 6px 0 0;
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}

	.receipts div {
		display: flex;
		flex-direction: column-reverse;
		gap: 2px;
	}

	.receipts dt {
		font-size: 0.66em;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--ink-3);
	}

	.receipts dd {
		margin: 0;
		font-weight: 800;
		font-size: 1.05em;
		font-variant-numeric: tabular-nums;
	}

	.box summary {
		cursor: pointer;
		font-size: 0.8em;
		font-weight: 700;
		color: var(--ink-2);
		letter-spacing: 0.4px;
	}

	.tableWrap {
		overflow-x: auto;
		margin-top: 8px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82em;
	}

	th, td {
		padding: 5px 8px;
		border-bottom: 1px solid var(--line);
		text-align: left;
		white-space: nowrap;
	}

	th {
		font-size: 0.85em;
		color: var(--ink-3);
		font-weight: 600;
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.strong { font-weight: 800; }
	.slot { color: var(--ink-3); font-weight: 700; }
	.benchRow td { color: var(--ink-3); }

	.boxNote {
		margin: 6px 0 0;
		font-size: 0.75em;
		color: var(--ink-3);
	}

	.history {
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}

	.histHead {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 0.72em;
		text-transform: uppercase;
		letter-spacing: 0.8px;
		color: var(--ink-3);
		margin-bottom: 8px;
	}

	.career {
		text-transform: none;
		letter-spacing: 0;
		color: var(--ink-2);
	}

	.strip {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(16, minmax(0, 1fr));
		gap: 4px;
	}

	.yr {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 5px 2px;
		border-radius: 6px;
		border: 1px solid var(--line);
		font-variant-numeric: tabular-nums;
		min-width: 0;
	}

	.yrLabel { font-size: 0.62em; color: var(--ink-3); }
	.yrVal { font-size: 0.74em; font-weight: 800; }
	.yrRank { font-size: 0.6em; color: var(--ink-2); min-height: 1.2em; }

	.yr.missing {
		background: repeating-linear-gradient(135deg, transparent 0 4px, rgba(255, 255, 255, 0.035) 4px 8px);
	}

	.yr.missing .yrVal { color: var(--ink-3); font-weight: 400; }
	.yr.sleeper, .yr.yahoo { background: var(--panel-2); }
	.yr.live { border-style: dashed; border-color: var(--ink-3); }
	.yr.champ { border-color: var(--gold); background: rgba(201, 168, 76, 0.14); }
	.yr.champ .yrRank { color: var(--gold); font-size: 0.75em; }

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 18px;
		margin-top: 18px;
		font-size: 0.75em;
		color: var(--ink-3);
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.key {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid var(--line);
		display: inline-block;
	}

	.sleeperKey { background: var(--panel-2); }
	.liveKey { border-style: dashed; border-color: var(--ink-3); }
	.champKey { border-color: var(--gold); background: rgba(201, 168, 76, 0.14); }
	.missingKey { background: repeating-linear-gradient(135deg, transparent 0 3px, rgba(255, 255, 255, 0.12) 3px 6px); }

	@media (max-width: 640px) {
		.card { padding: 16px; }
		.top { gap: 14px; }
		.name { font-size: 1.15em; }
		.receipts { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.strip { grid-template-columns: repeat(8, minmax(0, 1fr)); }
	}
</style>
