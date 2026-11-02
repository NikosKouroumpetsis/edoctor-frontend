<script lang="ts">
	import { setSearchDock, type SearchDock } from '$shared/state/search-dock';
	import LegalLine from './legal-line.svelte';

	/** Tests only: the legal line inside the page tree's search dock, as the frame gives it to the results. */
	let { dock }: { dock: SearchDock } = $props();
	// svelte-ignore state_referenced_locally
	setSearchDock(dock);
</script>

<LegalLine />
