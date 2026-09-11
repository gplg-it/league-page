<!-- __layout.svelte -->
<script>
	import { Nav, Footer } from "$lib/components"
</script>

<main>
    <Nav />

    <slot />

    <Footer />
</main>
