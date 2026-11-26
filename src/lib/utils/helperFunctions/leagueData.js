import { get } from 'svelte/store';
import {leagueData} from '$lib/stores';
import { leagueID } from '$lib/utils/leagueInfo';
import { getCached, setCached } from './cache';

export const getLeagueData = async (queryLeagueID = leagueID) => {
	if(get(leagueData)[queryLeagueID]) {
		return get(leagueData)[queryLeagueID];
	}
	const cached = getCached(`leagueData_${queryLeagueID}`);
	if(cached) {
		leagueData.update(ld => {ld[queryLeagueID] = cached; return ld});
		return cached;
	}
    const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}`, {compress: true}).catch((err) => { console.error(err); });
	const data = await res.json().catch((err) => { console.error(err); });

	if (res.ok) {
		leagueData.update(ld => {ld[queryLeagueID] = data; return ld});
		setCached(`leagueData_${queryLeagueID}`, data);
		return data;
	} else {
		throw new Error(data);
	}
}