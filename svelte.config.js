import adapter from '@sveltejs/adapter-static';
import node from '@sveltejs/adapter-node';

const dockerBuild = process.env.DOCKER_BUILD;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: dockerBuild ? node() : adapter({
			fallback: '200.html',
		}),
	}
};

export default config;
