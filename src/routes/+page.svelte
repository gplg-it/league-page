<script>
	import LinearProgress from '@smui/linear-progress';
	import { getNflState, leagueName, getAwards, getLeagueTeamManagers, homepageText, managers, gotoManager, enableBlog, waitForAll, dues } from '$lib/utils/helper';
	import { Transactions, PowerRankings, HomePost} from '$lib/components';
	import { getAvatarFromTeamManagers, getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let HeroScene = $state(null);
	let WeeklyRoast = $state(null);

	onMount(async () => {
		const heroMod = await import('$lib/HeroScene.svelte');
		HeroScene = heroMod.default;
		const roastMod = await import('$lib/WeeklyRoast/index.svelte');
		WeeklyRoast = roastMod.default;
	});

	const nflState = getNflState();
	const podiumsData = getAwards();
	const leagueTeamManagersData = getLeagueTeamManagers();

	const featureCards = [
		{ href: '/analytics', icon: 'chart', title: 'Analytics', desc: 'Advanced stats, trends, and power rankings' },
		{ href: '/records', icon: 'trophy', title: 'Records', desc: 'All-time highs, lows, and milestones' },
		{ href: '/standings', icon: 'standings', title: 'Standings', desc: 'Current season rankings and records' },
		{ href: '/matchups', icon: 'matchup', title: 'Matchups', desc: 'Weekly head-to-head results and brackets' },
		{ href: '/drafts', icon: 'draft', title: 'Drafts', desc: 'Draft history and pick-by-pick analysis' },
		{ href: '/transactions', icon: 'trade', title: 'Transactions', desc: 'Trades, waivers, and roster moves' },
	];

	let scrollY = $state(0);
</script>

<svelte:window bind:scrollY={scrollY} />

<style>
	.homePage {
		width: 100%;
		background: #0a0a0f;
	}

	/* ── Cinematic Hero ── */
	.heroWrap {
		position: relative;
		width: 100%;
		height: 90vh;
		min-height: 600px;
		max-height: 900px;
		overflow: hidden;
		background: #0a0a0f;
	}

	.heroCanvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.heroOverlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			180deg,
			rgba(10,10,15,0.3) 0%,
			rgba(10,10,15,0.1) 40%,
			rgba(10,10,15,0.5) 70%,
			rgba(10,10,15,0.95) 100%
		);
		pointer-events: none;
		z-index: 1;
	}

	.heroContent {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		z-index: 2;
		padding: 0 2em 3em;
		box-sizing: border-box;
	}

	.heroInner {
		max-width: 900px;
		margin: 0 auto;
	}

	.leagueBadge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 18px;
		background: rgba(146,5,5,0.9);
		color: #fff;
		border-radius: 20px;
		font-size: 0.78em;
		font-weight: 600;
		letter-spacing: 0.5px;
		margin-bottom: 1em;
		backdrop-filter: blur(8px);
		animation: fadeIn 0.8s ease 0.3s both;
	}

	.leagueBadge .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #4ade80;
		animation: pulse 2s ease infinite;
	}

	.heroTitle {
		font-size: 4em;
		font-weight: 900;
		color: #fff;
		margin: 0 0 0.15em;
		letter-spacing: -2px;
		text-shadow: 0 2px 40px rgba(0,0,0,0.5);
		line-height: 1;
		animation: slideUp 0.7s ease 0.1s both;
	}

	.heroTitleAccent {
		display: block;
		background: linear-gradient(135deg, #c9a84c, #f0d060, #c9a84c);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.heroTagline {
		font-size: 1.1em;
		color: rgba(255,255,255,0.6);
		max-width: 600px;
		line-height: 1.6;
		margin: 0.5em 0 1.5em;
		animation: slideUp 0.7s ease 0.3s both;
	}

	.heroCta {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 12px 28px;
		background: linear-gradient(135deg, #920505, #b90707);
		color: #fff;
		border-radius: 8px;
		font-size: 0.9em;
		font-weight: 700;
		cursor: pointer;
		text-decoration: none;
		letter-spacing: 0.5px;
		transition: all 0.3s;
		border: none;
		animation: slideUp 0.7s ease 0.5s both;
	}

	.heroCta:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 32px rgba(146,5,5,0.4);
	}

	.heroCta svg {
		transition: transform 0.3s;
	}

	.heroCta:hover svg {
		transform: translateX(3px);
	}

	/* ── Dark Sections ── */
	.darkSection {
		background: #0a0a0f;
		padding: 4em 1.5em;
		position: relative;
	}

	.sectionInner {
		max-width: 1100px;
		margin: 0 auto;
	}

	.sectionTitle {
		font-size: 2em;
		font-weight: 900;
		color: #fff;
		margin: 0 0 0.3em;
		letter-spacing: -0.5px;
	}

	.sectionSub {
		color: rgba(255,255,255,0.4);
		font-size: 0.9em;
		margin: 0 0 2.5em;
	}

	.accentBar {
		width: 60px;
		height: 3px;
		background: linear-gradient(90deg, #920505, #d44);
		margin-bottom: 1.5em;
		border-radius: 2px;
	}

	/* ── Champion Card (dark) ── */
	.champRow {
		display: flex;
		align-items: center;
		gap: 2em;
		max-width: 700px;
		margin: 0 auto;
		padding: 2em;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 12px;
		animation: fadeIn 0.6s ease both;
	}

	.champAvatarWrap {
		position: relative;
		width: 110px;
		height: 110px;
		flex-shrink: 0;
		cursor: pointer;
	}

	.champAvatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 3px solid #c9a84c;
		position: absolute;
		left: 50%;
		top: 42%;
		transform: translate(-50%, -50%);
		z-index: 1;
		box-shadow: 0 0 30px rgba(201,168,76,0.3);
	}

	.champLaurel {
		position: absolute;
		width: 110px;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		filter: drop-shadow(0 0 10px rgba(201,168,76,0.3));
	}

	.champInfo {
		flex: 1;
	}

	.champLabel {
		font-size: 0.7em;
		font-weight: 700;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: #c9a84c;
		margin: 0 0 0.5em;
	}

	.champName {
		font-size: 1.8em;
		font-weight: 800;
		color: #fff;
		margin: 0 0 0.2em;
		cursor: pointer;
		transition: color 0.2s;
	}

	.champName:hover {
		color: #c9a84c;
	}

	.champYear {
		font-size: 0.85em;
		color: rgba(255,255,255,0.4);
	}

	/* ── Stats Row ── */
	.statsRow {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		max-width: 800px;
		margin: 3em auto 0;
	}

	.statCard {
		text-align: center;
		padding: 1.3em 0.5em;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
		border-radius: 10px;
		transition: all 0.3s;
	}

	.statCard:hover {
		background: rgba(255,255,255,0.06);
		border-color: rgba(146,5,5,0.3);
		transform: translateY(-2px);
	}

	.statNum {
		font-size: 2em;
		font-weight: 900;
		color: #fff;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.statLabel {
		font-size: 0.72em;
		color: rgba(255,255,255,0.35);
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-top: 0.4em;
		font-weight: 600;
	}

	/* ── Managers Strip ── */
	.managersSection {
		margin-top: 3em;
		text-align: center;
	}

	.managersLabel {
		font-size: 0.75em;
		color: rgba(255,255,255,0.3);
		text-transform: uppercase;
		letter-spacing: 1.5px;
		font-weight: 600;
		margin-bottom: 1em;
	}

	.managersStrip {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.managerBubble {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		border: 2px solid rgba(255,255,255,0.1);
		cursor: pointer;
		transition: all 0.3s;
		object-fit: cover;
		filter: grayscale(30%);
	}

	.managerBubble:hover {
		border-color: #c9a84c;
		transform: scale(1.2);
		box-shadow: 0 0 20px rgba(201,168,76,0.3);
		filter: grayscale(0%);
	}

	/* ── Feature Grid ── */
	.featureGrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.featureCard {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
		border-radius: 12px;
		padding: 1.8em 1.4em;
		cursor: pointer;
		transition: all 0.3s ease;
		text-decoration: none;
		display: block;
		position: relative;
		overflow: hidden;
	}

	.featureCard::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background: linear-gradient(90deg, transparent, #920505, transparent);
		opacity: 0;
		transition: opacity 0.3s;
	}

	.featureCard:hover {
		background: rgba(255,255,255,0.06);
		border-color: rgba(146,5,5,0.3);
		transform: translateY(-4px);
		box-shadow: 0 12px 40px rgba(0,0,0,0.3);
	}

	.featureCard:hover::before {
		opacity: 1;
	}

	.featureIcon {
		width: 40px;
		height: 40px;
		margin-bottom: 0.8em;
	}

	.featureTitle {
		font-size: 1.05em;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.3em;
	}

	.featureDesc {
		font-size: 0.78em;
		color: rgba(255,255,255,0.35);
		line-height: 1.5;
		margin: 0;
	}

	/* ── Roast Section ── */
	.roastSection {
		background: linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%);
		padding: 4em 1.5em;
	}

	.roastSection :global(.roastContainer) {
		max-width: 900px;
		margin: 0 auto;
	}

	.roastSection :global(.roastTitle) {
		color: #fff;
	}

	.roastSection :global(.roastSubtitle) {
		color: rgba(255,255,255,0.4);
	}

	.roastSection :global(.roastCard) {
		background: rgba(255,255,255,0.03);
		border-color: rgba(255,255,255,0.06);
	}

	.roastSection :global(.roastCard:hover) {
		background: rgba(255,255,255,0.06);
		box-shadow: 0 8px 32px rgba(0,0,0,0.3);
	}

	.roastSection :global(.roastName) {
		color: #fff;
	}

	.roastSection :global(.roastLine) {
		color: rgba(255,255,255,0.5);
	}

	.roastSection :global(.roastRecord) {
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}

	.roastSection :global(.roastStats) {
		border-top-color: rgba(255,255,255,0.08);
	}

	.roastSection :global(.roastStatVal) {
		color: #c9a84c;
	}

	.roastSection :global(.roastStatLabel) {
		color: rgba(255,255,255,0.3);
	}

	.roastSection :global(.loadCenter) {
		color: rgba(255,255,255,0.4);
	}

	/* ── Content sections (light) ── */
	.lightSection {
		background: var(--fff);
		padding: 3em 1.5em;
	}

	.contentGrid {
		display: grid;
		grid-template-columns: 1fr 400px;
		gap: 0;
		max-width: 1200px;
		margin: 0 auto;
	}

	.mainContent {
		padding: 0 1em 3em;
	}

	.sideContent {
		background: var(--f3f3f3);
		border-left: 1px solid var(--eee);
		padding: 1.5em 0;
		min-height: 300px;
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 1em;
		padding: 0 0.5em;
	}

	.sectionHeader h3 {
		font-size: 1.1em;
		font-weight: 700;
		color: var(--g333);
		margin: 0;
	}

	.sectionHeaderLine {
		flex: 1;
		height: 1px;
		background: var(--eee);
	}

	.transactionsWrap {
		display: block;
		width: 92%;
		margin: 0 auto;
	}

	/* ── Divider ── */
	.sectionDivider {
		width: 100%;
		height: 1px;
		background: linear-gradient(90deg, transparent 10%, rgba(146,5,5,0.3) 50%, transparent 90%);
	}

	/* ── Loading ── */
	.loadCenter {
		text-align: center;
		padding: 2em 1em;
		color: rgba(255,255,255,0.4);
		font-size: 0.9em;
	}

	/* ── Animations ── */
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(30px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* ── Responsive ── */
	@media (max-width: 950px) {
		.contentGrid {
			grid-template-columns: 1fr;
		}
		.sideContent {
			border-left: none;
			border-top: 1px solid var(--eee);
		}
		.champRow {
			flex-direction: column;
			text-align: center;
		}
	}

	@media (max-width: 700px) {
		.featureGrid { grid-template-columns: repeat(2, 1fr); }
		.heroTitle { font-size: 2.6em; }
	}

	@media (max-width: 540px) {
		.heroWrap { min-height: 500px; }
		.heroTitle { font-size: 2em; }
		.statsRow { grid-template-columns: repeat(2, 1fr); }
		.featureGrid { grid-template-columns: 1fr; }
		.statNum { font-size: 1.5em; }
		.heroContent { padding: 0 1em 2em; }
	}

	:global(.curOwner) {
		font-size: 0.75em;
		color: #bbb;
		font-style: italic;
	}
</style>

<div class="homePage">
	<!-- ═══ CINEMATIC 3D HERO ═══ -->
	<div class="heroWrap">
		<div class="heroCanvas">
			{#if HeroScene}
				<HeroScene />
			{/if}
		</div>
		<div class="heroOverlay"></div>
		<div class="heroContent" style="transform: translateY({scrollY * 0.3}px); opacity: {Math.max(0, 1 - scrollY / 500)}">
			<div class="heroInner">
				{#await nflState}
					<div class="leagueBadge">Loading...</div>
				{:then nflStateData}
					<div class="leagueBadge">
						<span class="dot"></span>
						NFL {nflStateData.season}
						{#if nflStateData.season_type == 'pre'}
							Preseason
						{:else if nflStateData.season_type == 'post'}
							Postseason
						{:else}
							{nflStateData.week > 0 ? `Week ${nflStateData.week}` : "Preseason"}
						{/if}
					</div>
				{:catch}
					<div class="leagueBadge">NFL Season</div>
				{/await}

				<h1 class="heroTitle">
					{leagueName.split(' ').slice(0, -1).join(' ')}
					<span class="heroTitleAccent">{leagueName.split(' ').pop()}</span>
				</h1>
				<p class="heroTagline">Where 12 degenerates have been destroying friendships over fantasy football for over a decade. No mercy. No refunds.</p>
				<a class="heroCta" href="/analytics">
					Enter the War Room
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
						<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- ═══ CHAMPION + STATS ═══ -->
	<div class="darkSection">
		<div class="sectionInner">
			<div class="accentBar"></div>
			<h2 class="sectionTitle">Reigning Champion</h2>
			<p class="sectionSub">The only person allowed to talk trash without looking stupid. For now.</p>

			{#await waitForAll(podiumsData, leagueTeamManagersData)}
				<div class="loadCenter">
					<p>Loading champion data...</p>
					<LinearProgress indeterminate />
				</div>
			{:then [podiums, leagueTeamManagers]}
				{#if podiums[0]}
					<div class="champRow">
						<div class="champAvatarWrap" onclick={() => {if(managers.length) gotoManager({year: podiums[0].year, leagueTeamManagers, rosterID: parseInt(podiums[0].champion)})}}>
							<img src="{getAvatarFromTeamManagers(leagueTeamManagers, podiums[0].champion, podiums[0].year)}" class="champAvatar" alt="champion" />
							<img src="/laurel.png" class="champLaurel" alt="laurel" />
						</div>
						<div class="champInfo">
							<div class="champLabel">Reigning Champion</div>
							<p class="champName" onclick={() => gotoManager({year: podiums[0].year, leagueTeamManagers, rosterID: parseInt(podiums[0].champion)})}>
								{getTeamFromTeamManagers(leagueTeamManagers, podiums[0].champion, podiums[0].year).name}
							</p>
							<div class="champYear">{podiums[0].year} Season Champion</div>
						</div>
					</div>
				{/if}
			{:catch error}
				<div class="loadCenter">Could not load champion: {error.message}</div>
			{/await}

			<!-- Quick Stats -->
			<div class="statsRow">
				<div class="statCard">
					<div class="statNum">{managers.length || 12}</div>
					<div class="statLabel">Managers</div>
				</div>
				<div class="statCard">
					<div class="statNum">15+</div>
					<div class="statLabel">Seasons</div>
				</div>
				<div class="statCard">
					<div class="statNum">${dues}</div>
					<div class="statLabel">Buy-In</div>
				</div>
				<div class="statCard">
					<div class="statNum">&frac12;</div>
					<div class="statLabel">PPR</div>
				</div>
			</div>

			<!-- Managers -->
			{#if managers.length}
				<div class="managersSection">
					<div class="managersLabel">The Degenerates</div>
					<div class="managersStrip">
						{#each managers as mgr}
							<img
								src={mgr.photo}
								alt={mgr.name}
								class="managerBubble"
								title={mgr.name}
								onclick={() => goto(`/managers?manager=${mgr.managerID}`)}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="sectionDivider"></div>

	<!-- ═══ FEATURE NAVIGATION ═══ -->
	<div class="darkSection">
		<div class="sectionInner">
			<div class="accentBar"></div>
			<h2 class="sectionTitle">Explore</h2>
			<p class="sectionSub">Everything you need to settle arguments and start new ones.</p>

			<div class="featureGrid">
				{#each featureCards as card}
					<a class="featureCard" href={card.href}>
						{#if card.icon === 'chart'}
							<svg class="featureIcon" viewBox="0 0 36 36" fill="none">
								<rect x="2" y="22" width="6" height="12" rx="1" fill="#920505" opacity="0.4"/>
								<rect x="10" y="16" width="6" height="18" rx="1" fill="#920505" opacity="0.6"/>
								<rect x="18" y="10" width="6" height="24" rx="1" fill="#920505" opacity="0.8"/>
								<rect x="26" y="4" width="6" height="30" rx="1" fill="#920505"/>
							</svg>
						{:else if card.icon === 'trophy'}
							<svg class="featureIcon" viewBox="0 0 36 36" fill="none">
								<path d="M8 6h20v4a10 10 0 01-20 0V6z" fill="#c9a84c" opacity="0.9"/>
								<path d="M5 6h3v5a4 4 0 01-3-4V6zm23 0h3v1a4 4 0 01-3 4V6z" fill="#c9a84c" opacity="0.5"/>
								<rect x="15" y="18" width="6" height="6" rx="1" fill="#c9a84c" opacity="0.7"/>
								<rect x="10" y="24" width="16" height="3" rx="1.5" fill="#c9a84c" opacity="0.9"/>
							</svg>
						{:else if card.icon === 'standings'}
							<svg class="featureIcon" viewBox="0 0 36 36" fill="none">
								<rect x="4" y="8" width="28" height="4" rx="2" fill="#fff" opacity="0.8"/>
								<rect x="4" y="16" width="22" height="4" rx="2" fill="#fff" opacity="0.4"/>
								<rect x="4" y="24" width="16" height="4" rx="2" fill="#fff" opacity="0.2"/>
							</svg>
						{:else if card.icon === 'matchup'}
							<svg class="featureIcon" viewBox="0 0 36 36" fill="none">
								<circle cx="11" cy="18" r="8" fill="#920505" opacity="0.8"/>
								<circle cx="25" cy="18" r="8" fill="#920505" opacity="0.5"/>
								<text x="18" y="22" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">VS</text>
							</svg>
						{:else if card.icon === 'draft'}
							<svg class="featureIcon" viewBox="0 0 36 36" fill="none">
								<rect x="6" y="4" width="24" height="28" rx="3" fill="#fff" opacity="0.1"/>
								<rect x="10" y="10" width="16" height="2.5" rx="1" fill="#fff" opacity="0.6"/>
								<rect x="10" y="15" width="12" height="2.5" rx="1" fill="#fff" opacity="0.35"/>
								<rect x="10" y="20" width="14" height="2.5" rx="1" fill="#fff" opacity="0.45"/>
								<rect x="10" y="25" width="10" height="2.5" rx="1" fill="#fff" opacity="0.25"/>
							</svg>
						{:else if card.icon === 'trade'}
							<svg class="featureIcon" viewBox="0 0 36 36" fill="none">
								<path d="M6 14h18l-5-5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
								<path d="M30 22H12l5 5" stroke="#920505" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
							</svg>
						{/if}
						<div class="featureTitle">{card.title}</div>
						<p class="featureDesc">{card.desc}</p>
					</a>
				{/each}
			</div>
		</div>
	</div>

	<div class="sectionDivider"></div>

	<!-- ═══ ROAST REPORT ═══ -->
	<div class="roastSection">
		<div class="sectionInner">
			<div class="accentBar"></div>
			<h2 class="sectionTitle">The Roast Report</h2>
			<p class="sectionSub">An algorithmically generated assessment of how terrible everyone is.</p>

			{#if WeeklyRoast}
				<WeeklyRoast />
			{/if}
		</div>
	</div>

	<div class="sectionDivider"></div>

	<!-- ═══ POWER RANKINGS + TRANSACTIONS ═══ -->
	<div class="lightSection">
		<div class="contentGrid">
			<div class="mainContent">
				<div class="sectionHeader">
					<h3>Power Rankings</h3>
					<div class="sectionHeaderLine"></div>
				</div>
				<PowerRankings />
			</div>

			<div class="sideContent">
				<div class="transactionsWrap">
					<div class="sectionHeader">
						<h3>Recent Activity</h3>
						<div class="sectionHeaderLine"></div>
					</div>
					<Transactions />
				</div>
			</div>
		</div>
	</div>
</div>
