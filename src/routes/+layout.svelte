<!-- __layout.svelte -->
<script>
	import { Nav, Footer } from "$lib/components"

	let { children } = $props();
</script>

<main>
    <Nav />

    {@render children()}

    <Footer />
</main>