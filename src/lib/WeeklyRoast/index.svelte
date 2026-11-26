<script>
	import { getLeagueTeamManagers, waitForAll, managers } from '$lib/utils/helper';
	import { getLeagueAnalytics } from '$lib/utils/helperFunctions/leagueAnalytics';
	import LinearProgress from '@smui/linear-progress';
	import { onMount } from 'svelte';
	import { getTeamFromManagerID } from '$lib/utils/helperFunctions/universalFunctions';

	let loading = $state(true);
	let roasts = $state([]);
	let weekLabel = $state('');
	let expandedRoast = $state(null);

	const insults = {
		terrible: [
			"put up a score that belongs in a golf tournament, not a football league",
			"scored fewer points than a bye week",
			"got beaten so badly even their bench was embarrassed",
			"played like they drafted their team at a yard sale",
			"apparently thought this was a 'tank for picks' league",
			"needs to check if their roster is still alive",
			"put together a lineup that a blindfolded monkey could've beaten",
			"scored so low their opponents thought it was a scrimmage",
		],
		blowoutLoss: [
			"got absolutely baptized",
			"suffered a loss so bad their grandkids will feel it",
			"got sent to the shadow realm",
			"was spotted in the ER after that beating",
			"had their franchise rights revoked after that performance",
			"should file a police report for that robbery",
			"got violated in ways that shouldn't be legal",
		],
		blowoutWin: [
			"didn't just win, they committed a felony on the scoreboard",
			"put up a score that should require a permit",
			"absolutely destroyed the concept of fair competition",
			"went full Thanos on their opponent this week",
			"won so decisively the Geneva Convention needs updating",
		],
		lucky: [
			"won by luck alone — their guardian angel is working overtime",
			"survived by the thinnest of margins, like their fantasy knowledge",
			"scraped by with a win that was 100% undeserved",
			"won a game they had absolutely no business winning",
			"got bailed out harder than a Wall Street bank in 2008",
		],
		unlucky: [
			"scored enough to beat 10 of 12 teams but played the one team they couldn't",
			"got absolutely jobbed by the schedule gods",
			"put up a solid score that meant nothing against their opponent's explosion",
			"deserved better than what the fantasy gods delivered",
		],
		streak: [
			"is on a winning streak longer than their attention span",
			"keeps stacking Ws like they're on clearance",
			"hasn't lost in so long they forgot what it feels like",
		],
		losingStreak: [
			"is in a freefall that makes the stock market look stable",
			"hasn't won in so long their team filed for unemployment",
			"is building a losing streak that could qualify as a natural disaster",
			"is on a losing streak longer than a CVS receipt",
		],
		mediocre: [
			"continues to be the human embodiment of room temperature",
			"is about as exciting as watching paint dry on a beige wall",
			"exists in the most forgettable middle ground possible",
			"put up a score that screams 'I didn't even look at my lineup'",
		],
	};

	const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

	const generateRoasts = (analytics, leagueTeamManagers) => {
		if (!analytics?.managerAnalytics || !analytics?.streaksAndMilestones) return [];

		const { managerAnalytics, streaksAndMilestones, luckAnalysis, closeGames, allSeasons } = analytics;
		const latestYear = allSeasons?.length > 0 ? Math.max(...allSeasons.map(s => s.year)) : new Date().getFullYear();
		weekLabel = `${latestYear} Season Roast Report`;

		const generatedRoasts = [];

		for (const mID in managerAnalytics) {
			const mgr = managerAnalytics[mID];
			const luck = luckAnalysis?.[mID] || {};
			const milestones = streaksAndMilestones?.milestones?.[mID] || {};
			const close = closeGames?.[mID] || {};
			const team = getTeamFromManagerID(leagueTeamManagers, mID);
			const name = team?.name || `Manager ${mID}`;

			const roastLines = [];
			let severity = 'neutral';
			let emoji = '🏈';

			if (mgr.winRate < 35) {
				roastLines.push(`${name} ${pickRandom(insults.terrible)}.`);
				severity = 'terrible';
				emoji = '💀';
			} else if (mgr.winRate < 45) {
				roastLines.push(`${name} ${pickRandom(insults.mediocre)}.`);
				severity = 'bad';
				emoji = '😴';
			}

			if (milestones.currentStreak?.type === 'W' && milestones.currentStreak.count >= 3) {
				roastLines.push(`Currently ${pickRandom(insults.streak)} (${milestones.currentStreak.count}W).`);
				severity = 'hot';
				emoji = '🔥';
			} else if (milestones.currentStreak?.type === 'L' && milestones.currentStreak.count >= 3) {
				roastLines.push(`${pickRandom(insults.losingStreak)} (${milestones.currentStreak.count}L).`);
				severity = 'terrible';
				emoji = '🪦';
			}

			if (luck.luckIndex > 15) {
				roastLines.push(`${pickRandom(insults.lucky)}`);
			} else if (luck.luckIndex < -15) {
				roastLines.push(`${pickRandom(insults.unlucky)}`);
			}

			if (close.closeLosses > close.closeWins && close.closeLosses >= 2) {
				roastLines.push(`Has lost ${close.closeLosses} close games — absolutely cursed in clutch moments.`);
			}

			if (mgr.worstWeek < 60) {
				roastLines.push(`Posted a ${mgr.worstWeek}-point week at some point. That's not fantasy football, that's fantasy checkers.`);
			}

			if (mgr.bestWeek > 170) {
				roastLines.push(`Dropped a ${mgr.bestWeek}-point bomb once. ${pickRandom(insults.blowoutWin)}.`);
				if (severity === 'neutral') { severity = 'elite'; emoji = '👑'; }
			}

			if (mgr.winRate > 60) {
				if (roastLines.length === 0) {
					roastLines.push(`${name} keeps winning and nobody likes it. ${mgr.winRate}% win rate is just showing off at this point.`);
				}
				if (severity === 'neutral') { severity = 'elite'; emoji = '👑'; }
			}

			if (roastLines.length === 0) {
				roastLines.push(`${name} ${pickRandom(insults.mediocre)}.`);
				severity = 'meh';
				emoji = '🥱';
			}

			generatedRoasts.push({
				managerID: mID,
				name,
				roastLines,
				severity,
				emoji,
				stats: {
					winRate: mgr.winRate,
					avgPoints: mgr.avgPoints,
					consistency: mgr.consistency,
					bestWeek: mgr.bestWeek,
					worstWeek: mgr.worstWeek,
					wins: mgr.wins,
					losses: mgr.losses,
				},
			});
		}

		generatedRoasts.sort((a, b) => {
			const order = { terrible: 0, bad: 1, meh: 2, neutral: 3, hot: 4, elite: 5 };
			return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
		});

		return generatedRoasts;
	};

	onMount(async () => {
		const [analytics, leagueTeamManagers] = await waitForAll(
			getLeagueAnalytics(),
			getLeagueTeamManagers(),
		);
		roasts = generateRoasts(analytics, leagueTeamManagers);
		loading = false;
	});
</script>

<style>
	.roastContainer {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1em;
	}

	.roastHeader {
		text-align: center;
		margin-bottom: 2em;
	}

	.roastTitle {
		font-size: 1.8em;
		font-weight: 900;
		color: var(--g333);
		margin: 0 0 0.3em;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.roastSubtitle {
		font-size: 0.85em;
		color: var(--g999);
		font-style: italic;
	}

	.roastCard {
		background: var(--fff);
		border: 1px solid var(--eee);
		border-left: 4px solid var(--g999);
		border-radius: 0 8px 8px 0;
		padding: 1.2em 1.5em;
		margin-bottom: 12px;
		cursor: pointer;
		transition: all 0.25s ease;
		position: relative;
		overflow: hidden;
	}

	.roastCard:hover {
		transform: translateX(4px);
		box-shadow: 0 4px 16px rgba(0,0,0,0.08);
	}

	.roastCard.terrible { border-left-color: #920505; }
	.roastCard.bad { border-left-color: #d97706; }
	.roastCard.meh { border-left-color: #9ca3af; }
	.roastCard.hot { border-left-color: #f59e0b; }
	.roastCard.elite { border-left-color: #c9a84c; }

	.roastCard::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 60px;
		height: 100%;
		pointer-events: none;
	}

	.roastCard.terrible::after { background: linear-gradient(90deg, transparent, rgba(146,5,5,0.03)); }
	.roastCard.elite::after { background: linear-gradient(90deg, transparent, rgba(201,168,76,0.05)); }

	.roastCardHeader {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 0.6em;
	}

	.roastEmoji {
		font-size: 1.6em;
		line-height: 1;
	}

	.roastName {
		font-size: 1.1em;
		font-weight: 700;
		color: var(--g333);
		flex: 1;
	}

	.roastRecord {
		font-size: 0.75em;
		color: var(--g555);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		background: var(--f3f3f3);
		padding: 3px 10px;
		border-radius: 12px;
	}

	.roastLine {
		font-size: 0.88em;
		color: var(--g555);
		line-height: 1.6;
		margin: 0.3em 0;
	}

	.roastStats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-top: 1em;
		padding-top: 1em;
		border-top: 1px solid var(--eee);
	}

	.roastStat {
		text-align: center;
	}

	.roastStatVal {
		font-size: 1.1em;
		font-weight: 800;
		color: #920505;
		font-variant-numeric: tabular-nums;
	}

	.roastStatLabel {
		font-size: 0.65em;
		color: var(--g999);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-top: 2px;
	}

	.loadCenter {
		text-align: center;
		padding: 3em 1em;
		color: var(--g999);
	}

	@media (max-width: 540px) {
		.roastTitle { font-size: 1.3em; }
		.roastStats { grid-template-columns: repeat(2, 1fr); }
		.roastCard { padding: 1em; }
	}
</style>

<div class="roastContainer">
	{#if loading}
		<div class="loadCenter">
			<p>Generating roasts...</p>
			<LinearProgress indeterminate />
		</div>
	{:else}
		<div class="roastHeader">
			<h2 class="roastTitle">{weekLabel}</h2>
			<p class="roastSubtitle">No feelings were spared in the making of this report.</p>
		</div>

		{#each roasts as roast}
			<div
				class="roastCard {roast.severity}"
				onclick={() => expandedRoast = expandedRoast === roast.managerID ? null : roast.managerID}
			>
				<div class="roastCardHeader">
					<span class="roastEmoji">{roast.emoji}</span>
					<span class="roastName">{roast.name}</span>
					<span class="roastRecord">{roast.stats.wins}W-{roast.stats.losses}L</span>
				</div>
				{#each roast.roastLines as line}
					<p class="roastLine">{line}</p>
				{/each}

				{#if expandedRoast === roast.managerID}
					<div class="roastStats">
						<div class="roastStat">
							<div class="roastStatVal">{roast.stats.winRate}%</div>
							<div class="roastStatLabel">Win Rate</div>
						</div>
						<div class="roastStat">
							<div class="roastStatVal">{roast.stats.avgPoints}</div>
							<div class="roastStatLabel">Avg PPG</div>
						</div>
						<div class="roastStat">
							<div class="roastStatVal">{roast.stats.bestWeek}</div>
							<div class="roastStatLabel">Best Week</div>
						</div>
						<div class="roastStat">
							<div class="roastStatVal">{roast.stats.worstWeek}</div>
							<div class="roastStatLabel">Worst Week</div>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
