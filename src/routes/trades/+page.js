import { getLeagueTransactions, loadPlayers, getLeagueTeamManagers, getLeagueRosters } from '$lib/utils/helper';

export async function load({ fetch }) {
	const transactionsData = getLeagueTransactions(false);
	const leagueTeamManagersData = getLeagueTeamManagers();
	const playersData = loadPlayers(fetch);
	const rostersData = getLeagueRosters();

	return {
		playersData,
		transactionsData,
		leagueTeamManagersData,
		rostersData,
	};
}
