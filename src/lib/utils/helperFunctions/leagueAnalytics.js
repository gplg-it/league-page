import { getLeagueData } from './leagueData';
import { leagueID } from '$lib/utils/leagueInfo';
import { getNflState } from './nflState';
import { getLeagueRosters } from './leagueRosters';
import { getLeagueTeamManagers } from './leagueTeamManagers';
import { waitForAll } from './multiPromise';
import { get } from 'svelte/store';
import { analyticsStore } from '$lib/stores';
import { round } from './universalFunctions';
import { browser } from '$app/environment';

export const getLeagueAnalytics = async (refresh = false) => {
	if(get(analyticsStore).managerAnalytics) {
		return get(analyticsStore);
	}

	if(!refresh && browser) {
		let localAnalytics = JSON.parse(localStorage.getItem("analytics"));
		if(localAnalytics && localAnalytics.managerAnalytics) {
			localAnalytics.stale = true;
			analyticsStore.update(() => localAnalytics);
			return localAnalytics;
		}
	}

	const nflState = await getNflState().catch((err) => { console.error(err); });
	let week = 0;
	if(nflState.season_type == 'regular') {
		week = nflState.week - 1;
	} else if(nflState.season_type == 'post') {
		week = 18;
	}

	let curSeason = leagueID;
	const allMatchups = [];
	const allSeasons = [];
	const rosterSeasonMap = {};

	while(curSeason && curSeason != 0) {
		const [rosterRes, leagueData] = await waitForAll(
			getLeagueRosters(curSeason),
			getLeagueData(curSeason),
		).catch((err) => { console.error(err); });

		const rosters = rosterRes.rosters;
		const year = parseInt(leagueData.season);

		let seasonWeek = week;
		if(leagueData.status == 'complete' || seasonWeek > leagueData.settings.playoff_week_start - 1) {
			seasonWeek = leagueData.settings.playoff_week_start - 1;
		}

		if(seasonWeek <= 0) {
			curSeason = leagueData.previous_league_id;
			week = 99;
			continue;
		}

		rosterSeasonMap[year] = {};
		for(const rosterID in rosters) {
			const roster = rosters[rosterID];
			rosterSeasonMap[year][rosterID] = {
				wins: roster.settings.wins,
				losses: roster.settings.losses,
				ties: roster.settings.ties,
				fpts: roster.settings.fpts + (roster.settings.fpts_decimal / 100),
				fptsAgainst: roster.settings.fpts_against + (roster.settings.fpts_against_decimal / 100),
				potentialPoints: roster.settings.ppts + (roster.settings.ppts_decimal / 100),
			};
		}

		const matchupsPromises = [];
		for(let w = 1; w <= seasonWeek; w++) {
			matchupsPromises.push(fetch(`https://api.sleeper.app/v1/league/${curSeason}/matchups/${w}`, {compress: true}));
		}

		const matchupsRes = await waitForAll(...matchupsPromises).catch((err) => { console.error(err); });

		const matchupsJsonPromises = [];
		for(const res of matchupsRes) {
			matchupsJsonPromises.push(res.json());
		}
		const matchupsData = await waitForAll(...matchupsJsonPromises).catch((err) => { console.error(err); });

		for(let w = 0; w < matchupsData.length; w++) {
			for(const matchup of matchupsData[w]) {
				allMatchups.push({
					...matchup,
					year,
					week: w + 1,
				});
			}
		}

		allSeasons.push({
			year,
			numRosters: Object.keys(rosters).length,
			playoffStart: leagueData.settings.playoff_week_start,
		});

		curSeason = leagueData.previous_league_id;
		week = 99;
	}

	const managerAnalytics = computeManagerAnalytics(allMatchups, allSeasons, rosterSeasonMap);
	const matchupInsights = computeMatchupInsights(allMatchups, allSeasons);
	const scoringTrends = computeScoringTrends(allMatchups, allSeasons);
	const luckAnalysis = computeLuckAnalysis(allMatchups, allSeasons);

	const analyticsData = {
		managerAnalytics,
		matchupInsights,
		scoringTrends,
		luckAnalysis,
		allSeasons,
	};

	if(browser) {
		localStorage.setItem("analytics", JSON.stringify(analyticsData));
		analyticsStore.update(() => analyticsData);
	}

	return analyticsData;
}

const computeManagerAnalytics = (allMatchups, allSeasons, rosterSeasonMap) => {
	const managerWeeklyScores = {};
	const managerMatchupResults = {};

	for(const matchup of allMatchups) {
		const rosterID = matchup.roster_id;
		const key = rosterID;
		if(!managerWeeklyScores[key]) {
			managerWeeklyScores[key] = [];
			managerMatchupResults[key] = {
				totalGames: 0,
				wins: 0,
				losses: 0,
				ties: 0,
				totalPoints: 0,
				totalPointsAgainst: 0,
				seasons: {},
			};
		}
		managerWeeklyScores[key].push({
			points: matchup.points || 0,
			year: matchup.year,
			week: matchup.week,
		});
	}

	const matchupsByWeekYear = {};
	for(const matchup of allMatchups) {
		const key = `${matchup.year}-${matchup.week}`;
		if(!matchupsByWeekYear[key]) {
			matchupsByWeekYear[key] = {};
		}
		if(!matchupsByWeekYear[key][matchup.matchup_id]) {
			matchupsByWeekYear[key][matchup.matchup_id] = [];
		}
		matchupsByWeekYear[key][matchup.matchup_id].push(matchup);
	}

	for(const weekKey in matchupsByWeekYear) {
		for(const matchupID in matchupsByWeekYear[weekKey]) {
			const sides = matchupsByWeekYear[weekKey][matchupID];
			if(sides.length !== 2) continue;

			const [a, b] = sides;
			const aPoints = a.points || 0;
			const bPoints = b.points || 0;

			recordResult(managerMatchupResults, a.roster_id, aPoints, bPoints, a.year);
			recordResult(managerMatchupResults, b.roster_id, bPoints, aPoints, b.year);
		}
	}

	const analytics = {};

	for(const rosterID in managerWeeklyScores) {
		const scores = managerWeeklyScores[rosterID].map(s => s.points).filter(p => p > 0);
		if(scores.length === 0) continue;

		const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
		const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
		const stdDev = Math.sqrt(variance);
		const consistency = round(100 - (stdDev / mean * 100));

		const results = managerMatchupResults[rosterID] || {};
		const totalGames = results.totalGames || 1;

		const seasonData = rosterSeasonMap;
		let totalPotential = 0;
		let totalActual = 0;
		for(const year in seasonData) {
			if(seasonData[year][rosterID]) {
				totalPotential += seasonData[year][rosterID].potentialPoints || 0;
				totalActual += seasonData[year][rosterID].fpts || 0;
			}
		}

		const efficiency = totalPotential > 0 ? round((totalActual / totalPotential) * 100) : 0;

		const bestWeek = Math.max(...scores);
		const worstWeek = Math.min(...scores);

		const byYear = {};
		for(const entry of managerWeeklyScores[rosterID]) {
			if(!byYear[entry.year]) byYear[entry.year] = [];
			byYear[entry.year].push(entry.points);
		}

		const seasonBreakdowns = {};
		for(const year in byYear) {
			const ys = byYear[year].filter(p => p > 0);
			if(ys.length === 0) continue;
			const ym = ys.reduce((a, b) => a + b, 0) / ys.length;
			const yv = ys.reduce((sum, s) => sum + Math.pow(s - ym, 2), 0) / ys.length;
			seasonBreakdowns[year] = {
				avgPoints: round(ym),
				stdDev: round(Math.sqrt(yv)),
				bestWeek: round(Math.max(...ys)),
				worstWeek: round(Math.min(...ys)),
				totalPoints: round(ys.reduce((a, b) => a + b, 0)),
				gamesPlayed: ys.length,
			};
		}

		analytics[rosterID] = {
			rosterID,
			avgPoints: round(mean),
			stdDev: round(stdDev),
			consistency,
			efficiency,
			bestWeek: round(bestWeek),
			worstWeek: round(worstWeek),
			totalPoints: round(scores.reduce((a, b) => a + b, 0)),
			gamesPlayed: scores.length,
			wins: results.wins || 0,
			losses: results.losses || 0,
			ties: results.ties || 0,
			winRate: round((results.wins || 0) / totalGames * 100),
			avgMargin: round((results.totalPoints - results.totalPointsAgainst) / totalGames),
			seasonBreakdowns,
		};
	}

	return analytics;
}

const recordResult = (results, rosterID, pts, opponentPts, year) => {
	if(!results[rosterID]) {
		results[rosterID] = {
			totalGames: 0, wins: 0, losses: 0, ties: 0,
			totalPoints: 0, totalPointsAgainst: 0, seasons: {},
		};
	}
	results[rosterID].totalGames++;
	results[rosterID].totalPoints += pts;
	results[rosterID].totalPointsAgainst += opponentPts;

	if(pts > opponentPts) results[rosterID].wins++;
	else if(pts < opponentPts) results[rosterID].losses++;
	else results[rosterID].ties++;

	if(!results[rosterID].seasons[year]) {
		results[rosterID].seasons[year] = { wins: 0, losses: 0, ties: 0 };
	}
	if(pts > opponentPts) results[rosterID].seasons[year].wins++;
	else if(pts < opponentPts) results[rosterID].seasons[year].losses++;
	else results[rosterID].seasons[year].ties++;
}

const computeMatchupInsights = (allMatchups, allSeasons) => {
	const weeklyMedians = {};

	for(const matchup of allMatchups) {
		const key = `${matchup.year}-${matchup.week}`;
		if(!weeklyMedians[key]) {
			weeklyMedians[key] = { scores: [], year: matchup.year, week: matchup.week };
		}
		if(matchup.points > 0) {
			weeklyMedians[key].scores.push(matchup.points);
		}
	}

	for(const key in weeklyMedians) {
		const sorted = weeklyMedians[key].scores.sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		weeklyMedians[key].median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
		weeklyMedians[key].average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
	}

	const allPlayRecords = {};

	for(const weekKey in weeklyMedians) {
		const weekScores = weeklyMedians[weekKey].scores;

		for(const matchup of allMatchups) {
			const mKey = `${matchup.year}-${matchup.week}`;
			if(mKey !== weekKey) continue;
			if(!matchup.points || matchup.points <= 0) continue;

			const rosterID = matchup.roster_id;
			if(!allPlayRecords[rosterID]) {
				allPlayRecords[rosterID] = { wins: 0, losses: 0, ties: 0, totalGames: 0 };
			}

			for(const score of weekScores) {
				if(score === matchup.points) continue;
				allPlayRecords[rosterID].totalGames++;
				if(matchup.points > score) allPlayRecords[rosterID].wins++;
				else if(matchup.points < score) allPlayRecords[rosterID].losses++;
				else allPlayRecords[rosterID].ties++;
			}
		}
	}

	for(const rosterID in allPlayRecords) {
		const record = allPlayRecords[rosterID];
		record.winPct = record.totalGames > 0 ? round(record.wins / record.totalGames * 100) : 0;
	}

	return {
		weeklyMedians,
		allPlayRecords,
	};
}

const computeScoringTrends = (allMatchups, allSeasons) => {
	const trendsByYear = {};

	for(const matchup of allMatchups) {
		if(!matchup.points || matchup.points <= 0) continue;
		const key = matchup.year;
		if(!trendsByYear[key]) {
			trendsByYear[key] = {};
		}
		if(!trendsByYear[key][matchup.week]) {
			trendsByYear[key][matchup.week] = { scores: [], week: matchup.week };
		}
		trendsByYear[key][matchup.week].scores.push({
			rosterID: matchup.roster_id,
			points: matchup.points,
		});
	}

	const leagueAverageByWeek = {};
	for(const year in trendsByYear) {
		leagueAverageByWeek[year] = [];
		const weeks = Object.keys(trendsByYear[year]).sort((a, b) => a - b);
		for(const week of weeks) {
			const weekData = trendsByYear[year][week];
			const avg = weekData.scores.reduce((sum, s) => sum + s.points, 0) / weekData.scores.length;
			const high = Math.max(...weekData.scores.map(s => s.points));
			const low = Math.min(...weekData.scores.map(s => s.points));
			leagueAverageByWeek[year].push({
				week: parseInt(week),
				avg: round(avg),
				high: round(high),
				low: round(low),
				spread: round(high - low),
			});
		}
	}

	const rosterTrends = {};
	for(const matchup of allMatchups) {
		if(!matchup.points || matchup.points <= 0) continue;
		if(!rosterTrends[matchup.roster_id]) {
			rosterTrends[matchup.roster_id] = {};
		}
		if(!rosterTrends[matchup.roster_id][matchup.year]) {
			rosterTrends[matchup.roster_id][matchup.year] = [];
		}
		rosterTrends[matchup.roster_id][matchup.year].push({
			week: matchup.week,
			points: matchup.points,
		});
	}

	for(const rosterID in rosterTrends) {
		for(const year in rosterTrends[rosterID]) {
			rosterTrends[rosterID][year].sort((a, b) => a.week - b.week);
		}
	}

	return {
		leagueAverageByWeek,
		rosterTrends,
	};
}

const computeLuckAnalysis = (allMatchups, allSeasons) => {
	const matchupsByWeekYear = {};
	for(const matchup of allMatchups) {
		const key = `${matchup.year}-${matchup.week}`;
		if(!matchupsByWeekYear[key]) matchupsByWeekYear[key] = {};
		if(!matchupsByWeekYear[key][matchup.matchup_id]) matchupsByWeekYear[key][matchup.matchup_id] = [];
		matchupsByWeekYear[key][matchup.matchup_id].push(matchup);
	}

	const luckByRoster = {};

	for(const weekKey in matchupsByWeekYear) {
		const allScoresThisWeek = [];
		for(const mid in matchupsByWeekYear[weekKey]) {
			for(const m of matchupsByWeekYear[weekKey][mid]) {
				if(m.points > 0) allScoresThisWeek.push(m.points);
			}
		}
		allScoresThisWeek.sort((a, b) => a - b);
		const mid = Math.floor(allScoresThisWeek.length / 2);
		const median = allScoresThisWeek.length % 2
			? allScoresThisWeek[mid]
			: (allScoresThisWeek[mid - 1] + allScoresThisWeek[mid]) / 2;

		for(const matchupID in matchupsByWeekYear[weekKey]) {
			const sides = matchupsByWeekYear[weekKey][matchupID];
			if(sides.length !== 2) continue;
			const [a, b] = sides;

			analyzeLuck(luckByRoster, a, b, median);
			analyzeLuck(luckByRoster, b, a, median);
		}
	}

	for(const rosterID in luckByRoster) {
		const luck = luckByRoster[rosterID];
		luck.luckIndex = round(
			(luck.luckyWins - luck.unluckyLosses) / Math.max(luck.totalGames, 1) * 100
		);
		luck.expectedWins = luck.aboveMedianWeeks;
		luck.expectedLosses = luck.belowMedianWeeks;
		luck.winDifferential = luck.actualWins - luck.expectedWins;
	}

	return luckByRoster;
}

const analyzeLuck = (luckByRoster, team, opponent, median) => {
	const rosterID = team.roster_id;
	const pts = team.points || 0;
	const oppPts = opponent.points || 0;

	if(pts <= 0) return;

	if(!luckByRoster[rosterID]) {
		luckByRoster[rosterID] = {
			luckyWins: 0,
			unluckyLosses: 0,
			aboveMedianWeeks: 0,
			belowMedianWeeks: 0,
			actualWins: 0,
			actualLosses: 0,
			totalGames: 0,
			luckIndex: 0,
		};
	}

	luckByRoster[rosterID].totalGames++;

	const won = pts > oppPts;
	const aboveMedian = pts >= median;

	if(aboveMedian) luckByRoster[rosterID].aboveMedianWeeks++;
	else luckByRoster[rosterID].belowMedianWeeks++;

	if(won) {
		luckByRoster[rosterID].actualWins++;
		if(!aboveMedian) luckByRoster[rosterID].luckyWins++;
	} else {
		luckByRoster[rosterID].actualLosses++;
		if(aboveMedian) luckByRoster[rosterID].unluckyLosses++;
	}
}
