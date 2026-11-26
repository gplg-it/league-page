import { getLeagueData } from './leagueData';
import { leagueID, formerYahooManagers } from '$lib/utils/leagueInfo';
import { getNflState } from './nflState';
import { getLeagueRosters } from './leagueRosters';
import { getLeagueTeamManagers } from './leagueTeamManagers';
import { waitForAll } from './multiPromise';
import { get } from 'svelte/store';
import { analyticsStore } from '$lib/stores';
import { round } from './universalFunctions';
import { getCached, setCached } from './cache';

export const getLeagueAnalytics = async (refresh = false) => {
	if(get(analyticsStore).managerAnalytics) {
		return get(analyticsStore);
	}

	if(!refresh) {
		const cached = getCached('analytics');
		if(cached && cached.managerAnalytics) {
			analyticsStore.update(() => cached);
			return cached;
		}
	}

	const [nflState, teamManagers] = await waitForAll(
		getNflState(),
		getLeagueTeamManagers(),
	).catch((err) => { console.error(err); });

	let week = 0;
	if(nflState.season_type == 'regular') {
		week = nflState.week - 1;
	} else if(nflState.season_type == 'post') {
		week = 18;
	}

	const resolveManagerID = (year, rosterID) => {
		const yearMap = teamManagers.teamManagersMap[year];
		if(yearMap && yearMap[rosterID] && yearMap[rosterID].managers && yearMap[rosterID].managers.length > 0) {
			return yearMap[rosterID].managers[0];
		}
		return `unknown_${rosterID}_${year}`;
	};

	const formerManagerIDs = [];
	if(formerYahooManagers && formerYahooManagers.length > 0) {
		for(const former of formerYahooManagers) {
			for(const userID in teamManagers.users) {
				const user = teamManagers.users[userID];
				const displayName = (user.display_name || '').toLowerCase();
				const userName = (user.user_name || '').toLowerCase();
				for(const pattern of former.patterns) {
					if(displayName.includes(pattern) || userName.includes(pattern)) {
						if(formerManagerIDs.indexOf(userID) === -1) {
							formerManagerIDs.push(userID);
						}
						break;
					}
				}
			}
		}
	}

	let curSeason = leagueID;
	const allMatchups = [];
	const allSeasons = [];
	const managerSeasonMap = {};

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

		managerSeasonMap[year] = {};
		for(const rosterID in rosters) {
			const roster = rosters[rosterID];
			const mID = resolveManagerID(year, rosterID);
			managerSeasonMap[year][mID] = {
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
					managerID: resolveManagerID(year, matchup.roster_id),
				});
			}
		}

		allSeasons.push({
			year,
			numRosters: Object.keys(rosters).length,
			playoffStart: leagueData.settings.playoff_week_start,
			leagueSettings: leagueData.settings || {},
			scoringSettings: leagueData.scoring_settings || {},
			rosterPositions: leagueData.roster_positions || [],
			leagueName: leagueData.name || '',
			status: leagueData.status || '',
		});

		curSeason = leagueData.previous_league_id;
		week = 99;
	}

	const managerAnalytics = computeManagerAnalytics(allMatchups, allSeasons, managerSeasonMap);
	const matchupInsights = computeMatchupInsights(allMatchups, allSeasons);
	const scoringTrends = computeScoringTrends(allMatchups, allSeasons);
	const luckAnalysis = computeLuckAnalysis(allMatchups, allSeasons);
	const headToHead = computeHeadToHead(allMatchups, allSeasons);
	const streaksAndMilestones = computeStreaksAndMilestones(allMatchups, allSeasons, managerSeasonMap);
	const powerIndex = computePowerIndex(managerAnalytics, luckAnalysis, matchupInsights, managerSeasonMap);
	const closeGames = computeCloseGames(allMatchups, allSeasons);

	const analyticsData = {
		managerAnalytics,
		matchupInsights,
		scoringTrends,
		luckAnalysis,
		headToHead,
		streaksAndMilestones,
		powerIndex,
		closeGames,
		allSeasons,
		formerManagerIDs,
	};

	setCached('analytics', analyticsData);
	analyticsStore.update(() => analyticsData);

	return analyticsData;
}

const computeManagerAnalytics = (allMatchups, allSeasons, managerSeasonMap) => {
	const managerWeeklyScores = {};
	const managerMatchupResults = {};

	for(const matchup of allMatchups) {
		const key = matchup.managerID;
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

			recordResult(managerMatchupResults, a.managerID, aPoints, bPoints, a.year);
			recordResult(managerMatchupResults, b.managerID, bPoints, aPoints, b.year);
		}
	}

	const analytics = {};

	for(const managerID in managerWeeklyScores) {
		const scores = managerWeeklyScores[managerID].map(s => s.points).filter(p => p > 0);
		if(scores.length === 0) continue;

		const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
		const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
		const stdDev = Math.sqrt(variance);
		const consistency = round(100 - (stdDev / mean * 100));

		const results = managerMatchupResults[managerID] || {};
		const totalGames = results.totalGames || 1;

		let totalPotential = 0;
		let totalActual = 0;
		for(const year in managerSeasonMap) {
			if(managerSeasonMap[year][managerID]) {
				totalPotential += managerSeasonMap[year][managerID].potentialPoints || 0;
				totalActual += managerSeasonMap[year][managerID].fpts || 0;
			}
		}

		const efficiency = totalPotential > 0 ? round((totalActual / totalPotential) * 100) : 0;

		const bestWeek = Math.max(...scores);
		const worstWeek = Math.min(...scores);

		const byYear = {};
		for(const entry of managerWeeklyScores[managerID]) {
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

		analytics[managerID] = {
			managerID,
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

const recordResult = (results, managerID, pts, opponentPts, year) => {
	if(!results[managerID]) {
		results[managerID] = {
			totalGames: 0, wins: 0, losses: 0, ties: 0,
			totalPoints: 0, totalPointsAgainst: 0, seasons: {},
		};
	}
	results[managerID].totalGames++;
	results[managerID].totalPoints += pts;
	results[managerID].totalPointsAgainst += opponentPts;

	if(pts > opponentPts) results[managerID].wins++;
	else if(pts < opponentPts) results[managerID].losses++;
	else results[managerID].ties++;

	if(!results[managerID].seasons[year]) {
		results[managerID].seasons[year] = { wins: 0, losses: 0, ties: 0 };
	}
	if(pts > opponentPts) results[managerID].seasons[year].wins++;
	else if(pts < opponentPts) results[managerID].seasons[year].losses++;
	else results[managerID].seasons[year].ties++;
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

			const mID = matchup.managerID;
			if(!allPlayRecords[mID]) {
				allPlayRecords[mID] = { wins: 0, losses: 0, ties: 0, totalGames: 0 };
			}

			for(const score of weekScores) {
				if(score === matchup.points) continue;
				allPlayRecords[mID].totalGames++;
				if(matchup.points > score) allPlayRecords[mID].wins++;
				else if(matchup.points < score) allPlayRecords[mID].losses++;
				else allPlayRecords[mID].ties++;
			}
		}
	}

	for(const mID in allPlayRecords) {
		const record = allPlayRecords[mID];
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
			managerID: matchup.managerID,
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

	const managerTrends = {};
	for(const matchup of allMatchups) {
		if(!matchup.points || matchup.points <= 0) continue;
		const mID = matchup.managerID;
		if(!managerTrends[mID]) {
			managerTrends[mID] = {};
		}
		if(!managerTrends[mID][matchup.year]) {
			managerTrends[mID][matchup.year] = [];
		}
		managerTrends[mID][matchup.year].push({
			week: matchup.week,
			points: matchup.points,
		});
	}

	for(const mID in managerTrends) {
		for(const year in managerTrends[mID]) {
			managerTrends[mID][year].sort((a, b) => a.week - b.week);
		}
	}

	return {
		leagueAverageByWeek,
		rosterTrends: managerTrends,
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

	const luckByManager = {};

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

			analyzeLuck(luckByManager, a, b, median);
			analyzeLuck(luckByManager, b, a, median);
		}
	}

	for(const mID in luckByManager) {
		const luck = luckByManager[mID];
		luck.luckIndex = round(
			(luck.luckyWins - luck.unluckyLosses) / Math.max(luck.totalGames, 1) * 100
		);
		luck.expectedWins = luck.aboveMedianWeeks;
		luck.expectedLosses = luck.belowMedianWeeks;
		luck.winDifferential = luck.actualWins - luck.expectedWins;
	}

	return luckByManager;
}

const analyzeLuck = (luckByManager, team, opponent, median) => {
	const mID = team.managerID;
	const pts = team.points || 0;
	const oppPts = opponent.points || 0;

	if(pts <= 0) return;

	if(!luckByManager[mID]) {
		luckByManager[mID] = {
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

	luckByManager[mID].totalGames++;

	const won = pts > oppPts;
	const aboveMedian = pts >= median;

	if(aboveMedian) luckByManager[mID].aboveMedianWeeks++;
	else luckByManager[mID].belowMedianWeeks++;

	if(won) {
		luckByManager[mID].actualWins++;
		if(!aboveMedian) luckByManager[mID].luckyWins++;
	} else {
		luckByManager[mID].actualLosses++;
		if(aboveMedian) luckByManager[mID].unluckyLosses++;
	}
}

const computeHeadToHead = (allMatchups, allSeasons) => {
	const matchupsByWeekYear = {};
	for(const matchup of allMatchups) {
		const key = `${matchup.year}-${matchup.week}`;
		if(!matchupsByWeekYear[key]) matchupsByWeekYear[key] = {};
		if(!matchupsByWeekYear[key][matchup.matchup_id]) matchupsByWeekYear[key][matchup.matchup_id] = [];
		matchupsByWeekYear[key][matchup.matchup_id].push(matchup);
	}

	const h2h = {};

	for(const weekKey in matchupsByWeekYear) {
		for(const matchupID in matchupsByWeekYear[weekKey]) {
			const sides = matchupsByWeekYear[weekKey][matchupID];
			if(sides.length !== 2) continue;
			const [a, b] = sides;
			const aPts = a.points || 0;
			const bPts = b.points || 0;
			if(aPts <= 0 && bPts <= 0) continue;
			const year = a.year;

			recordH2H(h2h, a.managerID, b.managerID, aPts, bPts, year);
			recordH2H(h2h, b.managerID, a.managerID, bPts, aPts, year);
		}
	}

	return h2h;
}

const recordH2H = (h2h, managerA, managerB, ptsFor, ptsAgainst, year) => {
	if(!h2h[managerA]) h2h[managerA] = {};
	if(!h2h[managerA][managerB]) {
		h2h[managerA][managerB] = {
			allTime: { wins: 0, losses: 0, ties: 0, totalPtsFor: 0, totalPtsAgainst: 0 },
			bySeason: {},
		};
	}
	const record = h2h[managerA][managerB];

	const update = (target) => {
		target.totalPtsFor += ptsFor;
		target.totalPtsAgainst += ptsAgainst;
		if(ptsFor > ptsAgainst) target.wins++;
		else if(ptsFor < ptsAgainst) target.losses++;
		else target.ties++;
	};

	update(record.allTime);
	if(!record.bySeason[year]) {
		record.bySeason[year] = { wins: 0, losses: 0, ties: 0, totalPtsFor: 0, totalPtsAgainst: 0 };
	}
	update(record.bySeason[year]);
}

const computeStreaksAndMilestones = (allMatchups, allSeasons, managerSeasonMap) => {
	const matchupsByWeekYear = {};
	for(const matchup of allMatchups) {
		const key = `${matchup.year}-${matchup.week}`;
		if(!matchupsByWeekYear[key]) matchupsByWeekYear[key] = {};
		if(!matchupsByWeekYear[key][matchup.matchup_id]) matchupsByWeekYear[key][matchup.matchup_id] = [];
		matchupsByWeekYear[key][matchup.matchup_id].push(matchup);
	}

	const sortedWeeks = Object.keys(matchupsByWeekYear).sort((a, b) => {
		const [yA, wA] = a.split('-').map(Number);
		const [yB, wB] = b.split('-').map(Number);
		return yA !== yB ? yA - yB : wA - wB;
	});

	const currentStreaks = {};
	const bestWinStreaks = {};
	const bestLossStreaks = {};
	const highScores = [];
	const blowouts = [];
	const nailbiters = [];

	for(const weekKey of sortedWeeks) {
		for(const matchupID in matchupsByWeekYear[weekKey]) {
			const sides = matchupsByWeekYear[weekKey][matchupID];
			if(sides.length !== 2) continue;
			const [a, b] = sides;
			const aPts = a.points || 0;
			const bPts = b.points || 0;
			if(aPts <= 0 && bPts <= 0) continue;

			const margin = Math.abs(aPts - bPts);
			const winner = aPts > bPts ? a : (bPts > aPts ? b : null);
			const loser = aPts > bPts ? b : (bPts > aPts ? a : null);

			if(aPts > 0) {
				highScores.push({ managerID: a.managerID, points: round(aPts), year: a.year, week: a.week });
			}
			if(bPts > 0) {
				highScores.push({ managerID: b.managerID, points: round(bPts), year: b.year, week: b.week });
			}

			if(winner && loser) {
				blowouts.push({
					winnerID: winner.managerID, loserID: loser.managerID,
					winnerPts: round(winner.points), loserPts: round(loser.points),
					margin: round(margin), year: winner.year, week: winner.week,
				});
				nailbiters.push({
					winnerID: winner.managerID, loserID: loser.managerID,
					winnerPts: round(winner.points), loserPts: round(loser.points),
					margin: round(margin), year: winner.year, week: winner.week,
				});
			}

			for(const side of [a, b]) {
				const mID = side.managerID;
				const pts = side.points || 0;
				const oppPts = side === a ? bPts : aPts;
				if(pts <= 0) continue;

				if(!currentStreaks[mID]) currentStreaks[mID] = { type: null, count: 0 };
				if(!bestWinStreaks[mID]) bestWinStreaks[mID] = 0;
				if(!bestLossStreaks[mID]) bestLossStreaks[mID] = 0;

				const won = pts > oppPts;
				const lost = pts < oppPts;

				if(won) {
					if(currentStreaks[mID].type === 'W') {
						currentStreaks[mID].count++;
					} else {
						currentStreaks[mID] = { type: 'W', count: 1 };
					}
					bestWinStreaks[mID] = Math.max(bestWinStreaks[mID], currentStreaks[mID].count);
				} else if(lost) {
					if(currentStreaks[mID].type === 'L') {
						currentStreaks[mID].count++;
					} else {
						currentStreaks[mID] = { type: 'L', count: 1 };
					}
					bestLossStreaks[mID] = Math.max(bestLossStreaks[mID], currentStreaks[mID].count);
				} else {
					currentStreaks[mID] = { type: null, count: 0 };
				}
			}
		}
	}

	highScores.sort((a, b) => b.points - a.points);
	blowouts.sort((a, b) => b.margin - a.margin);
	nailbiters.sort((a, b) => a.margin - b.margin);

	const milestones = {};
	for(const mID in bestWinStreaks) {
		milestones[mID] = {
			bestWinStreak: bestWinStreaks[mID],
			bestLossStreak: bestLossStreaks[mID] || 0,
			currentStreak: currentStreaks[mID] || { type: null, count: 0 },
		};
	}

	return {
		milestones,
		highScores: highScores.slice(0, 25),
		blowouts: blowouts.slice(0, 15),
		nailbiters: nailbiters.slice(0, 15),
	};
}

const computePowerIndex = (managerAnalytics, luckAnalysis, matchupInsights, managerSeasonMap) => {
	const powerIndex = {};
	const allPlayRecords = matchupInsights?.allPlayRecords || {};

	for(const managerID in managerAnalytics) {
		const mgr = managerAnalytics[managerID];
		const luck = luckAnalysis[managerID] || {};
		const allPlay = allPlayRecords[managerID] || {};

		const winPct = mgr.gamesPlayed > 0 ? mgr.wins / mgr.gamesPlayed : 0;
		const allPlayPct = (allPlay.winPct || 0) / 100;
		const consistencyScore = (mgr.consistency || 0) / 100;
		const efficiencyScore = (mgr.efficiency || 0) / 100;

		const dominance = round(
			(winPct * 35) +
			(allPlayPct * 30) +
			(consistencyScore * 20) +
			(efficiencyScore * 15)
		);

		powerIndex[managerID] = {
			managerID,
			dominance,
			winPct: round(winPct * 100),
			allPlayPct: round(allPlayPct * 100),
			consistency: mgr.consistency,
			efficiency: mgr.efficiency,
			avgPoints: mgr.avgPoints,
			totalPoints: mgr.totalPoints,
			gamesPlayed: mgr.gamesPlayed,
		};
	}

	return powerIndex;
}

const computeCloseGames = (allMatchups, allSeasons) => {
	const matchupsByWeekYear = {};
	for(const matchup of allMatchups) {
		const key = `${matchup.year}-${matchup.week}`;
		if(!matchupsByWeekYear[key]) matchupsByWeekYear[key] = {};
		if(!matchupsByWeekYear[key][matchup.matchup_id]) matchupsByWeekYear[key][matchup.matchup_id] = [];
		matchupsByWeekYear[key][matchup.matchup_id].push(matchup);
	}

	const managerCloseGames = {};

	for(const weekKey in matchupsByWeekYear) {
		for(const matchupID in matchupsByWeekYear[weekKey]) {
			const sides = matchupsByWeekYear[weekKey][matchupID];
			if(sides.length !== 2) continue;
			const [a, b] = sides;
			const aPts = a.points || 0;
			const bPts = b.points || 0;
			if(aPts <= 0 && bPts <= 0) continue;

			const margin = Math.abs(aPts - bPts);
			const isClose = margin <= 5;
			const isBlowout = margin >= 40;

			for(const side of [a, b]) {
				const mID = side.managerID;
				if(!managerCloseGames[mID]) {
					managerCloseGames[mID] = { closeWins: 0, closeLosses: 0, blowoutWins: 0, blowoutLosses: 0, totalGames: 0 };
				}
				managerCloseGames[mID].totalGames++;
				const pts = side === a ? aPts : bPts;
				const oppPts = side === a ? bPts : aPts;
				if(isClose) {
					if(pts > oppPts) managerCloseGames[mID].closeWins++;
					else if(pts < oppPts) managerCloseGames[mID].closeLosses++;
				}
				if(isBlowout) {
					if(pts > oppPts) managerCloseGames[mID].blowoutWins++;
					else if(pts < oppPts) managerCloseGames[mID].blowoutLosses++;
				}
			}
		}
	}

	return managerCloseGames;
}
