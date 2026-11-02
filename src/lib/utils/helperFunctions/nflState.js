import { get } from 'svelte/store';
import {nflState} from '$lib/stores';
import { getCached, setCached } from './cache';

export const getNflState = async () => {
	if(get(nflState).season) {
		return get(nflState);
	}
	const cached = getCached('nflState');
	if(cached) {
		nflState.update(() => cached);
		return cached;
	}
    const res = await fetch(`https://api.sleeper.app/v1/state/nfl`, {compress: true}).catch((err) => { console.error(err); });
	const data = await res.json().catch((err) => { console.error(err); });

	if (res.ok) {
		nflState.update(() => data);
		setCached('nflState', data);
		return data;
	} else {
		throw new Error(data);
	}
}