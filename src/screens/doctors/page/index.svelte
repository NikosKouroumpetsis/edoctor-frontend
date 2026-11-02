<script lang="ts">
	import SearchResults from '$modules/search-doctors/ui/search-results';
	import { LegalLine } from '$modules/shell/ui/site-frame';
	import type { DoctorsScreenProps } from '../types';

	let { data }: DoctorsScreenProps = $props();
</script>

<!-- The results (U-24 ⇒ U-26, §7 of the wave record): the search's list and map; the page ends with the frame's thin
     legal line instead of the footer (§7.2). -->
<main data-slot="doctors" class="bg-card">
	<SearchResults {data}>
		{#snippet legal()}
			<LegalLine />
		{/snippet}
	</SearchResults>
</main>
