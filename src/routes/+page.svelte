<script>
	import LinearProgress from '@smui/linear-progress';
	import { getNflState, leagueName, getAwards, getLeagueTeamManagers, homepageText, managers, gotoManager, enableBlog, waitForAll, dues } from '$lib/utils/helper';
	import { Transactions, PowerRankings, HomePost} from '$lib/components';
	import { getAvatarFromTeamManagers, getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
	import { goto } from '$app/navigation';

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
</script>

<style>
    .homePage {
        width: 100%;
    }

    /* ── Hero ── */
    .hero {
        position: relative;
        text-align: center;
        padding: 3em 1.5em 2.5em;
        background: linear-gradient(135deg, var(--fff) 0%, var(--f3f3f3) 100%);
        border-bottom: 3px solid #920505;
        overflow: hidden;
    }

    .hero::before {
        content: '';
        position: absolute;
        top: -60%;
        left: -10%;
        width: 120%;
        height: 120%;
        background: radial-gradient(ellipse at 30% 20%, rgba(146,5,5,0.06) 0%, transparent 60%);
        pointer-events: none;
    }

    .accentLine {
        width: 60px;
        height: 3px;
        background: linear-gradient(90deg, #920505, #d44);
        margin: 0 auto 1em;
        border-radius: 2px;
    }

    .heroTitle {
        font-size: 2.6em;
        font-weight: 800;
        letter-spacing: -1px;
        margin: 0 0 0.15em;
        color: var(--g333);
        animation: fadeSlideUp 0.6s ease both;
    }

    .heroSub {
        font-size: 0.95em;
        color: var(--g555);
        max-width: 540px;
        margin: 0 auto;
        line-height: 1.6;
        animation: fadeSlideUp 0.6s ease 0.1s both;
    }

    .seasonBadge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 1.2em;
        padding: 6px 16px;
        background: #920505;
        color: #fff;
        border-radius: 20px;
        font-size: 0.82em;
        font-weight: 600;
        letter-spacing: 0.3px;
        animation: fadeSlideUp 0.6s ease 0.2s both;
    }

    .seasonBadge .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #4ade80;
        animation: pulse 2s ease infinite;
    }

    /* ── Champion spotlight ── */
    .champSection {
        max-width: 480px;
        margin: -1.5em auto 0;
        padding: 0 1em;
        position: relative;
        z-index: 1;
        animation: fadeSlideUp 0.6s ease 0.3s both;
    }

    .champCard {
        background: var(--fff);
        border: 2px solid transparent;
        border-image: linear-gradient(135deg, #c9a84c, #f0d060, #c9a84c) 1;
        border-radius: 0;
        padding: 2em 1.5em 1.5em;
        text-align: center;
        position: relative;
        box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    }

    .champLabel {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #c9a84c, #e8c84c);
        color: #3d2e00;
        font-size: 0.7em;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: 4px 18px;
        border-radius: 10px;
        white-space: nowrap;
    }

    .champAvatarWrap {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0.5em auto 0;
        cursor: pointer;
    }

    .champAvatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 3px solid #c9a84c;
        position: absolute;
        left: 50%;
        top: 42%;
        transform: translate(-50%, -50%);
        z-index: 1;
        box-shadow: 0 0 20px rgba(201,168,76,0.3);
    }

    .champLaurel {
        position: absolute;
        width: 115px;
        height: auto;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    .champTrophy {
        display: block;
        margin: 0 auto 0.3em;
    }

    .champYear {
        font-size: 0.8em;
        color: var(--g999);
        font-weight: 600;
        letter-spacing: 0.5px;
        margin: 0 0 0.2em;
    }

    .champName {
        font-size: 1.5em;
        font-weight: 700;
        color: var(--g333);
        cursor: pointer;
        transition: color 0.2s;
        margin: 0;
    }

    .champName:hover {
        color: #920505;
    }

    /* ── Stats row ── */
    .statsRow {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        max-width: 700px;
        margin: 2em auto;
        padding: 0 1em;
        animation: fadeSlideUp 0.6s ease 0.4s both;
    }

    .statCard {
        text-align: center;
        padding: 1em 0.5em;
        background: var(--fff);
        border: 1px solid var(--eee);
        border-radius: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .statCard:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .statNum {
        font-size: 1.6em;
        font-weight: 800;
        color: #920505;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
    }

    .statLabel {
        font-size: 0.72em;
        color: var(--g555);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 0.3em;
        font-weight: 600;
    }

    /* ── Intro text ── */
    .introSection {
        max-width: 640px;
        margin: 0 auto 2em;
        padding: 0 1.5em;
        text-align: center;
        animation: fadeSlideUp 0.6s ease 0.45s both;
    }

    .introSection :global(p) {
        color: var(--g555);
        line-height: 1.7;
        font-size: 0.92em;
        margin: 0.5em 0;
    }

    .introSection :global(strong) {
        color: var(--g333);
    }

    /* ── Feature cards ── */
    .featureGrid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        max-width: 800px;
        margin: 0 auto 2.5em;
        padding: 0 1em;
        animation: fadeSlideUp 0.6s ease 0.5s both;
    }

    .featureCard {
        background: var(--fff);
        border: 1px solid var(--eee);
        border-radius: 10px;
        padding: 1.3em 1em;
        cursor: pointer;
        transition: all 0.25s ease;
        text-decoration: none;
        display: block;
    }

    .featureCard:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        border-color: #920505;
    }

    .featureIcon {
        width: 36px;
        height: 36px;
        margin-bottom: 0.6em;
    }

    .featureTitle {
        font-size: 0.95em;
        font-weight: 700;
        color: var(--g333);
        margin: 0 0 0.25em;
    }

    .featureDesc {
        font-size: 0.75em;
        color: var(--g999);
        line-height: 1.4;
        margin: 0;
    }

    /* ── Managers strip ── */
    .managersStrip {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        max-width: 600px;
        margin: 0 auto 2.5em;
        padding: 0 1em;
        animation: fadeSlideUp 0.6s ease 0.55s both;
    }

    .managerBubble {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 2px solid var(--eee);
        cursor: pointer;
        transition: all 0.2s;
        object-fit: cover;
    }

    .managerBubble:hover {
        border-color: #920505;
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(146,5,5,0.2);
    }

    /* ── Content sections ── */
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

    /* ── Loading ── */
    .loadCenter {
        text-align: center;
        padding: 2em 1em;
        color: var(--g999);
        font-size: 0.9em;
    }

    /* ── Animations ── */
    @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
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
    }

    @media (max-width: 540px) {
        .heroTitle { font-size: 1.8em; }
        .statsRow { grid-template-columns: repeat(2, 1fr); }
        .featureGrid { grid-template-columns: repeat(2, 1fr); }
        .statNum { font-size: 1.3em; }
        .champCard { padding: 1.5em 1em 1.2em; }
    }

    :global(.curOwner) {
        font-size: 0.75em;
        color: #bbb;
        font-style: italic;
    }
</style>

<div class="homePage">
    <!-- ═══ HERO ═══ -->
    <div class="hero">
        <div class="accentLine"></div>
        <h1 class="heroTitle">{leagueName}</h1>
        <p class="heroSub">12-team Redraft Half PPR on Sleeper. Explore matchups, track records, and dive into advanced analytics all in one place.</p>
        {#await nflState}
            <div class="seasonBadge">Loading season...</div>
        {:then nflStateData}
            <div class="seasonBadge">
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
            <div class="seasonBadge">NFL Season</div>
        {/await}
    </div>

    <!-- ═══ CHAMPION SPOTLIGHT ═══ -->
    {#await waitForAll(podiumsData, leagueTeamManagersData)}
        <div class="champSection">
            <div class="champCard">
                <div class="loadCenter">
                    <p>Loading champion...</p>
                    <LinearProgress indeterminate />
                </div>
            </div>
        </div>
    {:then [podiums, leagueTeamManagers]}
        {#if podiums[0]}
            <div class="champSection">
                <div class="champCard">
                    <div class="champLabel">Reigning Champion</div>
                    <svg class="champTrophy" width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M5 3h14v2a7 7 0 01-14 0V3z" fill="#c9a84c"/>
                        <path d="M3 3h2v3a3 3 0 01-2-3zm16 0h2a3 3 0 01-2 3V3z" fill="#e8c84c"/>
                        <rect x="10" y="12" width="4" height="4" rx="0.5" fill="#c9a84c"/>
                        <rect x="7" y="16" width="10" height="2" rx="1" fill="#c9a84c"/>
                    </svg>
                    <div class="champYear">{podiums[0].year} Season</div>
                    <div class="champAvatarWrap" onclick={() => {if(managers.length) gotoManager({year: podiums[0].year, leagueTeamManagers, rosterID: parseInt(podiums[0].champion)})}}>
                        <img src="{getAvatarFromTeamManagers(leagueTeamManagers, podiums[0].champion, podiums[0].year)}" class="champAvatar" alt="champion" />
                        <img src="/laurel.png" class="champLaurel" alt="laurel" />
                    </div>
                    <p class="champName" onclick={() => gotoManager({year: podiums[0].year, leagueTeamManagers, rosterID: parseInt(podiums[0].champion)})}>
                        {getTeamFromTeamManagers(leagueTeamManagers, podiums[0].champion, podiums[0].year).name}
                    </p>
                </div>
            </div>
        {/if}
    {:catch error}
        <div class="champSection">
            <div class="champCard">
                <p class="loadCenter">Could not load champion: {error.message}</p>
            </div>
        </div>
    {/await}

    <!-- ═══ QUICK STATS ═══ -->
    <div class="statsRow">
        <div class="statCard">
            <div class="statNum">{managers.length || 12}</div>
            <div class="statLabel">Managers</div>
        </div>
        <div class="statCard">
            <div class="statNum">5+</div>
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

    <!-- ═══ INTRO TEXT ═══ -->
    <div class="introSection">
        {@html homepageText}
        {#if enableBlog}
            <HomePost />
        {/if}
    </div>

    <!-- ═══ MANAGERS STRIP ═══ -->
    {#if managers.length}
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
    {/if}

    <!-- ═══ FEATURE NAV CARDS ═══ -->
    <div class="featureGrid">
        {#each featureCards as card}
            <a class="featureCard" href={card.href}>
                {#if card.icon === 'chart'}
                    <svg class="featureIcon" viewBox="0 0 36 36" fill="none">
                        <rect x="2" y="22" width="6" height="12" rx="1" fill="#920505" opacity="0.3"/>
                        <rect x="10" y="16" width="6" height="18" rx="1" fill="#920505" opacity="0.5"/>
                        <rect x="18" y="10" width="6" height="24" rx="1" fill="#920505" opacity="0.7"/>
                        <rect x="26" y="4" width="6" height="30" rx="1" fill="#920505"/>
                    </svg>
                {:else if card.icon === 'trophy'}
                    <svg class="featureIcon" viewBox="0 0 36 36" fill="none">
                        <path d="M8 6h20v4a10 10 0 01-20 0V6z" fill="#920505" opacity="0.8"/>
                        <path d="M5 6h3v5a4 4 0 01-3-4V6zm23 0h3v1a4 4 0 01-3 4V6z" fill="#920505" opacity="0.4"/>
                        <rect x="15" y="18" width="6" height="6" rx="1" fill="#920505" opacity="0.6"/>
                        <rect x="10" y="24" width="16" height="3" rx="1.5" fill="#920505" opacity="0.8"/>
                    </svg>
                {:else if card.icon === 'standings'}
                    <svg class="featureIcon" viewBox="0 0 36 36" fill="none">
                        <rect x="4" y="8" width="28" height="4" rx="2" fill="#920505" opacity="0.8"/>
                        <rect x="4" y="16" width="22" height="4" rx="2" fill="#920505" opacity="0.5"/>
                        <rect x="4" y="24" width="16" height="4" rx="2" fill="#920505" opacity="0.3"/>
                    </svg>
                {:else if card.icon === 'matchup'}
                    <svg class="featureIcon" viewBox="0 0 36 36" fill="none">
                        <circle cx="11" cy="18" r="8" fill="#920505" opacity="0.7"/>
                        <circle cx="25" cy="18" r="8" fill="#920505" opacity="0.4"/>
                        <text x="18" y="22" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">VS</text>
                    </svg>
                {:else if card.icon === 'draft'}
                    <svg class="featureIcon" viewBox="0 0 36 36" fill="none">
                        <rect x="6" y="4" width="24" height="28" rx="3" fill="#920505" opacity="0.15"/>
                        <rect x="10" y="10" width="16" height="2.5" rx="1" fill="#920505" opacity="0.6"/>
                        <rect x="10" y="15" width="12" height="2.5" rx="1" fill="#920505" opacity="0.4"/>
                        <rect x="10" y="20" width="14" height="2.5" rx="1" fill="#920505" opacity="0.5"/>
                        <rect x="10" y="25" width="10" height="2.5" rx="1" fill="#920505" opacity="0.3"/>
                    </svg>
                {:else if card.icon === 'trade'}
                    <svg class="featureIcon" viewBox="0 0 36 36" fill="none">
                        <path d="M6 14h18l-5-5" stroke="#920505" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
                        <path d="M30 22H12l5 5" stroke="#920505" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
                    </svg>
                {/if}
                <div class="featureTitle">{card.title}</div>
                <p class="featureDesc">{card.desc}</p>
            </a>
        {/each}
    </div>

    <!-- ═══ POWER RANKINGS + TRANSACTIONS ═══ -->
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
