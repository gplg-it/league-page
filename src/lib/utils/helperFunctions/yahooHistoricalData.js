// Yahoo Fantasy Football historical data for "The League" (2011-2023)
// The league moved to Sleeper as "The League 2.0" starting in 2024.

// --- Manager identity constants ---

const YAHOO_ADAM_HERSH = 'yahoo_adam_hersh';
const YAHOO_CHICO = 'yahoo_chico';

// Sleeper manager IDs for current members who were also in the Yahoo era
const MID = {
	c3aquino:      '720834621427777536',
	craigsmooth:   '1136444542695612416',
	BWheels87:     '872720337966678016',
	kazzamm:       '872724112974475264',
	BABSLAB:       '98902433476263936',
	jsoliz:        '1136445199691218944',
	minafarag:     '214112107816288256',
	jimmypineda3:  '1136445442637684736',
	RaandySavage:  '1136444222846271488',
	Cicco:         '1136445952631685120',
	armvnd:        '1136446055476178944',
	micksitupp:    '1136445458228457472',
};

// --- Scoring settings by era ---

const YAHOO_STANDARD_SCORING = {
	pass_td: 4,
	pass_yd: 0.04,
	pass_int: -1,
	pass_2pt: 2,
	rush_td: 6,
	rush_yd: 0.1,
	rush_2pt: 2,
	rec_td: 6,
	rec_yd: 0.1,
	rec: 0,
	rec_2pt: 2,
	fum_lost: -2,
	fum: 0,
	fgm_0_19: 3,
	fgm_20_29: 3,
	fgm_30_39: 3,
	fgm_40_49: 4,
	fgm_50p: 5,
	fgmiss: -1,
	xpm: 1,
	pts_allow_0: 10,
	pts_allow_1_6: 7,
	pts_allow_7_13: 4,
	pts_allow_14_20: 1,
	pts_allow_21_27: 0,
	pts_allow_28_34: -1,
	pts_allow_35p: -4,
	sack: 1,
	int: 2,
	fum_rec: 2,
	def_td: 6,
	safe: 2,
	blk_kick: 2,
};

const YAHOO_HALF_PPR_SCORING = {
	...YAHOO_STANDARD_SCORING,
	rec: 0.5,
};

export const getYahooScoringSettings = (year) => {
	if (year <= 2016) return { ...YAHOO_STANDARD_SCORING };
	return { ...YAHOO_HALF_PPR_SCORING };
};

// --- League settings by era ---

export const getYahooLeagueSettings = (year) => {
	const isExpanded = year >= 2021;
	return {
		playoff_week_start: isExpanded ? 15 : 14,
		num_teams: 12,
		trade_deadline: isExpanded ? 12 : 11,
		waiver_type: 1,
		type: 0,
		regular_season_weeks: isExpanded ? 14 : 13,
		playoff_teams: 6,
		platform: 'yahoo',
	};
};

// --- Roster format ---

const YAHOO_ROSTER = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'];

// --- Manager rosters per year ---
// Per the commissioner: Chico (Cicco's brother) played one season and micksitupp (Mickey)
// took his spot; minafarag (Mina) took Adam Hersh's spot. Every other current manager has
// been in the league since 2011. Chico's one season is taken to be 2011 because, with only
// those two departures, both had to be founding members of the 12-team league.
const CHICO_ONLY_SEASON = 2011;
// Unconfirmed: the last season before Mina replaced Adam. Until it is set, that spot is
// left unassigned after 2011 rather than guessed.
const ADAM_HERSH_LAST_SEASON = null;

const foundingManagers = [
	{ managerID: MID.c3aquino,     name: 'c3aquino' },
	{ managerID: MID.craigsmooth,  name: 'craigsmooth' },
	{ managerID: MID.BWheels87,    name: 'BWheels87' },
	{ managerID: MID.kazzamm,      name: 'kazzamm' },
	{ managerID: MID.BABSLAB,      name: 'BABSLAB' },
	{ managerID: MID.jsoliz,       name: 'jsoliz' },
	{ managerID: MID.jimmypineda3, name: 'jimmypineda3' },
	{ managerID: MID.RaandySavage, name: 'RaandySavage' },
	{ managerID: MID.Cicco,        name: 'Cicco' },
	{ managerID: MID.armvnd,       name: 'armvnd' },
];

const adamHersh = { managerID: YAHOO_ADAM_HERSH, name: 'Adam Hersh' };
const chico     = { managerID: YAHOO_CHICO,      name: 'Chico' };
const mickey    = { managerID: MID.micksitupp,   name: 'micksitupp' };
const mina      = { managerID: MID.minafarag,    name: 'minafarag' };

const buildRoster = (members) =>
	members.map((m, i) => ({ ...m, rosterID: i + 1 }));

const yahooManagersByYearMap = {};
for (let y = 2011; y <= 2023; y++) {
	const members = [...foundingManagers];
	members.push(y === CHICO_ONLY_SEASON ? chico : mickey);
	if (y === 2011 || (ADAM_HERSH_LAST_SEASON && y <= ADAM_HERSH_LAST_SEASON)) {
		members.push(adamHersh);
	} else if (ADAM_HERSH_LAST_SEASON) {
		members.push(mina);
	}
	yahooManagersByYearMap[y] = buildRoster(members);
}

export const yahooManagersByYear = yahooManagersByYearMap;

// --- Historical seasons ---

const buildSeason = (year) => {
	const settings = getYahooLeagueSettings(year);
	return {
		year,
		platform: 'yahoo',
		numRosters: 12,
		playoffStart: settings.playoff_week_start,
		regularSeasonWeeks: settings.regular_season_weeks,
		leagueSettings: settings,
		scoringSettings: getYahooScoringSettings(year),
		rosterPositions: [...YAHOO_ROSTER],
		leagueName: 'The League',
		status: 'complete',
		champion: null,
	};
};

export const yahooHistoricalSeasons = [];
for (let y = 2011; y <= 2023; y++) {
	yahooHistoricalSeasons.push(buildSeason(y));
}

// --- Season standings (placeholder) ---
// Populate with actual data:
// { managerID, wins, losses, ties, fpts, fptsAgainst, potentialPoints, finish }

export const yahooSeasonStandings = {};
for (let y = 2011; y <= 2023; y++) {
	yahooSeasonStandings[y] = [];
}

// --- Weekly matchup data (placeholder) ---
// Populate with actual weekly scores:
// { roster_id, matchup_id, points, year, week, managerID }

export const yahooMatchups = [];

// --- Helpers for integration with leagueAnalytics ---

export const isYahooManager = (managerID) =>
	managerID === YAHOO_ADAM_HERSH || managerID === YAHOO_CHICO;

export const getYahooManagerLabel = (managerID) => {
	if (managerID === YAHOO_ADAM_HERSH) return 'Adam Hersh';
	if (managerID === YAHOO_CHICO) return 'Chico';
	return null;
};

export const YAHOO_MANAGER_IDS = { YAHOO_ADAM_HERSH, YAHOO_CHICO };
