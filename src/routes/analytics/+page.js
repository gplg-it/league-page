import { getLeagueAnalytics, getLeagueTeamManagers, waitForAll } from '$lib/utils/helper';

export async function load() {
    const analyticsInfo = waitForAll(
        getLeagueAnalytics(false),
        getLeagueTeamManagers(),
    )

    return {
        analyticsInfo
    };
}
